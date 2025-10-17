// helpers
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

// Splash
setTimeout(()=> { $("#splash").style.display="none"; }, 1800);

// i18n
const langSelect = $("#langSelect");
let LANG = localStorage.getItem("alitv_lang") || "ar";
langSelect.value = LANG;
applyI18n();
langSelect.onchange = ()=> { LANG = langSelect.value; localStorage.setItem("alitv_lang", LANG); applyI18n(); };

function t(k){ return (window.I18N[LANG] || window.I18N.ar)[k] || k; }
function applyI18n(){
  $$("[data-i18n]").forEach(el=> el.textContent = t(el.dataset.i18n));
  $$("[data-i18n-placeholder]").forEach(el=> el.placeholder = t(el.dataset.i18nPlaceholder));
}

// Tabs
function activate(tab){
  $$(".tab-btn").forEach(b=> b.classList.toggle("active", b.dataset.tab===tab));
  $$(".tab-section").forEach(s=> s.classList.toggle("hidden", !s.id.endsWith(tab)));
  if (tab==="trending") $("#hero").classList.remove("hidden"); else $("#hero").classList.add("hidden");
}
$$(".tab-btn").forEach(btn=> btn.onclick = ()=> activate(btn.dataset.tab));
activate("trending");

// Modal
function openModal(html){ $("#modalContent").innerHTML = html; $("#modal").classList.remove("hidden"); }
$("#closeModal").onclick = ()=> $("#modal").classList.add("hidden");

// Favorites & progress
const favKey = "alitv_favs";
const progKey = "alitv_progress";
const favs = new Set(JSON.parse(localStorage.getItem(favKey) || "[]"));
const progress = JSON.parse(localStorage.getItem(progKey) || "{}");
function toggleFav(id){ if (favs.has(id)) favs.delete(id); else favs.add(id); localStorage.setItem(favKey, JSON.stringify([...favs])); }
function saveProgress(id, seconds){ progress[id] = { t: Date.now(), seconds }; localStorage.setItem(progKey, JSON.stringify(progress)); }

// EPG preset
const epgSelect = $("#epgSelect");
const EPG_SRC = ()=> epgSelect.value || "https://iptv-org.github.io/epg/guides/sa-ar.xml";
epgSelect.onchange = ()=> localStorage.setItem("alitv_epg", epgSelect.value);
epgSelect.value = localStorage.getItem("alitv_epg") || epgSelect.value;

// Search
$("#searchInput").addEventListener("input", (e)=>{
  const q = e.target.value.toLowerCase();
  const cards = $$("#grid-livetv .card, #grid-trending .card, #grid-movies .card, #grid-series .card");
  cards.forEach(c => {
    const txt = (c.querySelector(".meta")?.innerText || "").toLowerCase();
    c.style.display = txt.includes(q) ? "" : "none";
  });
});

// TMDB
async function loadTrending(type="movie"){
  const res = await fetch(`${API_BASE}/api/tmdb/trending?type=${type}`);
  const data = await res.json();
  const results = data.results || [];
  const grid = $("#grid-trending"); grid.innerHTML = "";
  results.forEach(item => grid.appendChild(makeTmdbCard(item)));

  const track = $("#carousel-track"); track.innerHTML = "";
  results.slice(0,8).forEach(item=>{
    const bg = item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
             : item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "";
    const p = document.createElement("div"); p.className="poster"; p.style.backgroundImage=`url('${bg}')`; p.innerHTML=`<div class="meta">${item.title||item.name||""}</div>`;
    p.onclick = ()=> showMoreInfo(item);
    track.appendChild(p);
  });
  $("#watchNow").onclick = ()=> results[0] && openTrailer(results[0]);
  $("#moreInfo").onclick = ()=> results[0] && showMoreInfo(results[0]);
}
$$(".pill").forEach(p=> p.onclick = ()=>{ $$(".pill").forEach(x=>x.classList.remove("active")); p.classList.add("active"); loadTrending(p.dataset.type); });
loadTrending("movie");

