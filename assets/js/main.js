/* 拝島ブルーウッド東海 — main.js */

/* 練習日程は assets/js/schedule.js にあります */

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
  const next = SCHEDULE.find((e) => new Date(`${e.date}T${endOf(e)}:00+09:00`) > now) || SCHEDULE[SCHEDULE.length - 1];
  const d = parse(next.date);
  const card = $(".matchcard");
  $(".mm", card).textContent = String(d.getMonth() + 1).padStart(2, "0");
  $(".dd", card).textContent = String(d.getDate()).padStart(2, "0");
  $(".dw", card).textContent = DOW_EN[d.getDay()];
  const meta = $$(".matchcard__meta dd", card);
  meta[0].textContent = timeText(next, " – ");
  meta[1].textContent = next.venue;
  meta[2].innerHTML = `<span class="tchip t-${next.type}">${typeLabel(next)}</span>${next.title ? ` ${next.title}` : ""}`;
  meta[3].textContent = teamLabel(next);
  $$("[data-next-text]").forEach((el) => {
    el.textContent = `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${DOW_EN[d.getDay()]} ${next.allDay ? "" : next.start + " "}${next.venue}（${teamLabel(next)}）`;
  });
  const box = $(".matchcard__count", card);
  const target = new Date(`${next.date}T${startOf(next)}:00+09:00`);
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
        <div class="ev__info"><span class="tchip t-${e.type}">${typeLabel(e)}</span><span class="teamchip team-${e.team || "all"}">${teamLabel(e)}</span>${e.title ? `<b>${e.title}</b>` : ""}<p><span>${timeText(e)}</span><span>${e.venue}</span></p></div>
        <a class="ev__go" href="${FRIEND_URL}" target="_blank" rel="noopener">LINEで申し込む</a>
      </li>`;
    }).join("");
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
        ? `<button class="${cls}" data-k="${k}" aria-label="${m}月${d.getDate()}日 ${typeLabel(ev)} ${titleOf(ev)} ${teamLabel(ev)} ${ev.allDay ? "終日" : ev.start + "から"} ${ev.venue}">${d.getDate()}</button>`
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

/* ---------- LINE申込への導線 ---------- */
$$("[data-friend]").forEach((a) => (a.href = FRIEND_URL));
