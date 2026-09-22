# Stripe 本番化チェックリスト（ギターコードクイズ / gcq-api）

API: `https://costuba.online/gcq-api/`  
Webhook: `https://costuba.online/gcq-api/api/webhook.php`  
価格（現状）: ¥980 買い切り（`stripe_price_id` 空 → `price_data`）

---

## いまの状態

| 項目 | 状態 |
| :--- | :--- |
| gcq-api health | OK（Costuba 本番） |
| Stripe 鍵 | **test**（`sk_test_…`） |
| Webhook | test 用 `whsec_…` |
| `dev_unlock_secret` | まだ入っている → 本番では空にする |

---

## あなたが Stripe Dashboard でやること

### 1. アカウントを本番利用可能にする

1. [Stripe Dashboard](https://dashboard.stripe.com/) → アカウント **コスタバ GCQ**
2. 右上の **「テストモード」を OFF**（本番モード）
3. **本人確認／ビジネス情報**が未完了なら完了させる（銀行口座・代表者情報など）
4. 本番決済が有効になるまで待つ（審査中は `sk_live` が使えない／制限がある場合あり）

### 2. 本番の API キーを控える

1. 本番モードのまま **開発者 → API キー**
2. **シークレットキー** `sk_live_…` をコピー（チャットに貼らず、ローカルの `.deploy-secrets.env` にだけ書くのが安全）

### 3. 本番 Webhook を作る

1. 本番モードのまま **開発者 → Webhook → エンドポイントを追加**
2. URL: `https://costuba.online/gcq-api/api/webhook.php`
3. イベント: **`checkout.session.completed`** のみで可
4. 署名シークレット `whsec_…` を控える（**test 用とは別**）

### 4（任意）. 本番 Price を作る

- 商品「ギターコードクイズ Premium」・一度きり・JPY 980
- Price ID `price_…` を `stripe_price_id` に入れると管理しやすい
- 空のままでも現状コードは `unit_amount=980` で動く

---

## こちらでやること（鍵が用意できたら）

1. `.deploy-secrets.env` とサーバー上 `config.php` を  
   `sk_live_…` / 本番 `whsec_…` に更新
2. `dev_unlock_secret` を **空文字** に
3. SFTP で `gcq-api` を再アップロード
4. LIFF から少額の本番購入テスト（必要ならすぐ返金）

---

## 完了の見極め

- [ ] Checkout が **本番**（テストカード不可・本物カード）
- [ ] 購入後 Webhook で `premium` が立つ
- [ ] LIFF 再起動後も有料モードが維持される
- [ ] `/api/dev-unlock` が無効

---

## 注意

- test の Webhook と live の Webhook は **別 endpoint／別 whsec**
- `sk_live` を Git やチャットに載せない（`.deploy-secrets.env` / サーバー `config.php` のみ）
- 法務（特商法・プライバシー）は ROADMAP Phase 3 の残り
