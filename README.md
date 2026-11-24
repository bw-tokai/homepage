# 拝島ブルーウッド東海 ホームページ

愛知県で活動する社会人ハンドボールクラブ「拝島ブルーウッド東海」の公式サイトです。GitHub Pages で公開しています。

## 構成

- `index.html` … ページ本体
- `assets/css/style.css` … デザイン
- `assets/js/main.js` … 動き（カレンダー・申込フォームなど）
- `assets/img/` … 写真・エンブレム

## よく行う更新

### 練習日程を変える
`assets/js/main.js` の先頭にある `SCHEDULE` を書き換えます。カレンダー、日程一覧、トップの「次回の練習」、申込フォームの日付の選択肢がすべて自動で更新されます。

```js
{ date: "2026-12-06", start: "18:00", end: "21:00", venue: "東海市民体育館", title: "通常練習", type: "p" },
```
`type` は `"p"`（練習）か `"g"`（練習試合・イベント）です。

### お知らせを追加する
`index.html` の `<ul class="newslist">` の中に `<li>` を1行追加します。

## 公開
リポジトリの Settings → Pages で、Source を「Deploy from a branch」、Branch を `main` / `(root)` にすると公開されます。
