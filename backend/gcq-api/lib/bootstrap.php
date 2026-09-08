<?php
declare(strict_types=1);

function gcq_config(): array
{
    static $cfg = null;
    if ($cfg !== null) {
        return $cfg;
    }
    $path = dirname(__DIR__) . '/config.php';
    if (!is_file($path)) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'config.php がありません。config.example.php をコピーしてください。'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $cfg = require $path;
    return $cfg;
}

function gcq_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $db = gcq_config()['db'];
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $db['host'],
        $db['name'],
        $db['charset'] ?? 'utf8mb4'
    );
    $pdo = new PDO($dsn, $db['user'], $db['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

function gcq_json(int $status, array $body): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

function gcq_cors(): void
{
    $cfg = gcq_config();
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = $cfg['frontend_origins'] ?? [];
    $ok = false;
    if ($origin !== '') {
        if (preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)) {
            $ok = true;
        }
        foreach ($allowed as $a) {
        if ($origin === $a || strpos($origin, rtrim($a, '/')) === 0) {
            $ok = true;
            break;
        }
        }
    }
    if ($ok) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
}

function gcq_read_json(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function gcq_get_user(string $userId): ?array
{
    $stmt = gcq_pdo()->prepare('SELECT user_id, premium, updated_at FROM gcq_users WHERE user_id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function gcq_ensure_user(string $userId): array
{
    $row = gcq_get_user($userId);
    if ($row) {
        return $row;
    }
    $now = gmdate('Y-m-d H:i:s');
    $stmt = gcq_pdo()->prepare(
        'INSERT IGNORE INTO gcq_users (user_id, premium, updated_at) VALUES (?, 0, ?)'
    );
    $stmt->execute([$userId, $now]);
    return gcq_get_user($userId) ?? [
        'user_id' => $userId,
        'premium' => 0,
        'updated_at' => $now,
    ];
}

function gcq_upsert_premium(string $userId, bool $premium, ?string $sessionId = null): void
{
    $now = gmdate('Y-m-d H:i:s');
    $stmt = gcq_pdo()->prepare(
        'INSERT INTO gcq_users (user_id, premium, stripe_session_id, updated_at)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           premium = VALUES(premium),
           stripe_session_id = COALESCE(VALUES(stripe_session_id), stripe_session_id),
           updated_at = VALUES(updated_at)'
    );
    $stmt->execute([$userId, $premium ? 1 : 0, $sessionId, $now]);
}
