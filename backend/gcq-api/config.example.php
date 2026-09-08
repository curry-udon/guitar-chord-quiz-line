<?php
/**
 * コピーして config.php にリネームし、値を埋める。
 * config.php は Git に含めないこと。
 */
declare(strict_types=1);

return [
    // MySQL（コスタバと同じサーバーの別DB推奨）
    'db' => [
        'host' => 'localhost',
        'name' => 'your_db_name',
        'user' => 'your_db_user',
        'pass' => 'your_db_password',
        'charset' => 'utf8mb4',
    ],

    // LINE Login / LIFF のチャネル ID（ID token の aud）
    'line_channel_id' => '',

    // Stripe
    'stripe_secret_key' => '',      // sk_test_... → 本番は sk_live_...
    'stripe_webhook_secret' => '', // whsec_...
    'stripe_price_id' => '',       // 空なら都度 price_data（JPY）
    'stripe_unit_amount' => 980,

    'product_name' => 'ギターコードクイズ Premium',

    // Checkout 戻り先（GitHub Pages の LIFF）
    'success_url' => 'https://curry-udon.github.io/guitar-chord-quiz-line/?premium=success',
    'cancel_url' => 'https://curry-udon.github.io/guitar-chord-quiz-line/?premium=cancel',

    // CORS 許可（カンマ区切り可）。ローカル Vite はコード側で許可
    'frontend_origins' => [
        'https://curry-udon.github.io',
        'https://costuba.online',
    ],

    // LIFF 外ブラウザ用 anon: ID を許可するか
    'allow_anon' => true,

    // 設定時のみ /api/dev-unlock 有効。本番では空文字に
    'dev_unlock_secret' => '',
];
