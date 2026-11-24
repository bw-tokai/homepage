/**
 * 拝島ブルーウッド東海 — LINE参加申込の受付（Google Apps Script）
 *
 * このコードは、申込を保存するスプレッドシートの
 * 「拡張機能 → Apps Script」に貼り付けて使います。
 *
 * 保存するもの: 受付日時・日程ID・日付・日程名・LINE表示名・LINEユーザーID
 *   「申込一覧」シート … 参加申込
 *   「出席記録」シート … 会場のQRコードから記録した出席（スタンプの元）
 *   「出欠表」シート   … 上の2つから自動で作る一覧（毎晩と、メニューの「出欠表を更新」で作り直し）
 * 保存しないもの: アイコン画像、電話番号、メールアドレスなど
 *
 * なりすまし防止のため、ユーザーIDはページから送られた値を信用せず、
 * LINEのアクセストークンをLINEのサーバーで確認して取り出しています。
 */

/** LINEログインチャネルのチャネルID（LIFF ID の「-」より前の数字） */
const CHANNEL_ID = '2012771321';
/** 申込を書き込むシートの名前（無ければ自動で作ります） */
const SHEET_NAME = '申込一覧';
const CHECKIN_SHEET = '出席記録';
const TABLE_SHEET = '出欠表';
/** 当日に取り消した申込は消さずに、この列に日時を入れて「当日キャンセル」として残す */
const CANCEL_COL = 7;
const HEADERS = ['受付日時', '日程ID', '日付', '日程', 'LINE表示名', 'LINEユーザーID'];

/* ---------------- 受付の入口 ---------------- */

function doGet() {
  return json_({ ok: true, message: '拝島ブルーウッド東海 参加申込API は動いています。' });
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const user = verify_(req.accessToken);
    switch (req.action) {
      case 'list':   return json_(list_(user));
      case 'apply':  return json_(apply_(user, req.events || []));
      case 'cancel': return json_(cancel_(user, req.eventId));
      case 'stamps': return json_(stamps_(user));
      case 'checkin': return json_(checkin_(user, req.event || {}));
      default:       return json_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* ---------------- 処理 ---------------- */

/** 日程ごとの参加予定人数と、本人の申込済み日程を返す */
function list_(user) {
  const rows = rows_();
  const counts = {};
  const mine = [];
  rows.forEach(function (r) {
    if (r.canceled) return;
    counts[r.eventId] = (counts[r.eventId] || 0) + 1;
    if (r.userId === user.userId) mine.push(r.eventId);
  });
  return { ok: true, counts: counts, mine: mine };
}

/** まとめて申し込む（申込済みの日程は重ねて登録しない） */
function apply_(user, events) {
  if (!Array.isArray(events) || !events.length) throw new Error('no_events');
  if (events.length > 30) throw new Error('too_many');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = sheet_();
    const done = {};
    rows_().forEach(function (r) { if (r.userId === user.userId && !r.canceled) done[r.eventId] = true; });
    const today = today_();
    const now = new Date();
    const add = [];
    events.forEach(function (ev) {
      const id = String(ev && ev.id || '');
      if (!validId_(id) || id.slice(0, 10) < today || done[id]) return;
      done[id] = true;
      add.push([now, id, id.slice(0, 10), safe_(String(ev.label || '').slice(0, 80)), safe_(user.displayName), user.userId]);
    });
    if (add.length) sheet.getRange(sheet.getLastRow() + 1, 1, add.length, HEADERS.length).setValues(add);
  } finally {
    lock.releaseLock();
  }
  return list_(user);
}

/** 本人の申込を1件取り消す（前日までは行ごと削除、当日は「当日キャンセル」として残す） */
function cancel_(user, eventId) {
  const id = String(eventId || '');
  if (!validId_(id)) throw new Error('bad_event');
  if (id.slice(0, 10) < today_()) throw new Error('past_event');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = sheet_();
    const rows = rows_();
    const sameDay = id.slice(0, 10) === today_();
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      if (r.eventId !== id || r.userId !== user.userId || r.canceled) continue;
      if (sameDay) sheet.getRange(r.row, CANCEL_COL).setValue(new Date());
      else sheet.deleteRow(r.row);
    }
  } finally {
    lock.releaseLock();
  }
  return list_(user);
}

/** 本人の出席回数と出席した日付を返す */
function stamps_(user) {
  const dates = rows_(CHECKIN_SHEET)
    .filter(function (r) { return r.userId === user.userId; })
    .map(function (r) { return r.eventId.slice(0, 10); });
  return { ok: true, count: dates.length, dates: dates, checkedToday: dates.indexOf(today_()) >= 0 };
}

