/* 拝島ブルーウッド東海 — LINE参加申込の設定

   LIFF_ID  … LINE Developers の LIFFアプリの「LIFF ID」
   GAS_URL  … Google Apps Script を「ウェブアプリ」として公開したときのURL
              （https://script.google.com/macros/s/……/exec）
              空のままだと、申込ページはお試し表示（デモ）になり、申込は保存されません。 */
const LIFF_ID = "2012771321-zQm6WMGw";
const GAS_URL = "";

const LIFF_URL = `https://liff.line.me/${LIFF_ID}`;

/* ===== 出席スタンプカード =====
   STAMP_CARD … 1枚のカードのマス数（たまると次のカードへ）
   REWARDS    … 特典。at = 何回目の出席でもらえるか（通算）、label = 内容
                 ここを書き換えるだけで、カードの印と特典の一覧が変わります。
   CHECKIN_EARLY / CHECKIN_LATE … 開始の何分前から、終了の何分後までチェックインできるか */
const STAMP_CARD = 10;
const REWARDS = [
  { at: 5,  label: "リストバンド" },
  { at: 10, label: "タオル" },
  { at: 20, label: "チームTシャツ" },
];
const CHECKIN_EARLY = 60;
const CHECKIN_LATE = 60;
