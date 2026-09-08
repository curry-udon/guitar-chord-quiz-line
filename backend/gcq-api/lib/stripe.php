<?php
declare(strict_types=1);

function gcq_stripe_form(string $secretKey, string $path, array $params): array
{
    $ch = curl_init('https://api.stripe.com/v1/' . ltrim($path, '/'));
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERPWD => $secretKey . ':',
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_POSTFIELDS => http_build_query($params),
        CURLOPT_TIMEOUT => 30,
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($raw === false) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException('Stripe 通信失敗: ' . $err);
    }
    curl_close($ch);
    $data = json_decode($raw, true) ?: [];
    if ($status >= 400) {
        $msg = $data['error']['message'] ?? ('Stripe error ' . $status);
        throw new RuntimeException($msg);
    }
    return $data;
}

function gcq_create_checkout_session(string $userId): array
{
    $cfg = gcq_config();
    $secret = (string) ($cfg['stripe_secret_key'] ?? '');
    if ($secret === '') {
        throw new RuntimeException('stripe_secret_key 未設定');
    }

    $params = [
        'mode' => 'payment',
        'success_url' => $cfg['success_url'],
        'cancel_url' => $cfg['cancel_url'],
        'client_reference_id' => $userId,
        'metadata[userId]' => $userId,
        'payment_intent_data[metadata][userId]' => $userId,
        'line_items[0][quantity]' => '1',
    ];

    $priceId = trim((string) ($cfg['stripe_price_id'] ?? ''));
    if ($priceId !== '') {
        $params['line_items[0][price]'] = $priceId;
    } else {
        $params['line_items[0][price_data][currency]'] = 'jpy';
        $params['line_items[0][price_data][unit_amount]'] = (string) (int) ($cfg['stripe_unit_amount'] ?? 980);
        $params['line_items[0][price_data][product_data][name]'] = (string) ($cfg['product_name'] ?? 'Premium');
    }

    return gcq_stripe_form($secret, 'checkout/sessions', $params);
}

function gcq_verify_stripe_webhook(string $payload, ?string $header, string $secret, int $toleranceSec = 300): void
{
    if ($header === null || $header === '') {
        throw new RuntimeException('Stripe-Signature がありません');
    }
    $t = '';
    $v1List = [];
    foreach (explode(',', $header) as $part) {
        [$k, $v] = array_map('trim', explode('=', $part, 2) + [1 => '']);
        if ($k === 't') {
            $t = $v;
        }
        if ($k === 'v1' && $v !== '') {
            $v1List[] = $v;
        }
    }
    if ($t === '' || $v1List === []) {
        throw new RuntimeException('不正な Stripe-Signature');
    }
    $signed = $t . '.' . $payload;
    $expected = hash_hmac('sha256', $signed, $secret);
    $ok = false;
    foreach ($v1List as $v1) {
        if (hash_equals($expected, $v1)) {
            $ok = true;
            break;
        }
    }
    if (!$ok) {
        throw new RuntimeException('Stripe 署名不一致');
    }
    $age = time() - (int) $t;
    if (abs($age) > $toleranceSec) {
        throw new RuntimeException('Stripe 署名の時刻が古すぎます');
    }
}
