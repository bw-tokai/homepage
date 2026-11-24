/* 拝島ブルーウッド東海 — main.js */

/* ===== 練習日程（ここを書き換えると、カレンダー・一覧・トップの「次回」・申込フォームの選択肢がすべて更新されます） =====
   type は次の5種類から選びます:
     "solo"  = 単独練習会   "joint" = 合同練習会   "match" = 練習試合
     "game"  = 試合・大会   "event" = イベント
   title は省略できます（省略すると種類名が表示されます）。 */
const SCHEDULE = [
  { date: "2026-12-06", start: "18:00", end: "21:00", venue: "東海市民体育館", type: "solo" },
  { date: "2026-12-13", start: "13:00", end: "16:00", venue: "緑スポーツセンター", type: "joint", title: "他クラブとの合同練習会" },
  { date: "2026-12-19", start: "13:00", end: "16:00", venue: "アスカム", type: "match" },
  { date: "2026-12-27", start: "18:00", end: "21:00", venue: "東海市民体育館", type: "event", title: "練習納め・忘年会" },
  { date: "2027-01-10", start: "18:00", end: "21:00", venue: "東海市民体育館", type: "solo" },
  { date: "2027-01-24", start: "09:00", end: "17:00", venue: "会場未定", type: "game", title: "大会（詳細は後日お知らせ）" },
  { date: "2027-01-31", start: "13:00", end: "16:00", venue: "緑スポーツセンター", type: "joint" },
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
/* 見学・体験の申し込みを受け付ける種類（試合・大会とイベントは対象外） */
const OPEN_TYPES = ["solo", "joint", "match"];
const isOpen = (e) => OPEN_TYPES.includes(e.type);

const DOW_JA = ["日", "月", "火", "水", "木", "金", "土"];
const DOW_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const parse = (d) => { const [y, m, dd] = d.split("-").map(Number); return new Date(y, m - 1, dd); };
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- header / drawer / scroll helpers ---------- */
const header = $("#header");
const mbar = $(".mbar");
const totop = $(".totop");
const onScroll = () => {
  const y = scrollY;
  header.classList.toggle("is-solid", y > 40);
  const past = y > innerHeight * 0.8;
  mbar && mbar.classList.toggle("is-shown", past);
  totop && totop.classList.toggle("is-shown", past);
};
addEventListener("scroll", onScroll, { passive: true });
onScroll();

const burger = $("#burger");
const drawer = $("#drawer");
const setDrawer = (open) => {
  burger.setAttribute("aria-expanded", open);
  burger.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
  drawer.hidden = !open;
  document.body.style.overflow = open ? "hidden" : "";
  header.classList.toggle("is-solid", open || scrollY > 40);
};
burger.addEventListener("click", () => setDrawer(burger.getAttribute("aria-expanded") !== "true"));
$$("a", drawer).forEach((a) => a.addEventListener("click", () => setDrawer(false)));
addEventListener("keydown", (e) => { if (e.key === "Escape" && !drawer.hidden) setDrawer(false); });

/* ---------- hero slider ---------- */
(() => {
  const slides = $$(".hero__slide");
  const dots = $$(".hero__dots button");
  let i = 0, timer;
  const go = (n) => {
    slides[i].classList.remove("is-active"); dots[i].classList.remove("is-active");
    i = (n + slides.length) % slides.length;
    slides[i].classList.add("is-active");
    void dots[i].offsetWidth; dots[i].classList.add("is-active");
  };
  const play = () => { clearInterval(timer); if (!reduced) timer = setInterval(() => go(i + 1), 6000); };
  dots.forEach((d, n) => d.addEventListener("click", () => { go(n); play(); }));
  play();
})();

/* ---------- next practice card + countdown ---------- */
(() => {
  const now = new Date();
  const next = SCHEDULE.find((e) => new Date(`${e.date}T${e.end}:00+09:00`) > now) || SCHEDULE[SCHEDULE.length - 1];
  const d = parse(next.date);
  const card = $(".matchcard");
  $(".mm", card).textContent = String(d.getMonth() + 1).padStart(2, "0");
  $(".dd", card).textContent = String(d.getDate()).padStart(2, "0");
  $(".dw", card).textContent = DOW_EN[d.getDay()];
  const meta = $$(".matchcard__meta dd", card);
  meta[0].textContent = `${next.start} – ${next.end}`;
  meta[1].textContent = next.venue;
  meta[2].innerHTML = `<span class="tchip t-${next.type}">${typeLabel(next)}</span>${next.title ? ` ${next.title}` : ""}`;
  const box = $(".matchcard__count", card);
  const target = new Date(`${next.date}T${next.start}:00+09:00`);
  const tick = () => {
    const ms = Math.max(0, target - new Date());
    $("[data-d]", box).textContent = Math.floor(ms / 864e5);
    $("[data-h]", box).textContent = Math.floor((ms % 864e5) / 36e5);
  };
  tick(); setInterval(tick, 60000);
})();

/* ---------- news filter ---------- */
(() => {
  const tabs = $$(".news .tabs button");
  const items = $$(".newslist li");
  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach((x) => x.setAttribute("aria-selected", x === t));
    const f = t.dataset.filter;
    items.forEach((li) => (li.hidden = f !== "all" && li.dataset.cat !== f));
  }));
})();