/** 出席を記録する（その日の予定だけ・1日1回まで） */
function checkin_(user, ev) {
  const id = String(ev.id || '');
  if (!validId_(id)) throw new Error('bad_event');
  if (id.slice(0, 10) !== today_()) throw new Error('not_today');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let added = false;
  try {
    const today = today_();
    const dup = rows_(CHECKIN_SHEET).some(function (r) { return r.userId === user.userId && r.eventId.slice(0, 10) === today; });
    if (!dup) {
      const sheet = sheet_(CHECKIN_SHEET);
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, HEADERS.length)
        .setValues([[new Date(), id, today, safe_(String(ev.label || '').slice(0, 80)), safe_(user.displayName), user.userId]]);
      added = true;
    }
  } finally {
    lock.releaseLock();
  }
  const res = stamps_(user);
  res.added = added;
  return res;
}

/* ---------------- LINEの確認 ---------------- */

/** アクセストークンが本クラブのLIFFで発行されたものか確かめ、本人のプロフィールを返す */
function verify_(token) {
  if (!token) throw new Error('no_token');
  const cache = CacheService.getScriptCache();
  const key = 'u_' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);

  const v = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify?access_token=' + encodeURIComponent(token),
    { muteHttpExceptions: true });
  if (v.getResponseCode() !== 200) throw new Error('invalid_token');
  const info = JSON.parse(v.getContentText());
  if (String(info.client_id) !== CHANNEL_ID || !(info.expires_in > 0)) throw new Error('invalid_token');

  const p = UrlFetchApp.fetch('https://api.line.me/v2/profile',
    { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
  if (p.getResponseCode() !== 200) throw new Error('profile_failed');
  const prof = JSON.parse(p.getContentText());
  const user = { userId: prof.userId, displayName: prof.displayName || '' };
  cache.put(key, JSON.stringify(user), Math.min(600, info.expires_in));
  return user;
}

/* ---------------- シート ---------------- */

function sheet_(name) {
  name = name || SHEET_NAME;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name, name === SHEET_NAME ? 0 : ss.getNumSheets());
    const head = HEADERS.slice();
    if (name === CHECKIN_SHEET) head[0] = '出席日時';
    sh.getRange(1, 1, 1, HEADERS.length).setValues([head])
      .setFontWeight('bold').setBackground('#071262').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('yyyy/mm/dd hh:mm');
    sh.getRange('B:C').setNumberFormat('@');
    sh.setColumnWidths(1, HEADERS.length, 160);
    sh.setColumnWidth(4, 260);
  }
  if (name === SHEET_NAME && sh.getRange(1, CANCEL_COL).getValue() === '') {
    sh.getRange(1, CANCEL_COL).setValue('当日取消')
      .setFontWeight('bold').setBackground('#071262').setFontColor('#ffffff');
    sh.getRange(2, CANCEL_COL, sh.getMaxRows() - 1, 1).setNumberFormat('yyyy/mm/dd hh:mm');
  }
  return sh;
}

function rows_(name) {
  const sh = sheet_(name);
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, CANCEL_COL).getValues().map(function (v, i) {
    return { row: i + 2, eventId: String(v[1]), userId: String(v[5]), name: String(v[4]), canceled: v[6] !== '' };
  });
}

/** 最初に一度だけ実行すると、シートの見出し・毎晩の出欠表更新を用意し、LINEへの接続を許可できます */
function setup() {
  sheet_();
  sheet_(CHECKIN_SHEET);
  UrlFetchApp.fetch('https://api.line.me/', { muteHttpExceptions: true });
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'updateAttendanceTable') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('updateAttendanceTable').timeBased().everyDays(1).atHour(23).inTimezone('Asia/Tokyo').create();
  updateAttendanceTable();
}

/** スプレッドシートを開いたときに「BW東海」メニューを出す */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('BW東海')
    .addItem('出欠表を更新', 'updateAttendanceTable')
    .addToUi();
}

/* ---------------- 出欠表 ---------------- */

/**
 * 「申込一覧」と「出席記録」から「出欠表」シートを作り直す。
 *   ◎ 申込あり・出席   〇 申込なし・出席（当日出席）
 *   ⊗ 申込あり・欠席（当日キャンセル）   × 欠席
 * 対象は今日までの日付。その人が初めて記録に出てきた日より前は空欄にし、出席率の分母に入れない。
 */
