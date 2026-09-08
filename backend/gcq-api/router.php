<?php
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/line.php';
require __DIR__ . '/lib/stripe.php';

gcq_cors();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (!empty($_SERVER['GCQ_FORCE_PATH'])) {
    $path = (string) $_SERVER['GCQ_FORCE_PATH'];
} else {
    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    $path = parse_url($uri, PHP_URL_PATH) ?: '/';
    $path = preg_replace('#^/gcq-api#', '', $path) ?: '/';
    $path = rtrim($path, '/') ?: '/';
}

if ($method === 'GET' && ($path === '/' || $path === '/health')) {
    gcq_json(200, ['ok' => true, 'service' => 'gcq-api', 'host' => 'costuba']);
}

if ($method === 'POST' && $path === '/api/webhook') {
    $raw = file_get_contents('php://input') ?: '';
    try {
        $cfg = gcq_config();
        $whsec = (string) ($cfg['stripe_webhook_secret'] ?? '');
        $sk = (string) ($cfg['stripe_secret_key'] ?? '');
        if ($whsec === '' || $sk === '') {
            http_response_code(503);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Stripe 未設定';
            exit;
        }
        gcq_verify_stripe_webhook($raw, $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? null, $whsec);
        $event = json_decode($raw, true) ?: [];
        if (($event['type'] ?? '') === 'checkout.session.completed') {
            $session = $event['data']['object'] ?? [];
            $userId = $session['client_reference_id']
                ?? ($session['metadata']['userId'] ?? null);
            if ($userId) {
                gcq_upsert_premium(
                    (string) $userId,
                    true,
                    isset($session['id']) ? (string) $session['id'] : null
                );
            }
        }
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['received' => true]);
        exit;
    } catch (Throwable $e) {
        http_response_code(400);
        header('Content-Type: text/plain; charset=utf-8');
        echo $e->getMessage();
        exit;
    }
}

if ($method === 'POST' && $path === '/api/me') {
    try {
        $body = gcq_read_json();
        $id = gcq_resolve_user_id($body);
        $row = gcq_ensure_user($id['userId']);
        gcq_json(200, [
            'userId' => $id['userId'],
            'via' => $id['via'],
            'premium' => (bool) ((int) ($row['premium'] ?? 0)),
            'updatedAt' => $row['updated_at'] ?? null,
        ]);
    } catch (Throwable $e) {
        gcq_json(401, ['error' => $e->getMessage()]);
    }
}

if ($method === 'POST' && $path === '/api/checkout') {
    try {
        $body = gcq_read_json();
        $id = gcq_resolve_user_id($body);
        gcq_ensure_user($id['userId']);
        $session = gcq_create_checkout_session($id['userId']);
        if (empty($session['url'])) {
            throw new RuntimeException('Checkout URL が取得できませんでした');
        }
        gcq_json(200, [
            'url' => $session['url'],
            'sessionId' => $session['id'] ?? null,
        ]);
    } catch (Throwable $e) {
        gcq_json(400, ['error' => $e->getMessage()]);
    }
}

if ($method === 'POST' && $path === '/api/dev-unlock') {
    try {
        $cfg = gcq_config();
        $secret = (string) ($cfg['dev_unlock_secret'] ?? '');
        if ($secret === '') {
            gcq_json(404, ['error' => 'not found']);
        }
        $body = gcq_read_json();
        if (($body['secret'] ?? '') !== $secret) {
            gcq_json(403, ['error' => 'forbidden']);
        }
        $id = gcq_resolve_user_id($body);
        gcq_upsert_premium($id['userId'], true, 'dev-unlock');
        gcq_json(200, ['userId' => $id['userId'], 'premium' => true]);
    } catch (Throwable $e) {
        gcq_json(400, ['error' => $e->getMessage()]);
    }
}

gcq_json(404, ['error' => 'not found', 'path' => $path]);