/* ---------- calendar + upcoming list ---------- */
(() => {
  const grid = $("[data-cal-grid]");
  const title = $("[data-cal-month]");
  const prev = $("[data-prev]");
  const nextBtn = $("[data-next]");
  const list = $("[data-upcoming]");
  const byDate = Object.fromEntries(SCHEDULE.map((e) => [e.date, e]));
  const months = [...new Set(SCHEDULE.map((e) => e.date.slice(0, 7)))];
  let mi = 0;
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const renderList = () => {
    const ym = months[mi];
    list.innerHTML = SCHEDULE.filter((e) => e.date.startsWith(ym)).map((e) => {
      const d = parse(e.date);
      return `<li class="ev t-${e.type}" id="ev-${e.date}">
        <div class="ev__date"><b>${d.getMonth() + 1}/${d.getDate()}</b><span>${DOW_EN[d.getDay()]}</span></div>
        <div class="ev__info"><span class="tchip t-${e.type}">${typeLabel(e)}</span>${e.title ? `<b>${e.title}</b>` : ""}<p><span>${e.start}〜${e.end}</span><span>${e.venue}</span></p></div>
        ${isOpen(e) ? `<a class="ev__go" href="#join" data-date="${e.date}">この日に申し込む</a>` : `<span class="ev__st">メンバーのみ</span>`}
      </li>`;
    }).join("");
    $$(".ev__go", list).forEach((a) => a.addEventListener("click", () => {
      const sel = $("[data-date-select]"); sel.value = a.dataset.date;
    }));
  };

  const renderCal = () => {
    const [y, m] = months[mi].split("-").map(Number);
    title.textContent = `${y}.${String(m).padStart(2, "0")}`;
    const first = new Date(y, m - 1, 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    let html = DOW_EN.map((d) => `<div class="cal__dow" role="columnheader">${d.slice(0, 2)}</div>`).join("");
    for (let n = 0; n < 42; n++) {
      const d = new Date(start); d.setDate(start.getDate() + n);
      if (n >= 35 && d.getMonth() !== m - 1) break;
      const k = key(d);
      const ev = byDate[k];
      const out = d.getMonth() !== m - 1;
      const cls = ["cal__d", out && "is-out", ev && !out && `is-ev t-${ev.type}`].filter(Boolean).join(" ");
      html += ev && !out
        ? `<button class="${cls}" data-k="${k}" aria-label="${m}月${d.getDate()}日 ${typeLabel(ev)} ${titleOf(ev)} ${ev.start}から ${ev.venue}">${d.getDate()}</button>`
        : `<div class="${cls}">${d.getDate()}</div>`;
    }
    grid.innerHTML = html;
    $$("button.cal__d", grid).forEach((b) => b.addEventListener("click", () => {
      const li = $(`#ev-${b.dataset.k}`);
      $$(".ev", list).forEach((x) => x.classList.remove("is-focus"));
      li.classList.add("is-focus");
      li.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
    }));
    prev.disabled = mi === 0;
    nextBtn.disabled = mi === months.length - 1;
  };

  const legend = $("[data-cal-legend]");
  if (legend) legend.innerHTML = Object.entries(TYPES).map(([k, t]) => `<li><i class="lg t-${k}"></i>${t.label}</li>`).join("");

  const render = () => { renderCal(); renderList(); };
  prev.addEventListener("click", () => { if (mi > 0) { mi--; render(); } });
  nextBtn.addEventListener("click", () => { if (mi < months.length - 1) { mi++; render(); } });
  render();

  /* form date options */
  const sel = $("[data-date-select]");
  SCHEDULE.filter(isOpen).forEach((e) => {
    const d = parse(e.date);
    const o = document.createElement("option");
    o.value = e.date;
    o.textContent = `${d.getMonth() + 1}/${d.getDate()}（${DOW_JA[d.getDay()]}）${e.start}〜 ${typeLabel(e)}・${e.venue}`;
    sel.appendChild(o);
  });
})();

/* ---------- gallery lightbox ---------- */
(() => {
  const dlg = $("#lightbox");
  if (!dlg || !dlg.showModal) return;
  const img = $("img", dlg);
  $$(".g").forEach((g) => g.addEventListener("click", () => {
    img.src = g.dataset.full; img.alt = $("img", g).alt; dlg.showModal();
  }));
  $(".lightbox__close", dlg).addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
})();

/* ---------- team links prefill ---------- */
$$("[data-team]").forEach((a) => a.addEventListener("click", () => {
  const r = $(`input[name=team][value="${a.dataset.team}"]`); if (r) r.checked = true;
}));

/* ---------- multi-step form ---------- */
(() => {
  const form = $("#form");
  const steps = $$(".step", form);
  const marks = $$(".steps li", form);
  const show = (n) => {
    steps.forEach((s) => s.classList.toggle("is-active", s.dataset.step == n));
    marks.forEach((m, i) => { m.classList.toggle("is-current", i === n - 1); m.classList.toggle("is-done", i < n - 1); });
    $$(".err", form).forEach((e) => e.classList.remove("is-shown"));
  };
  const valid = (n) => {
    let ok = true;
    if (n === 1) {
      const team = $("input[name=team]:checked", form);
      const date = $("#f-date");
      date.classList.toggle("is-invalid", !date.value);
      ok = !!team && !!date.value;
    }
    if (n === 2) {
      const name = $("#f-name"), mail = $("#f-mail");
      name.classList.toggle("is-invalid", !name.value.trim());
      mail.classList.toggle("is-invalid", !mail.checkValidity() || !mail.value);
      ok = !!name.value.trim() && mail.checkValidity() && !!mail.value;
    }
    $(`[data-err="${n}"]`, form).classList.toggle("is-shown", !ok);
    return ok;
  };
  const fill = () => {
    const fd = new FormData(form);
    const dateOpt = $("#f-date").selectedOptions[0];
    const rows = [
      ["チーム", fd.get("team")], ["参加の方法", fd.get("type")], ["参加したい日", dateOpt ? dateOpt.textContent : ""],
      ["お名前", fd.get("name")], ["年齢", fd.get("age") || "—"], ["メール", fd.get("email")],
      ["ハンドボール歴", fd.get("exp")], ["メッセージ", fd.get("message") || "—"],
    ];
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    $("[data-confirm]", form).innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
  };
  $$("[data-go]", form).forEach((b) => b.addEventListener("click", () => {
    const to = Number(b.dataset.go);
    const cur = Number($(".step.is-active", form).dataset.step);
    if (to > cur && !valid(cur)) return;
    if (to === 3) fill();
    show(to);
    form.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    /* 公開時: ここで Googleフォーム / Formspree などへ送信する */
    steps.forEach((s) => (s.style.display = "none"));
    $(".steps", form).style.display = "none";
    $("[data-done]", form).hidden = false;
  });
})();
