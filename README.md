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
| 初級：開放弦 | 6〜1弦の開放弦（E / A / D / G / B / E）の音名あて |
| カノン進行（C） | C / G / Am / Em / F |
| カノン進行（D） | D / A / Bm / F#m / G |

開放弦は Freesound（Kyster / ナイロン弦の実録音）。コード音源も Freesound のプレビューMP3（`public/audio/`）。詳細は `public/audio/ATTRIBUTION.md`。

## ディレクトリ

```text
guitar-chord-quiz-line/
  index.html
  public/audio/     # コード音源
  src/main.js       # クイズ + LIFF init
  src/style.css
```

企画メモ・練習用ノートは Obsidian の `music/guitar-chord-quiz/` に置く想定。
