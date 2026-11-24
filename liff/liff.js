/* 拝島ブルーウッド東海 — LINE参加申込ページ */
(() => {
  /* LINEのページでは対象を「一般男子」「一般女子」と表示する */
  TEAMS.men = "一般男子";
  TEAMS.women = "一般女子";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DOW = ["日", "月", "火", "水", "木", "金", "土"];
  const DOW_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const MON_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const parse = (d) => { const [y, m, dd] = d.split("-").map(Number); return new Date(y, m - 1, dd); };
  const params = new URLSearchParams(location.search);
  const DEMO = !GAS_URL || params.has("demo");

  const state = { events: [], counts: {}, mine: new Set(), picked: new Set(), filter: "all", busy: false, token: "", member: null, loaded: false };

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
  const demoDb = { counts: {}, mine: new Set(), member: null, loaded: false };
  state.events.forEach((e, i) => (demoDb.counts[eventId(e)] = [6, 9, 4, 12, 7, 3, 8][i % 7]));

  const api = async (action, body = {}) => {
    if (DEMO) {
      await new Promise((r) => setTimeout(r, 450));
      if (action === "apply") body.events.forEach((ev) => { if (!demoDb.mine.has(ev.id)) { demoDb.mine.add(ev.id); demoDb.counts[ev.id] = (demoDb.counts[ev.id] || 0) + 1; } });
      if (action === "cancel" && demoDb.mine.delete(body.eventId)) demoDb.counts[body.eventId]--;
      if (action === "register") demoDb.member = { ...body.member };
      return { ok: true, counts: { ...demoDb.counts }, mine: [...demoDb.mine], member: demoDb.member };
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
    state.member = data.member || null;
    $("[data-edit-member]").hidden = !state.member;
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
          <p class="ev__count"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.4 3-5.2 6-5.2s5.4 1.8 6 5.2"/><circle cx="17" cy="9" r="2.4"/><path d="M16.4 13.9c2.3.2 4 1.6 4.6 4.1"/></svg>参加予定 ${state.loaded ? `<b>${n}</b>` : `<b class="ld" aria-label="読み込み中">–</b>`}人</p>
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
    $("[data-submit]").disabled = !n || state.busy || !state.loaded;
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
    if (!state.member) {
      /* 初回は「登録して申し込む」で登録と申込をまとめて行う */
      if (!(await openReg(true, items))) return;
      return doApply(items);
    }
    const ok = await openSheet({
      k: "CONFIRM", title: `${items.length}件の日程に申し込みます`, items,
      note: "申し込むと、登録した名前でこの日程の参加予定として記録されます。", ok: "申し込む",
    });
    if (!ok) return;
    doApply(items);
  });

  const doApply = async (items) => {
    busy(true);
    try {
      take(await api("apply", { events: items.map((e) => ({ id: eventId(e), label: labelOf(e) })) }));
      state.picked.clear();
      toast(`${items.length}件の申し込みを受け付けました`);
    } catch (err) {
      toast("申し込みできませんでした。時間をおいてもう一度お試しください。", true);
    }
    busy(false);
  };

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

  /* ---------- 登録情報（初回だけ） ---------- */
  const reg = $("[data-reg]");
  const form = $("[data-reg-form]");
  let regDone = null;
  const today = new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);
  const bIn = { y: form.by, m: form.bm };
  const digits = (el) => el.value.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\D/g, "");
  /* 数字を打つと次の欄へ自動で進む */
  bIn.y.addEventListener("input", () => {
    bIn.y.value = digits(bIn.y).slice(0, 4);
    if (bIn.y.value.length === 4) bIn.m.focus();
  });
  bIn.m.addEventListener("input", () => { bIn.m.value = digits(bIn.m).slice(0, 2); });
  /* 生年月（"1990-04" の形） */
  const birthOf = () => {
    const y = Number(digits(bIn.y)), m = Number(digits(bIn.m));
    if (String(y).length !== 4 || m < 1 || m > 12) return "";
    return `${y}-${String(m).padStart(2, "0")}`;
  };
  const openReg = (first, items) => {
    $("[data-reg-title]").textContent = first ? "はじめに、あなたのことを教えてください" : "登録情報の確認・変更";
    $("[data-reg-lead]").textContent = first ? "初めての申し込みのときだけ入力します。次回からは日程を選ぶだけです。" : "内容を変えて「保存する」を押してください。";
    $("[data-reg-ok]").textContent = first ? (items && items.length > 1 ? `登録して${items.length}件に申し込む` : "登録して申し込む") : "保存する";
    const m = state.member || {};
    form.last.value = m.last || "";
    form.first.value = m.first || "";
    const [by, bm] = (m.birth || "").split("-");
    bIn.y.value = by || ""; bIn.m.value = bm ? String(Number(bm)) : "";
    $$("input[name=gender]", form).forEach((r) => (r.checked = r.value === m.gender));
    $$("input[name=career]", form).forEach((r) => (r.checked = r.value === m.career));
    $("[data-reg-err]").hidden = true;
    $$(".is-invalid", form).forEach((el) => el.classList.remove("is-invalid"));
    reg.hidden = false;
    requestAnimationFrame(() => reg.classList.add("is-open"));
    return new Promise((r) => (regDone = r));
  };
  const closeReg = (v) => {
    reg.classList.remove("is-open");
    setTimeout(() => (reg.hidden = true), 250);
    if (regDone) { regDone(v); regDone = null; }
  };
  $$("[data-reg-close]").forEach((b) => b.addEventListener("click", () => closeReg(false)));
  $("[data-edit-member]").addEventListener("click", async () => {
    if (await openReg(false)) toast("登録情報を保存しました");
  });
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const m = {
      last: form.last.value.trim(),
      first: form.first.value.trim(),
      birth: birthOf(),
      gender: (form.querySelector("input[name=gender]:checked") || {}).value || "",
      career: (form.querySelector("input[name=career]:checked") || {}).value || "",
    };
    m.name = `${m.last} ${m.first}`.trim(); /* 前のApps Script向け（姓と名を空白でつないだ名前） */
    const badBirth = !m.birth || m.birth > thisMonth || m.birth < "1920-01";
    form.last.classList.toggle("is-invalid", !m.last);
    form.first.classList.toggle("is-invalid", !m.first);
    const noName = !m.last || !m.first;
    $("[data-birth]", form).classList.toggle("is-invalid", badBirth);
    $(".reg__seg", form).classList.toggle("is-invalid", !m.gender);
    $(".reg__chips", form).classList.toggle("is-invalid", !m.career);
    if (noName || badBirth || !m.gender || !m.career) {
      $("[data-reg-err]").textContent = !noName && m.gender && m.career && badBirth
        ? "生年月を正しく入力してください（例：1990年4月）。"
        : "未入力の項目があります。すべて入力してください。";
      $("[data-reg-err]").hidden = false;
      return;
    }
    const btn = $("[data-reg-ok]");
    btn.disabled = true;
    try {
      take(await api("register", { member: m }));
      render();
      closeReg(true);
    } catch (err) {
      toast("保存できませんでした。時間をおいてもう一度お試しください。", true);
    }
    btn.disabled = false;
  });

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
    /* 日程はこのページの中にあるので、通信を待たずにすぐ表示する */
    const pick = new URLSearchParams(location.search).get("pick");
    if (pick && state.events.some((e) => eventId(e) === pick)) state.picked.add(pick);
    render();
    if (DEMO) {
      $("[data-demo]").hidden = false;
      showMe("デモ表示", "");
    } else {
      await liff.init({ liffId: LIFF_ID });
      if (!liff.isLoggedIn()) { liff.login({ redirectUri: location.href }); return; }
      state.token = liff.getAccessToken();
      liff.getProfile().then((p) => showMe(p.displayName, p.pictureUrl)).catch(() => {});
    }
    /* 人数と申込済みの日程はあとから反映する */
    take(await api("list"));
    state.loaded = true;
    render();
    const el = pick && $(`.ev[data-id="${CSS.escape(pick)}"]`);
    if (el) el.scrollIntoView({ block: "center" });
  };

  start().catch(() => fail("通信状況を確かめて、もう一度読み込んでください。"));
})();
