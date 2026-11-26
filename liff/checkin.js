/* ブルーウッド東海 — 出席チェックイン（会場のQRコードから開く） */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DOW = ["日", "月", "火", "水", "木", "金", "土"];
  const params = new URLSearchParams(location.search);
  const DEMO = !GAS_URL || params.has("demo");
  const pad = (n) => String(n).padStart(2, "0");
  const jstToday = () => new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
  const at = (e, hm, min) => new Date(new Date(`${e.date}T${hm}:00+09:00`).getTime() + min * 6e4);
  const labelOf = (e) => {
    const [y, m, d] = e.date.split("-").map(Number);
    return `${m}/${d}（${DOW[new Date(y, m - 1, d).getDay()]}）${titleOf(e)}【${teamLabel(e)}】${e.venue}`;
  };

  /* 今チェックインできる予定（開始の少し前〜終了の少し後） */
  const findToday = () => {
    const today = jstToday();
    const evs = SCHEDULE.filter((e) => e.date === today);
    const now = new Date();
    const open = evs.find((e) => e.allDay || (now >= at(e, e.start, -CHECKIN_EARLY) && now <= at(e, e.end, CHECKIN_LATE)));
    return { open, todays: evs };
  };

  /* ---------- 通信 ---------- */
  const demo = { dates: [] };
  if (DEMO) {
    const n = Math.min(60, Number(params.get("n") ?? 4));
    const base = new Date("2026-08-01T12:00:00+09:00");
    for (let i = 0; i < n; i++) demo.dates.push(new Date(base.getTime() + i * 7 * 864e5).toISOString().slice(0, 10));
  }
  let token = "";
  const api = async (action, body = {}) => {
    if (DEMO) {
      await new Promise((r) => setTimeout(r, 500));
      const today = body.event ? body.event.id.slice(0, 10) : "";
      let added = false;
      if (action === "checkin" && !demo.dates.includes(today)) { demo.dates.push(today); added = true; }
      return { ok: true, count: demo.dates.length, dates: [...demo.dates], checkedToday: demo.dates.includes(jstToday()), added };
    }
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, accessToken: token, ...body }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "error");
    return data;
  };

  /* ---------- 表示 ---------- */
  const stamp = (date, big) => {
    const [, m, d] = date.split("-");
    return `<span class="stamp${big ? " stamp--big" : ""}" aria-hidden="true">
      <svg viewBox="0 0 100 100"><defs><path id="ring${big ? "b" : ""}" d="M50 50m-37 0a37 37 0 1 1 74 0a37 37 0 1 1-74 0"/></defs>
        <circle cx="50" cy="50" r="46" class="s1"/><circle cx="50" cy="50" r="29" class="s2"/>
        <text class="sr"><textPath href="#ring${big ? "b" : ""}" startOffset="0">BLUEWOOD TOKAI ★ HANDBALL CLUB ★</textPath></text>
        <text x="50" y="47" class="sd">${m}.${d}</text><text x="50" y="62" class="sk2">PRESENT</text>
      </svg></span>`;
  };

  const renderCard = (dates) => {
    const count = dates.length;
    const card = count && count % STAMP_CARD === 0 ? count / STAMP_CARD - 1 : Math.floor(count / STAMP_CARD);
    const from = card * STAMP_CARD;
    const sorted = [...dates].sort();
    let html = "";
    for (let i = 0; i < STAMP_CARD; i++) {
      const no = from + i + 1;
      const rw = REWARDS.find((r) => r.at === no);
      const date = sorted[from + i];
      html += `<li class="cell${date ? " is-on" : ""}${rw ? " is-gift" : ""}${date && date === lastAdded ? " is-new" : ""}">
        ${date ? stamp(date) : `<span class="cell__no">${no}</span>`}
        ${rw ? `<span class="cell__gift" title="${esc(rw.label)}"><svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="10" rx="1"/><path d="M3 7h18v3H3zM12 7v13M12 7c-1.5-3-5-3.5-5-1s5 1 5 1zm0 0c1.5-3 5-3.5 5-1s-5 1-5 1z"/></svg></span>` : ""}
      </li>`;
    }
    $("[data-grid]").innerHTML = html;
    $("[data-card-no]").textContent = `No.${card + 1}`;
    $("[data-total]").textContent = count;
    const next = REWARDS.filter((r) => r.at > count).sort((a, b) => a.at - b.at)[0];
    $("[data-next]").innerHTML = next
      ? `次の特典「<b>${esc(next.label)}</b>」まで あと<em>${next.at - count}</em>回`
      : `すべての特典を達成しました。いつもありがとうございます。`;
    $("[data-rewards]").innerHTML = [...REWARDS].sort((a, b) => a.at - b.at).map((r) => {
      const got = count >= r.at;
      return `<li class="${got ? "is-got" : ""}"><b>${r.at}<small>回</small></b><span>${esc(r.label)}</span><em>${got ? "達成" : `あと${r.at - count}回`}</em></li>`;
    }).join("");
  };

  const result = (kind, title, text, date) => {
    $("[data-result]").innerHTML = `<div class="res res--${kind}">
      ${date ? stamp(date, true) : `<span class="res__icon" aria-hidden="true"></span>`}
      <div><p class="res__k">${kind === "ok" ? "CHECKED IN" : kind === "done" ? "ALREADY CHECKED IN" : kind === "bad" ? "ERROR" : "NO SESSION"}</p>
      <h2>${esc(title)}</h2><p>${text}</p></div>
    </div>`;
  };

  let lastAdded = "";

  const showMe = (name, icon) => {
    $("[data-me-name]").textContent = name;
    const img = $("[data-me-icon]");
    if (icon) img.src = icon; else img.remove();
    $("[data-me]").hidden = false;
  };

  const start = async () => {
    if (DEMO) {
      $("[data-demo]").hidden = false;
      showMe("デモ表示", "");
    } else {
      await liff.init({ liffId: LIFF_ID });
      if (!liff.isLoggedIn()) { liff.login({ redirectUri: location.href }); return; }
      token = liff.getAccessToken();
      try { const p = await liff.getProfile(); showMe(p.displayName, p.pictureUrl); } catch (_) {}
    }

    let { open, todays } = findToday();
    if (DEMO && !open && !params.has("none")) open = { ...(SCHEDULE[0] || {}), date: jstToday() };

    if (!open) {
      const data = await api("stamps");
      renderCard(data.dates);
      if (todays.length) {
        const e = todays[0];
        result("none", "まだチェックインの時間ではありません", `本日の${esc(titleOf(e))}は${esc(timeText(e))}です。開始の${CHECKIN_EARLY}分前から、終了の${CHECKIN_LATE}分後までチェックインできます。`);
      } else {
        result("none", "今日は予定がありません", "チェックインは練習・試合の当日に、会場のQRコードから行えます。");
      }
      return;
    }

    const data = await api("checkin", { event: { id: eventId(open), label: labelOf(open) } });
    const today = open.date;
    if (data.added) {
      lastAdded = today;
      renderCard(data.dates);
      result("ok", "出席を記録しました", `${esc(titleOf(open))}・${esc(open.venue)}<br>通算<b>${data.count}</b>回目の出席です。今日もよろしくお願いします。`, today);
      const rw = REWARDS.find((r) => r.at === data.count);
      if (rw) result("ok", `特典「${rw.label}」を獲得！`, `通算<b>${data.count}</b>回目の出席です。スタッフにこの画面を見せて受け取ってください。`, today);
    } else {
      renderCard(data.dates);
      result("done", "今日はチェックイン済みです", `出席は1日1回まで記録されます。通算<b>${data.count}</b>回の出席です。`, today);
    }
  };

  start().catch(() => result("bad", "記録できませんでした", "通信状況を確かめて、もう一度QRコードを読み取ってください。"));
})();