function makeTmdbCard(item){
  const el = document.createElement("div"); el.className="card";
  const img = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "";
  const id = `${item.media_type || (item.title ? "movie":"tv")}:${item.id}`;
  const active = favs.has(id) ? " active" : "";
  el.innerHTML = `<div class="thumb" style="background-image:url('${img}')"></div>
    <div class="meta"><span>${item.title||item.name||"—"}</span><button class="fav${active}">★</button></div>`;
  el.onclick = (e)=>{
    if (e.target.classList.contains("fav")){ e.stopPropagation(); e.target.classList.toggle("active"); toggleFav(id); }
    else showMoreInfo(item);
  };
  return el;
}

async function showMoreInfo(item){
  const type = item.media_type || (item.title ? "movie":"tv");
  const ep = type === "movie" ? "movie":"tv";
  const res = await fetch(`${API_BASE}/api/tmdb/${ep}/${item.id}`);
  const j = await res.json(); const d = j.detail;
  const img = d.backdrop_path || d.poster_path ? `https://image.tmdb.org/t/p/w780${d.backdrop_path || d.poster_path}` : "";
  const title = d.title || d.name || ""; const year = (d.release_date || d.first_air_date || "").slice(0,4);
  const rating = (d.vote_average || 0).toFixed(1); const genres = (d.genres||[]).map(g=>g.name).join(", ");
  const cast = (j.credits?.cast||[]).slice(0,8).map(c=>`<div class="cast">${c.name}<br/><small>${c.character||""}</small></div>`).join("");
  const similar = (j.similar?.results||[]).slice(0,8).map(s=>{
    const simImg = s.poster_path ? `https://image.tmdb.org/t/p/w342${s.poster_path}` : "";
    return `<div class="tile"><div class="thumb" style="background-image:url('${simImg}')"></div><div class="caption">${s.title||s.name||""}</div></div>`;
  }).join("");

  const q = encodeURIComponent(title);
  const freeLinks = `
    <a class="btn" target="_blank" href="https://publicdomainmovies.net/?s=${q}">PublicDomainMovies</a>
    <a class="btn" target="_blank" href="https://archive.org/search?query=${q}+AND+mediatype%3Amovies">Archive.org</a>
    <a class="btn" target="_blank" href="https://www.youtube.com/results?search_query=${q}+full+movie">YouTube</a>`;

  openModal(`
    <h2>${title} ${year?`<small>(${year})</small>`:""}</h2>
    ${img?`<img src="${img}" alt="${title}"/>`:""}
    <div class="meta-row"><span>⭐ ${rating}</span>${genres?`<span>• ${genres}</span>`:""}</div>
    <p style="opacity:.85">${d.overview || ""}</p>
    ${cast?`<h3>Cast</h3><div class="cast-row">${cast}</div>`:""}
    ${similar?`<h3>Similar</h3><div class="similar-grid">${similar}</div>`:""}
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" onclick="window.open('https://www.youtube.com/watch?v=${(j.videos?.results||[]).find(v=>v.site==='YouTube'&&(v.type==='Trailer'||v.type==='Teaser'))?.key||''}','_blank')">▶ ${t('watchNow')}</button>
      <span style="opacity:.8">${t('freeWatch')}:</span> ${freeLinks}
    </div>
  `);
}

async function openTrailer(item){
  const type = item.media_type || (item.title? "movie":"tv");
  const ep = type==="movie" ? "movie":"tv";
  const res = await fetch(`${API_BASE}/api/tmdb/${ep}/${item.id}`);
  const j = await res.json();
  const v = (j.videos?.results||[]).find(x=>x.site==="YouTube" && /Trailer|Teaser/.test(x.type||""));
  if (v) window.open(`https://www.youtube.com/watch?v=${v.key}`, "_blank");
}

