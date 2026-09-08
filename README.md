# guitar-chord-quiz-line

LINE **LIFF** 向けギターコードクイズ。音を再生 → コードを選択。

## ローカル起動

```bash
cd /Users/sen/Development/guitar-chord-quiz-line
cp .env.example .env   # 後で LIFF ID を入れる
npm install
npm run dev
```

ブラウザで開けば、LIFF未設定でもクイズ自体は動きます。

## LINE（LIFF）接続手順

**本番 URL（Endpoint）:** https://curry-udon.github.io/guitar-chord-quiz-line/  
**LIFF URL:** https://liff.line.me/2011463729-2nZDmvbp  
**LIFF ID:** `2011463729-2nZDmvbp`

1. [LINE Developers](https://developers.line.biz/) でプロバイダー／チャネル作成（LINEログイン or Messaging API）
2. LIFF アプリを追加
   - Endpoint URL: `https://curry-udon.github.io/guitar-chord-quiz-line/`
   - Size: Full
   - Scope: `profile`
3. 発行された **LIFF ID** を GitHub Actions secret `VITE_LIFF_ID` に設定  
   （またはローカル `.env` の `VITE_LIFF_ID`）
4. `main` へ push（または Actions の Deploy を再実行）して再デプロイ
5. LINE アプリから LIFF URL（`https://liff.line.me/{LIFF_ID}`）を開く

> 注: 当初想定の Vercel は CLI 未ログインのため、同等の HTTPS 公開として **GitHub Pages** を使用。

## クイズ内容

| モード | 内容 |
| :--- | :--- |
| 暗記：コード（ドレミ） | 英字↔ドレミ双方向 |
| 練習：大譜表 | 音名タップ → 大譜表に音符＋音（E2〜E5） |
| 暗記：大譜表 | 音符→ミ3 / E3 形式（自然音 E2〜E5） |
| 暗記：ダイアグラム | ダイアトニック / カノン(C) / 開放弦（利き手切替可） |
| 暗記：TAB | 同上＋構成音1音（アルペジオ土台） |
| 初級：開放弦 | 6〜1弦の開放弦（E / A / D / G / B / E）の音名あて |
| 練習：開放弦 | 音名タップ → 音＋ピアノロール（暗記用） |
| ダイアトニック（C） | C / Dm / Em / F / G / Am / Bm(♭5) |
| 練習：ダイアトニック（C） | コード名タップ → 音＋構成音（暗記用） |
| カノン進行（C） | C / G / Am / Em / F |
| カノン進行（D） | D / A / Bm / F#m / G |

暗記モードの設計詳細は [ROADMAP-memorize-modes.md](./ROADMAP-memorize-modes.md)。  
収益化（フリーミアム）は [ROADMAP-freemium.md](./ROADMAP-freemium.md)（App Store は当面なし）。  
**F2 API（本番）**: コスタバ配下 [backend/gcq-api/](./backend/gcq-api/) → `https://costuba.online/gcq-api/`  
（ローカル試作: `npm run api:dev`）

開放弦は Freesound（Kyster / ナイロン弦の実録音）。コード音源も Freesound のプレビューMP3（`public/audio/`）。詳細は `public/audio/ATTRIBUTION.md`。

## ディレクトリ

```text
guitar-chord-quiz-line/
  index.html
  public/audio/     # コード音源
  src/main.js       # クイズ + LIFF init + Premium 同期
  src/premium.js    # 無料／有料ゲート
  backend/          # Workers/D1 + ローカル API（F2）
  src/style.css
```

企画メモ・練習用ノートは Obsidian の `music/guitar-chord-quiz/` に置く想定。
