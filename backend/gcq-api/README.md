# Premium API（コスタバ配下）

本番想定 URL: **https://costuba.online/gcq-api/**

ギタークイズ LIFF の Stripe 買い切り用。将来コスタバ本体の課金も同じ Stripe アカウント／同系 API パターンで足せるように、サイト配下に置く。

## エンドポイント

| Method | URL |
| :--- | :--- |
| GET | `/gcq-api/health.php` または `/gcq-api/health` |
| POST | `/gcq-api/api/me.php` |
| POST | `/gcq-api/api/checkout.php` |
| POST | `/gcq-api/api/webhook.php` |
| POST | `/gcq-api/api/dev-unlock.php` |

フロントの `VITE_API_BASE` は **末尾スラッシュなし** で:

```bash
VITE_API_BASE=https://costuba.online/gcq-api
```

（`premium.js` が `${base}/api/me` を呼ぶため、実ファイルは `/api/me.php`。  
nginx で拡張子なしが通らない場合は、フロントを `.php` 付きに合わせるか、サーバー側で rewrite する。）

**重要:** 現状フロントは `/api/me`（拡張子なし）を呼ぶ。共有サーバーで rewrite が効かないときはどちらかが必要:

1. `.htaccess` / nginx で `api/me` → `api/me.php`
2. またはフロントのパスを `api/me.php` に変更

本リポジトリでは **両方動く**ようにしてある:

- Apache + `.htaccess` → `/api/me` 可
- 実ファイル → `/api/me.php` 可

フロントはデフォルトで拡張子なし。rewrite が無い場合は `VITE_API_SUFFIX=.php` で切替可能にする。

## あなたがやること（設置）

1. **MySQL**  
   - コスタバと同じサーバーに DB（できれば専用）を作成  
   - `schema.sql` を phpMyAdmin で実行

2. **ファイルアップロード**  
   - `backend/gcq-api/` の中身をサーバーの `.../gcq-api/` へ  
   - `config.example.php` → `config.php` にコピーして編集  
     - DB 接続  
     - `line_channel_id`  
     - Stripe test/live 鍵  
     - `success_url` / `cancel_url`

3. **動作確認**  
   - ブラウザで `https://costuba.online/gcq-api/health.php` → `{"ok":true}`

4. **Stripe Webhook**  
   - URL: `https://costuba.online/gcq-api/api/webhook.php`  
   - イベント: `checkout.session.completed`

5. **フロント**  
   - GitHub の `VITE_API_BASE=https://costuba.online/gcq-api`  
   - rewrite が効かない場合は `VITE_API_SUFFIX=.php` も設定

6. **セキュリティ**  
   - 本番では `dev_unlock_secret` を空に  
   - `config.php` のパーミッションに注意（`.htaccess` で直アクセス拒否）

## 将来：コスタバ本体の Stripe

- 同じ Stripe アカウントを使える  
- 商品（Price）だけコスタバ用に分ける  
- 必要ならこの `gcq-api` に `product=costuba_xxx` を足すか、WP プラグインから同じ Webhook／顧客 ID 設計を共有する

まずはギタークイズ Premium の買い切りでパイプラインを確定するのが先。