function updateAttendanceTable() {
  const today = today_();
  const applied = {};   // userId -> { date: true }
  const attended = {};  // userId -> { date: true }
  const names = {};
  const first = {};
  const dateSet = {};
  const note = function (map, r) {
    const d = r.eventId.slice(0, 10);
    if (d > today) return;
    (map[r.userId] = map[r.userId] || {})[d] = true;
    dateSet[d] = true;
    if (r.name) names[r.userId] = r.name;
    if (!first[r.userId] || d < first[r.userId]) first[r.userId] = d;
  };
  rows_().forEach(function (r) { note(applied, r); });
  rows_(CHECKIN_SHEET).forEach(function (r) { note(attended, r); });

  const dates = Object.keys(dateSet).sort().reverse();   // 新しい日付が左
  const users = Object.keys(first).sort(function (a, b) {
    return String(names[a]).localeCompare(String(names[b]), 'ja');
  });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(TABLE_SHEET);
  if (!sh) sh = ss.insertSheet(TABLE_SHEET, 0);
  sh.clear();
  sh.getRange(1, 1, Math.max(sh.getMaxRows(), 2), sh.getMaxColumns()).clearDataValidations();

  const FIX = 4;  // 名前・出席回数・出席率・当日キャンセル率
  const head = ['名前', '出席回数', '出席率', '当日キャンセル率'].concat(dates.map(function (d) {
    const p = d.split('-');
    return Number(p[1]) + '/' + Number(p[2]);
  }));
  const body = users.map(function (u, i) {
    const row = i + 2;
    const L = colName_(FIX + 1), R = colName_(FIX + Math.max(dates.length, 1));
    const rng = L + row + ':' + R + row;
    const marks = dates.map(function (d) {
      if (d < first[u]) return '';
      const a = applied[u] && applied[u][d], t = attended[u] && attended[u][d];
      return a && t ? '◎' : t ? '〇' : a ? '⊗' : '×';
    });
    return [names[u] || '(名前なし)',
      '=COUNTIF(' + rng + ',"◎")+COUNTIF(' + rng + ',"〇")',
      '=IFERROR(B' + row + '/COUNTA(' + rng + '),"")',
      '=IFERROR(COUNTIF(' + rng + ',"⊗")/(COUNTIF(' + rng + ',"◎")+COUNTIF(' + rng + ',"⊗")),"")'].concat(marks);
  });

  const width = head.length;
  sh.getRange(1, 1, 1, width).setValues([head])
    .setFontWeight('bold').setBackground('#071262').setFontColor('#ffffff')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.getRange(1, 1).setHorizontalAlignment('left');
  if (body.length) {
    sh.getRange(2, 1, body.length, width).setValues(body)
      .setVerticalAlignment('middle');
    sh.getRange(2, 2, body.length, 1).setNumberFormat('0"回"').setHorizontalAlignment('center').setFontWeight('bold');
    sh.getRange(2, 3, body.length, 2).setNumberFormat('0%').setHorizontalAlignment('center');
    if (dates.length) {
      const grid = sh.getRange(2, FIX + 1, body.length, dates.length);
      grid.setHorizontalAlignment('center').setFontSize(12);
      const rule = function (t, bg, fg) {
        return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(t)
          .setBackground(bg).setFontColor(fg).setRanges([grid]).build();
      };
      sh.setConditionalFormatRules([
        rule('◎', '#dfe5fb', '#071262'),
        rule('〇', '#fff3cc', '#946600'),
        rule('⊗', '#fbe0e4', '#a8132a'),
        rule('×', '#f3f4f9', '#9aa0bb'),
      ]);
    }
    sh.getRange(1, 1, body.length + 1, width).setBorder(true, true, true, true, true, true, '#dfe2ee', SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(2, FIX, body.length, 1).setBorder(null, null, null, true, null, null, '#071262', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  }
  sh.setFrozenRows(1);
  sh.setFrozenColumns(FIX);
  sh.setColumnWidth(1, 160);
  sh.setColumnWidths(2, 3, 96);
  if (dates.length) sh.setColumnWidths(FIX + 1, dates.length, 48);
  sh.setRowHeights(1, body.length + 1, 30);

  const legendRow = body.length + 3;
  sh.getRange(legendRow, 1, 2, 1).setValues([
    ['◎ 申込あり・出席　〇 申込なし・出席（当日出席）　⊗ 申込あり・欠席（当日キャンセル）　× 欠席'],
    ['最終更新: ' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') + '（毎晩23時と、メニュー「BW東海 → 出欠表を更新」で作り直します。手で書いた内容は上書きされます）'],
  ]).setFontColor('#5d6483').setFontSize(9);
}

function colName_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/* ---------------- 小物 ---------------- */

function validId_(id) { return /^\d{4}-\d{2}-\d{2}_[a-z0-9-]{1,20}$/.test(id); }
function today_() { return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd'); }
/** 「=」などで始まる文字が数式として動かないようにする */
function safe_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
