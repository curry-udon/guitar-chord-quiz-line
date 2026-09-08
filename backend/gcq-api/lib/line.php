<?php
declare(strict_types=1);

/**
 * @return array{userId: string, name?: string}
 */
function gcq_verify_line_id_token(string $idToken, string $channelId): array
{
    if ($idToken === '' || $channelId === '') {
        throw new RuntimeException('idToken / channelId がありません');
    }
    $ch = curl_init('https://api.line.me/oauth2/v2.1/verify');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_POSTFIELDS => http_build_query([
            'id_token' => $idToken,
            'client_id' => $channelId,
        ]),
        CURLOPT_TIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($raw === false) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException('LINE verify 通信失敗: ' . $err);
    }
    curl_close($ch);
    $data = json_decode($raw, true) ?: [];
    if ($status >= 400 || empty($data['sub'])) {
        $msg = $data['error_description'] ?? $data['error'] ?? 'invalid token';
        throw new RuntimeException('LINE token 検証失敗: ' . $msg);
    }
    return [
        'userId' => (string) $data['sub'],
        'name' => isset($data['name']) ? (string) $data['name'] : null,
    ];
}

/**
 * @param array{idToken?: string, anonId?: string} $body
 * @return array{userId: string, via: string}
 */
function gcq_resolve_user_id(array $body): array
{
    $cfg = gcq_config();
    if (!empty($body['idToken'])) {
        $channelId = (string) ($cfg['line_channel_id'] ?? '');
        if ($channelId === '') {
            throw new RuntimeException('line_channel_id が未設定です');
        }
        $verified = gcq_verify_line_id_token((string) $body['idToken'], $channelId);
        return ['userId' => $verified['userId'], 'via' => 'line'];
    }
    if (!empty($body['anonId']) && !empty($cfg['allow_anon'])) {
        $id = substr((string) $body['anonId'], 0, 80);
        if (!preg_match('/^anon:[a-zA-Z0-9_-]+$/', $id)) {
            throw new RuntimeException('anonId の形式が不正です');
        }
        return ['userId' => $id, 'via' => 'anon'];
    }
    throw new RuntimeException('idToken または anonId が必要です');
}
