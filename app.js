(function(){
  "use strict";
  const DATA = window.WEEKLY_DATA;
  const main = document.getElementById("main");
  if(!DATA || !Array.isArray(DATA.weeks) || !DATA.weeks.length){
    main.innerHTML = '<p style="padding:60px 0">data.js 未加载或格式不正确。</p>';
    return;
  }

  const SITE = DATA.site || {};
  const WEEKS = DATA.weeks;
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt = n => {
    n = Number(n) || 0;
    if(n >= 100000000) return (n/100000000).toFixed(1).replace(/\.0$/,"") + "亿";
    if(n >= 10000) return (n/10000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/,"") + "万";
    return String(n);
  };
  const videoUrl = bvid => "https://www.bilibili.com/video/" + bvid;
  const ACCENTS = { livelihood:"#c2542c", world:"#2f5d62", science:"#3b4c8a", culture:"#9b3b63" };

  const ICONS = {
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l12-7.5z"/></svg>'
  };

  let current = null;
  let index = {};
  let observer = null;

  const weekSelect = $("#weekSelect");
  const prevBtn = $("#prevWeek");
  const nextBtn = $("#nextWeek");
  const search = $("#search");
  const resultCount = $("#resultCount");
  const empty = $("#empty");

  // ---------- toast / copy ----------
  let toastTimer;
  const toast = (msg) => {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1900);
  };
  async function copyText(text, okMsg="已复制"){
    try{
      await navigator.clipboard.writeText(text);
      toast(okMsg);
    }catch(e){
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try{ document.execCommand("copy"); toast(okMsg); }catch(_){ toast("复制失败，请手动选择"); }
      ta.remove();
    }
  }

  // ---------- render ----------
  function cardHTML(it, accent){
    const v = it.video || {};
    const comments = (it.comments || []).map(c => `
      <blockquote class="comment">
        <p>${esc(c.t)}</p>
        <footer><span>@${esc(c.u)}</span><span class="heart">♥</span><span>${fmt(c.like)}</span></footer>
      </blockquote>`).join("");
    const tags = (it.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("");
    const searchText = [it.title, it.summary, it.angle, (it.tags||[]).join(" "), it.sourceType, v.author].join(" ").toLowerCase();
    return `
    <article class="card" data-id="${esc(it.id)}" data-text="${esc(searchText)}" style="--accent:${accent}">
      <div class="card-top">
        <span class="badge">${esc(it.sourceType)}</span>
        <span class="date">${esc(it.date)}</span>
        ${it.carryOver ? '<span class="carry">沿用</span>' : ''}
        <button class="copy-card" data-copy-card="${esc(it.id)}" title="复制这条素材" aria-label="复制这条素材">${ICONS.copy}</button>
      </div>
      <h3>${esc(it.title)}</h3>
      <p class="summary">${esc(it.summary)}</p>
      <a class="video" href="${videoUrl(v.bvid)}" target="_blank" rel="noopener noreferrer" title="在 B 站打开：${esc(v.title || it.title)}">
        <span class="play">${ICONS.play}</span>
        <span class="vmeta">
          <span class="vtitle">${esc(v.title || it.title)}</span>
          <span class="vsub">B站 · <em>${esc(v.author)}</em> · 播放 ${fmt(v.play)} · 评论 ${fmt(v.reply)}${v.note ? " · " + esc(v.note) : ""}</span>
        </span>
        <span class="go">↗</span>
      </a>
      <div class="comments">
        <div class="c-head">评论区精选</div>
        ${comments || '<blockquote class="comment"><p>该视频暂未抓到高赞评论。</p></blockquote>'}
      </div>
      <div class="card-foot">
        <div class="tags">${tags}</div>
        <div class="angle"><b>演讲切口</b>${esc(it.angle)}</div>
      </div>
    </article>`;
  }

  function render(week){
    const stats = { videos:0, comments:0, views:0 };
    week.sections.forEach(sec => (sec.items || []).forEach(it => {
      stats.videos++;
      stats.comments += (it.comments || []).length;
      stats.views += it.video?.play || 0;
    }));
    $("#statVideos").textContent = stats.videos;
    $("#statComments").textContent = stats.comments;
    $("#statViews").textContent = fmt(stats.views);

    $("#lede").textContent = SITE.intro || "";
    let meta = `${week.range} · 更新于 ${week.updated} · ${week.editorial ? "编辑精选" : "自动采集"} · 视频与评论来自 B 站公开数据`;
    $("#heroMeta").textContent = meta;

    const note = $("#weekNote");
    const notes = [];
    if(week.report?.carriedOver) notes.push(`${week.report.carriedOver} 条素材沿用上周`);
    (week.report?.warnings || []).forEach(w => notes.push(w));
    if(notes.length){ note.textContent = "数据说明：" + notes.join("；"); note.classList.add("show"); }
    else { note.textContent = ""; note.classList.remove("show"); }

    document.title = `${SITE.title || "每周热点素材库"} · ${week.label}`;
    $("#footWeek").textContent = `WEEKLY BRIEF · ${week.label} · ${week.range}`;
    $("#footTime").textContent = week.updated;

    main.innerHTML = week.sections.map(sec => {
      const accent = ACCENTS[sec.id] || "#c2542c";
      const cards = (sec.items || []).map(it => cardHTML(it, accent)).join("");
      return `
      <section class="section" id="${esc(sec.id)}" style="--accent:${accent}">
        <div class="sec-head">
          <div class="sec-no">${esc(sec.no)}</div>
          <div>
            <h2 class="sec-title">${esc(sec.title)}<span>${esc(sec.en)}</span></h2>
            <p class="sec-note">${esc(sec.note)}</p>
          </div>
          <button class="copy-sec" data-copy-section="${esc(sec.id)}">复制本区素材</button>
        </div>
        <div class="grid">${cards}</div>
      </section>`;
    }).join("");

    index = {};
    week.sections.forEach(sec => (sec.items || []).forEach(it => index[it.id] = { it, sec }));

    if(observer) observer.disconnect();
    observer = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if(en.isIntersecting){
          $$(".nav-link").forEach(l => l.classList.toggle("active", l.dataset.target === en.target.id));
        }
      });
    }, { rootMargin: "-25% 0px -62% 0px", threshold: 0 });
    week.sections.forEach(sec => {
      const el = document.getElementById(sec.id);
      if(el) observer.observe(el);
    });
  }

  // ---------- week switching ----------
  function updateURL(id, keepHash){
    const url = new URL(location.href);
    url.searchParams.set("week", id);
    if(!keepHash) url.hash = "";
    try{ history.replaceState({}, "", url); }catch(e){}
  }

  function updateArrows(){
    const i = WEEKS.indexOf(current);
    if(prevBtn) prevBtn.disabled = i >= WEEKS.length - 1;
    if(nextBtn) nextBtn.disabled = i <= 0;
  }

  function selectWeek(id, opts={}){
    const week = WEEKS.find(w => w.id === id) || WEEKS[0];
    current = week;
    if(weekSelect) weekSelect.value = week.id;
    render(week);
    updateArrows();
    if(search) search.value = "";
    applyFilter();
    $$(".nav-link").forEach((l, i) => l.classList.toggle("active", i === 0));
    if(opts.scrollTop !== false) window.scrollTo({ top: 0, behavior: "auto" });
    if(opts.updateUrl !== false) updateURL(week.id, !!opts.keepHash);
  }

  // ---------- search ----------
  function applyFilter(){
    const q = (search?.value || "").trim().toLowerCase();
    let shown = 0;
    (current?.sections || []).forEach(sec => {
      const sectionEl = document.getElementById(sec.id);
      if(!sectionEl) return;
      const cards = $$(".card", sectionEl);
      let local = 0;
      cards.forEach(c => {
        const hit = !q || c.dataset.text.includes(q);
        c.classList.toggle("hide", !hit);
        if(hit){ local++; shown++; }
      });
      sectionEl.style.display = local ? "" : "none";
      const grid = $(".grid", sectionEl);
      if(grid) grid.style.display = local ? "" : "none";
    });
    empty.classList.toggle("show", shown === 0);
    resultCount.textContent = q ? shown + " 条" : "";
  }

  // ---------- copy payloads ----------
  function cardText(it){
    const v = it.video || {};
    return [
      "【" + it.title + "】",
      "概括：" + it.summary,
      "视频：" + v.title + "（" + v.author + "）" + videoUrl(v.bvid),
      "演讲切口：" + it.angle,
      "标签：" + (it.tags || []).join(" / ")
    ].join("\n");
  }
  function sectionText(sec){
    const head = "【" + sec.title + "】" + current.label + " " + current.range;
    const body = sec.items.map((it, i) => (i+1) + ". " + it.title + "\n概括：" + it.summary + "\n视频：" + videoUrl(it.video.bvid) + "\n切口：" + it.angle).join("\n\n");
    return head + "\n\n" + body;
  }

  // ---------- bindings ----------
  document.addEventListener("click", (e) => {
    const cardBtn = e.target.closest("[data-copy-card]");
    if(cardBtn){
      const rec = index[cardBtn.dataset.copyCard];
      if(rec) copyText(cardText(rec.it), "这条素材已复制");
      return;
    }
    const secBtn = e.target.closest("[data-copy-section]");
    if(secBtn){
      const sec = current.sections.find(s => s.id === secBtn.dataset.copySection);
      if(sec) copyText(sectionText(sec), sec.title + " 素材已复制");
    }
  });

  search?.addEventListener("input", applyFilter);
  weekSelect?.addEventListener("change", () => selectWeek(weekSelect.value));
  prevBtn?.addEventListener("click", () => {
    const i = WEEKS.indexOf(current);
    if(i < WEEKS.length - 1) selectWeek(WEEKS[i + 1].id);
  });
  nextBtn?.addEventListener("click", () => {
    const i = WEEKS.indexOf(current);
    if(i > 0) selectWeek(WEEKS[i - 1].id);
  });
  $("#shareBtn")?.addEventListener("click", () => copyText(location.href, "本期链接已复制"));

  // scroll progress / back to top
  const progress = $("#progress"), totop = $("#totop");
  function onScroll(){
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? (h.scrollTop / max) * 100 : 0;
    progress.style.width = p + "%";
    totop.classList.toggle("show", h.scrollTop > 700);
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  totop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  // theme
  const themeBtn = $("#themeBtn");
  const saved = (() => { try{ return localStorage.getItem("wb-theme"); }catch(e){ return null; } })();
  if(saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)){
    document.documentElement.dataset.theme = "dark";
  }
  themeBtn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try{ localStorage.setItem("wb-theme", next); }catch(e){}
  });

  $("#printBtn").addEventListener("click", () => window.print());

  // keyboard
  document.addEventListener("keydown", (e) => {
    if(e.target.matches("input, textarea, select")) return;
    if(e.key === "/"){ e.preventDefault(); search?.focus(); }
    const map = { "1":"livelihood", "2":"world", "3":"science", "4":"culture" };
    if(map[e.key]){ document.getElementById(map[e.key])?.scrollIntoView({ behavior:"smooth" }); }
  });

  // ---------- init ----------
  const params = new URLSearchParams(location.search);
  if(params.get("theme") === "dark") document.documentElement.dataset.theme = "dark";

  weekSelect.innerHTML = WEEKS.map((w, i) =>
    `<option value="${esc(w.id)}">${esc(w.label)}${i === 0 ? " · 最新" : ""}</option>`
  ).join("");

  const initialId = params.get("week");
  selectWeek(initialId || WEEKS[0].id, { scrollTop: false, keepHash: true });

  requestAnimationFrame(() => {
    if(location.hash){
      const el = document.querySelector(location.hash);
      if(el){
        const html = document.documentElement;
        const prev = html.style.scrollBehavior;
        html.style.scrollBehavior = "auto";
        el.scrollIntoView({ block: "start" });
        html.style.scrollBehavior = prev;
      }
    }
  });
})();
