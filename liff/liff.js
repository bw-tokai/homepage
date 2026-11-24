/* 拝島ブルーウッド東海 — LINE参加申込ページ */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DOW = ["日", "月", "火", "水", "木", "金", "土"];
  const DOW_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const MON_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const parse = (d) => { const [y, m, dd] = d.split("-").map(Number); return new Date(y, m - 1, dd); };
  const params = new URLSearchParams(location.search);
  const DEMO = !GAS_URL || params.has("demo");

  const state = { events: [], counts: {}, mine: new Set(), picked: new Set(), filter: "all", busy: false, token: "" };

  /* これから先の予定だけ（終了時刻を過ぎたものは出さない） */
  const now = new Date();
  state.events = SCHEDULE
    .filter((e) => new Date(`${e.date}T${endOf(e)}:00+09:00`) > now)
    .sort((a, b) => (a.date + startOf(a)).localeCompare(b.date + startOf(b)));

  const labelOf = (e) => {
    const d = parse(e.date);
    return `${d.getMonth() + 1}/${d.getDate()}（${DOW[d.getDay()]}）${titleOf(e)}【${teamLabel(e)}】${e.venue}`;
  };

  /* ---------- 通信 ---------- */
  const demoDb = { counts: {}, mine: new Set() };
  state.events.forEach((e, i) => (demoDb.counts[eventId(e)] = [6, 9, 4, 12, 7, 3, 8][i % 7]));

  const api = async (action, body = {}) => {
    if (DEMO) {
      await new Promise((r) => setTimeout(r, 450));
      if (action === "apply") body.events.forEach((ev) => { if (!demoDb.mine.has(ev.id)) { demoDb.mine.add(ev.id); demoDb.counts[ev.id] = (demoDb.counts[ev.id] || 0) + 1; } });
      if (action === "cancel" && demoDb.mine.delete(body.eventId)) demoDb.counts[body.eventId]--;
      return { ok: true, counts: { ...demoDb.counts }, mine: [...demoDb.mine] };
    }
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, accessToken: state.token, ...body }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "error");
    return data;
  };

  const take = (data) => {
    state.counts = data.counts || {};
    state.mine = new Set(data.mine || []);
    state.mine.forEach((id) => state.picked.delete(id));
  };

  /* ---------- 表示 ---------- */
  const list = $("[data-list]");
  const visible = () => state.events.filter((e) => state.filter === "all" || (e.team || "all") === "all" || e.team === state.filter);

  const card = (e) => {
    const id = eventId(e);
    const d = parse(e.date);
    const mine = state.mine.has(id);
    const picked = state.picked.has(id);
    const n = state.counts[id] || 0;
    const dow = d.getDay();
    return `<article class="ev t-${esc(e.type)}${mine ? " is-mine" : ""}${picked ? " is-picked" : ""}" data-id="${esc(id)}">
      <button class="ev__hit" ${mine ? "disabled" : ""} aria-pressed="${picked}" aria-label="${esc(labelOf(e))}${mine ? "（申込済み）" : picked ? "（選択中）" : ""}"></button>
      <div class="ev__date${dow === 0 ? " is-sun" : dow === 6 ? " is-sat" : ""}"><b>${d.getDate()}</b><span>${DOW_EN[dow]}</span></div>
      <div class="ev__body">
        <p class="ev__tags"><span class="tchip">${esc(typeLabel(e))}</span><span class="team">${esc(teamLabel(e))}</span></p>
        ${e.title ? `<h3>${esc(e.title)}</h3>` : ""}
        <p class="ev__meta"><span>${esc(timeText(e))}</span><span>${esc(e.venue)}</span></p>
        <div class="ev__foot">
          <p class="ev__count"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.4 3-5.2 6-5.2s5.4 1.8 6 5.2"/><circle cx="17" cy="9" r="2.4"/><path d="M16.4 13.9c2.3.2 4 1.6 4.6 4.1"/></svg>参加予定 <b>${n}</b>人</p>
          ${mine ? `<p class="ev__ok">申込済み</p><button class="ev__cancel" data-cancel="${esc(id)}">取り消す</button>` : ""}
        </div>
      </div>
      <span class="ev__check" aria-hidden="true"></span>
    </article>`;
  };

  const render = () => {
    const evs = visible();
    if (!evs.length) {
      list.innerHTML = `<div class="empty"><b>受付中の予定はありません</b><p>新しい予定が決まると、ここに表示されます。</p></div>`;
    } else {
      let html = "", ym = "";
      evs.forEach((e) => {
        const k = e.date.slice(0, 7);
        if (k !== ym) {
          ym = k;
          const [y, m] = k.split("-").map(Number);
          html += `<h2 class="month"><b>${MON_EN[m - 1]}</b><span>${y}年${m}月</span></h2>`;
        }
        html += card(e);
      });
      list.innerHTML = html;
    }
    const n = state.picked.size;
    $("[data-n]").textContent = n;
    $("[data-submit]").disabled = !n || state.busy;
    $("[data-bar]").classList.toggle("is-on", n > 0);
  };

  list.addEventListener("click", (ev) => {
    const c = ev.target.closest("[data-cancel]");
    if (c) return askCancel(c.dataset.cancel);
    const hit = ev.target.closest(".ev__hit");
    if (!hit || hit.disabled) return;
    const id = hit.closest(".ev").dataset.id;
    state.picked.has(id) ? state.picked.delete(id) : state.picked.add(id);
    render();
  });

  $$("[data-filter]").forEach((b) => b.addEventListener("click", () => {
    state.filter = b.dataset.filter;
    $$("[data-filter]").forEach((x) => x.setAttribute("aria-selected", x === b));
    render();
  }));

  /* ---------- 確認シート ---------- */
  const sheet = $("[data-sheet]");
  let onOk = null;
  const openSheet = ({ k, title, items, note, ok, danger }) => {
    $("[data-sheet-k]").textContent = k;
    $("[data-sheet-title]").textContent = title;
    $("[data-sheet-list]").innerHTML = items.map((e) => {
      const d = parse(e.date);
      return `<li><b>${d.getMonth() + 1}/${d.getDate()}<small>（${DOW[d.getDay()]}）</small></b><span>${esc(titleOf(e))}<small>${esc(teamLabel(e))}・${esc(timeText(e))}・${esc(e.venue)}</small></span></li>`;
    }).join("");
    $("[data-sheet-note]").textContent = note;
    const okBtn = $("[data-ok]");
    okBtn.textContent = ok;
    okBtn.classList.toggle("btn--danger", !!danger);
    onOk = null;
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add("is-open"));
    return new Promise((r) => (onOk = r));
  };
  const closeSheet = (v) => {
    sheet.classList.remove("is-open");
    setTimeout(() => (sheet.hidden = true), 250);
    if (onOk) { onOk(v); onOk = null; }
  };
  $$("[data-close]", sheet).forEach((b) => b.addEventListener("click", () => closeSheet(false)));
  $("[data-ok]").addEventListener("click", () => closeSheet(true));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) closeSheet(false); });

  const toast = (msg, bad) => {
    const t = $("[data-toast]");
    t.textContent = msg;
    t.classList.toggle("is-bad", !!bad);
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add("is-on"));
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { t.classList.remove("is-on"); setTimeout(() => (t.hidden = true), 300); }, 3200);
  };

  const busy = (on) => {
    state.busy = on;
    document.body.classList.toggle("is-busy", on);
    render();
  };

  /* ---------- 申し込む ---------- */
  $("[data-submit]").addEventListener("click", async () => {
    const items = state.events.filter((e) => state.picked.has(eventId(e)));
    if (!items.length) return;
    const ok = await openSheet({
      k: "CONFIRM", title: `${items.length}件の日程に申し込みます`, items,
      note: "申し込むと、表示名とユーザーIDがこの日程の参加予定として記録されます。", ok: "申し込む",
    });
    if (!ok) return;
    busy(true);
    try {
      take(await api("apply", { events: items.map((e) => ({ id: eventId(e), label: labelOf(e) })) }));
      state.picked.clear();
      toast(`${items.length}件の申し込みを受け付けました`);
    } catch (err) {
      toast("申し込みできませんでした。時間をおいてもう一度お試しください。", true);
    }
    busy(false);
  });

  /* ---------- 取り消す ---------- */
  const askCancel = async (id) => {
    const e = state.events.find((x) => eventId(x) === id);
    if (!e) return;
    const ok = await openSheet({
      k: "CANCEL", title: "この日程の申込を取り消しますか？", items: [e],
      note: e.date === new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10)
        ? "当日の取り消しは「当日キャンセル」として記録に残ります。"
        : "取り消すと、この日程の申込の記録は削除されます。", ok: "取り消す", danger: true,
    });
    if (!ok) return;
    busy(true);
    try {
      take(await api("cancel", { eventId: id }));
      toast("申込を取り消しました");
    } catch (err) {
      toast("取り消しできませんでした。時間をおいてもう一度お試しください。", true);
    }
    busy(false);
  };

  /* ---------- はじめに ---------- */
  const showMe = (name, icon) => {
    $("[data-me-name]").textContent = name;
    const img = $("[data-me-icon]");
    if (icon) img.src = icon; else img.remove();
    $("[data-me]").hidden = false;
  };

  const fail = (msg) => {
    list.innerHTML = `<div class="empty is-bad"><b>読み込めませんでした</b><p>${esc(msg)}</p><button class="btn btn--sm" onclick="location.reload()">もう一度読み込む</button></div>`;
  };

  const start = async () => {
    if (DEMO) {
      $("[data-demo]").hidden = false;
      showMe("デモ表示", "");
    } else {
      await liff.init({ liffId: LIFF_ID });
      if (!liff.isLoggedIn()) { liff.login({ redirectUri: location.href }); return; }
      state.token = liff.getAccessToken();
      try { const p = await liff.getProfile(); showMe(p.displayName, p.pictureUrl); } catch (_) {}
    }
    take(await api("list"));
    /* サイトの「LINEで申し込む」から来たときは、その日程を選んだ状態にする */
    const pick = new URLSearchParams(location.search).get("pick");
    if (pick && state.events.some((e) => eventId(e) === pick) && !state.mine.has(pick)) state.picked.add(pick);
    render();
    const el = pick && $(`.ev[data-id="${CSS.escape(pick)}"]`);
    if (el) el.scrollIntoView({ block: "center" });
  };

  start().catch(() => fail("通信状況を確かめて、もう一度読み込んでください。"));
})();