// Live TV
let allChannels = [];
async function loadLiveTV(){
  const r = await fetch(`${API_BASE}/api/channels?limit=200`);
  const j = await r.json();
  allChannels = j.channels || [];
  renderChannels(allChannels);
}
function renderChannels(list){
  const grid = $("#grid-livetv"); grid.innerHTML="";
  list.forEach(ch=>{
    const d = document.createElement("div"); d.className="card";
    const logo = ch.logo || "https://via.placeholder.com/320x180?text=TV";
    const id = `ch:${(ch.id||ch.name)}`;
    const active = favs.has(id) ? " active" : "";
    d.innerHTML = `<div class="thumb" style="background-image:url('${logo}')"></div>
      <div class="meta"><span>${ch.name||"—"}</span><button class="fav${active}">★</button></div>`;
    d.onclick = (e)=>{
      if (e.target.classList.contains("fav")) { e.stopPropagation(); e.target.classList.toggle("active"); toggleFav(id); return; }
      playChannel(ch);
    };
    grid.appendChild(d);
  });
}

// Channel filters
$$(".chip").forEach(btn=> btn.onclick=()=>{
  $$(".chip").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");
  const g = btn.dataset.group;
  if (g==="all") return renderChannels(allChannels);
  const map = { news:"news", sports:"sport", kids:"kids", movies:"movie", series:"series" };
  renderChannels(allChannels.filter(c => (c.group||"").toLowerCase().includes(map[g])));
});

// Favorites view
$("#favBtn").onclick = ()=>{
  const cards = [...document.querySelectorAll(".grid .card")];
  cards.forEach(c => {
    const isFav = c.querySelector(".fav")?.classList.contains("active");
    c.style.display = isFav ? "" : "none";
  });
};

// Play channel + EPG + Continue Watching
async function playChannel(ch){
  const s = ch.streams && ch.streams[0]; if (!s) return alert("لا يوجد رابط بث");
  // إظهار نافذة المشغل المنبثقة المستقلة
  // إظهار المشغل في أعلى الصفحة
  $(".player-panel").style.display = "block";
  const video = $("#player");
  if (Hls.isSupported()) {
    if (window.__hls) window.__hls.destroy();
    const hls = new Hls(); window.__hls = hls;
    hls.loadSource(s.url); hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, ()=>{
      const id = `ch:${(ch.id||ch.name)}`;
      const p = (JSON.parse(localStorage.getItem("alitv_progress")||"{}")[id]?.seconds) || 0;
      if (p>0) video.currentTime = p;
      video.play();
    });
  } else { video.src = s.url; video.play(); }
  video.ontimeupdate = ()=>{
    const id = `ch:${(ch.id||ch.name)}`;
    const prog = JSON.parse(localStorage.getItem("alitv_progress")||"{}");
    prog[id] = { t: Date.now(), seconds: Math.floor(video.currentTime||0) };
    localStorage.setItem("alitv_progress", JSON.stringify(prog));
  };

  const tvgId = ch.id;
  const epgNow = $("#epgNow");
  if (tvgId){
    try {
      const r = await fetch(`${API_BASE}/api/epg?channel=${encodeURIComponent(tvgId)}&source=${encodeURIComponent(EPG_SRC())}`);
      const j = await r.json();
      const first = (j.items||[])[0];
      const title = first?.title ? (Array.isArray(first.title) ? first.title[0]._ : (first.title._ || first.title)) : "";
      epgNow.textContent = title ? `الآن يعرض: ${title}` : "لا توجد بيانات حالياً";
    } catch { epgNow.textContent = "تعذر جلب الدليل"; }
  } else epgNow.textContent = "لا توجد هوية للقناة (tvg-id)";
}

$("#importBtn").onclick = async ()=>{
  const url = $("#m3uUrl").value.trim(); if (!url) return alert("انسخ رابط M3U أولاً");
  const r = await fetch(`${API_BASE}/api/parse-m3u`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ url })});
  const j = await r.json(); allChannels = j.channels || []; renderChannels(allChannels);
};

loadLiveTV();
