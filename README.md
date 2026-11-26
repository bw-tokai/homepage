# ブルーウッド東海 ホームページ

愛知県で活動する社会人ハンドボールクラブ「ブルーウッド東海」の公式サイトです。GitHub Pages で公開しています。

## 構成

- `index.html` … ページ本体
- `assets/css/style.css` … デザイン
- `assets/js/schedule.js` … 練習日程（サイトとLINE申込ページで共通）
- `assets/js/line-config.js` … LINEの設定（LIFF ID・GASのURL・スタンプの特典）
- `assets/js/main.js` … 動き（カレンダーなど）
- `liff/index.html` … LINEの参加申込ページ（LIFF）
- `liff/checkin.html` … 出席チェックイン＋スタンプカード（会場のQRコードから開く）
- `liff/poster.html` … 会場に貼るQRポスター（印刷用）
- `gas/Code.gs` … 申込・出席をスプレッドシートに保存する Google Apps Script
- `assets/img/` … 写真・エンブレム

## よく行う更新

### 練習日程を変える
`assets/js/schedule.js` の `SCHEDULE` を書き換えます。カレンダー、日程一覧、トップの「次回の練習」と、LINEの参加申込ページの日程がすべて自動で更新されます。

```js
{ date: "2026-12-06", start: "18:00", end: "21:00", venue: "東海市民体育館", type: "solo" },
{ date: "2026-12-27", start: "18:00", end: "21:00", venue: "東海市民体育館", type: "event", title: "練習納め・忘年会" },
```

`type` は次の5種類です。種類ごとにカレンダーと一覧の色が変わります。

| type | 表示名 | 色 |
|---|---|---|
| `solo` | 単独練習会 | 濃紺 |
| `joint` | 合同練習会 | 青 |
| `match` | 練習試合 | 山吹色 |
| `game` | 試合・大会 | 赤 |
| `event` | イベント | 白（紺のふち） |

`team` は対象で、`"men"`（成年男子）・`"women"`（成年女子）・`"all"`（男女合同）から選びます。終日の予定は `start` / `end` の代わりに `allDay: true` と書きます。

`title` は省略できます。申込は「日付＋対象」で記録されるので、申込が入った後に日付や対象を変えると別の日程扱いになります。

### LINE申込・出席スタンプ
- 申込ページ: `https://liff.line.me/2012771321-zQm6WMGw`
- 出席チェックイン: `https://liff.line.me/2012771321-zQm6WMGw/checkin.html`（会場のQRコード）
- 申込は「申込一覧」シート、出席は「出席記録」シートに保存されます。
- スタンプのマス数と特典は `assets/js/line-config.js` の `STAMP_CARD` と `REWARDS` で変えられます。

### お知らせを追加する
`index.html` の `<ul class="newslist">` の中に `<li>` を1行追加します。

## 公開
リポジトリの Settings → Pages で、Source を「Deploy from a branch」、Branch を `main` / `(root)` にすると公開されます。
