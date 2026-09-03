# マイアシスタント (personal-assistant)

聞かなくても自分の予定・お金・やることが一目で分かる、**iPhone向けのパーソナルアシスタント**です。
カレンダー(予定)・家計簿・TODO・メモを1つにまとめました。

- 📅 **予定 / カレンダー** … 予約・内容・時間・場所・行き方・誰と・費用・持ち物チェックリスト・メモ。旅行や飲み会の情報をまとめて管理
- 💰 **家計簿** … 収支を記録し、月ごとの残高とカテゴリ別支出をグラフで可視化
- ✅ **TODO** … 期限・優先度つきのやることリスト
- 📝 **メモ** … 自由記述のメモ
- 🏠 **ホーム** … 今月の収支・直近の予定・未完了のやることをまとめて表示

## 特長

- **情報の入れやすさ**: 予約メールの本文を貼り付けたり、乗換アプリのスクショ・写真を添付するだけで、予定やメモに情報を残せます(クリップボードからの画像ペーストにも対応)。
- **完全に端末内で完結**: データはブラウザの IndexedDB に保存。アカウント登録もサーバーも不要で、無料で使えます。
- **オフライン対応**: Service Worker により、ネットがなくても起動・操作できます。
- **依存ゼロ**: フレームワークやビルド不要のバニラ HTML / CSS / JavaScript。`index.html` を開くだけで動きます。

## 公開(GitHub Pages)

このリポジトリには GitHub Pages への自動デプロイ設定(`.github/workflows/deploy-pages.yml`)が入っています。
初回のみ、以下の設定が必要です:

1. GitHub のリポジトリ **Settings → Pages** を開く
2. **Build and deployment → Source** を **「GitHub Actions」** に変更
3. `main` ブランチにマージ(または push)すると自動でデプロイされます

公開URLは次の形になります:

```
https://ryuya-matsubara.github.io/personal-assistant/
```

デプロイの進捗はリポジトリの **Actions** タブで確認できます。

## iPhone での使い方(ホーム画面に追加)

1. 上記の公開URLを iPhone の **Safari** で開きます。
2. 共有ボタン → **「ホーム画面に追加」** をタップ。
3. ホーム画面のアイコンから、通常のアプリのように起動できます。

> ※ Service Worker と「ホーム画面に追加」を使うには **HTTPS(または localhost)** での配信が必要です。`file://` で直接開いた場合も基本機能は動きますが、オフラインキャッシュは無効になります。

## ローカルで試す

```bash
# 任意の静的サーバーで配信するだけ(ビルド不要)
python3 -m http.server 8099
# → http://localhost:8099/index.html を開く
```

## 構成

```
index.html               画面の骨組み(ヘッダー・ビュー・下タブ)
manifest.webmanifest     PWA 設定(ホーム画面追加用)
sw.js                    Service Worker(オフライン対応)
icons/                   アプリアイコン(SVG + PNG)
src/
  css/style.css          スタイル(iPhone Safari 最適化)
  js/
    app.js               ルーティングと各画面の描画
    db.js                IndexedDB ラッパー(保存・添付)
    util.js              共通ユーティリティ(日付・金額など)
    ui.js                モーダルなどの共通 UI
    attachments.js       添付(スクショ・テキスト貼り付け)
    views/               画面ごとの実装
      home.js  calendar.js  money.js  todo.js  memo.js
tools/gen_icons.py       アイコン PNG 生成スクリプト(依存なし)
```

## データについて

すべてのデータは使用中の端末・ブラウザ内にのみ保存されます。別端末とは同期されず、ブラウザのデータを消去すると失われます。将来的にクラウド同期や、貼り付けた内容を自動で読み取る AI 機能を追加する土台として設計しています。
