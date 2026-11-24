/* 拝島ブルーウッド東海 — 練習日程（サイトのカレンダーとLINE申込ページで共通）

   ここを書き換えると、サイトのカレンダー・日程一覧・トップの「次回」と、
   LINEの参加申込ページの日程がすべて更新されます。

   type は次の5種類から選びます:
     "solo"  = 単独練習会   "joint" = 合同練習会   "match" = 練習試合
     "game"  = 試合・大会   "event" = イベント
   team は対象: "men" = 成年男子, "women" = 成年女子, "all" = 男女合同
   終日の予定は start / end の代わりに allDay: true を書きます。
   title は省略できます（省略すると種類名が表示されます）。

   ※ 申込はこの日程の「日付＋対象」で記録されます。申込が入った後に
     日付や対象を変えると、その申込は別の日程扱いになるので注意してください。 */
const SCHEDULE = [
  { date: "2026-11-28", start: "18:00", end: "21:00", venue: "親水公園体育館", type: "match", team: "men" },
  { date: "2026-12-05", start: "17:30", end: "21:00", venue: "知多メディアス体育館", type: "match", team: "men", title: "名南北陵との練習試合" },
  { date: "2026-12-12", start: "17:30", end: "21:00", venue: "知多メディアス体育館", type: "match", team: "men", title: "名南北陵との練習試合" },
  { date: "2026-12-19", allDay: true, venue: "であいドーム（岐阜）", type: "game", team: "men", title: "東海マスターズ（1日目）" },
  { date: "2026-12-20", allDay: true, venue: "であいドーム（岐阜）", type: "game", team: "men", title: "東海マスターズ（2日目）" },
];

/* 種類ごとの表示名（色は style.css の .t-solo などで指定） */
const TYPES = {
  solo:  { label: "単独練習会" },
  joint: { label: "合同練習会" },
  match: { label: "練習試合" },
  game:  { label: "試合・大会" },
  event: { label: "イベント" },
};
const typeLabel = (e) => (TYPES[e.type] || TYPES.solo).label;
const titleOf = (e) => e.title || typeLabel(e);
const TEAMS = { men: "成年男子", women: "成年女子", all: "男女合同" };
const teamLabel = (e) => TEAMS[e.team || "all"];
const startOf = (e) => (e.allDay ? "00:00" : e.start);
const endOf = (e) => (e.allDay ? "23:59" : e.end);
const timeText = (e, sep = "〜") => (e.allDay ? "終日" : `${e.start}${sep}${e.end}`);
/* 申込の記録に使う日程ID（例: "2026-12-05_men"） */
const eventId = (e) => e.id || `${e.date}_${e.team || "all"}`;
