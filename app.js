// ===== helpers =====
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

// ===== splash + sound =====
window.addEventListener("load", () => {
  const a = $("#startSound");
  if (a) { a.volume = 0.6; a.play().catch(()=>{}); }
  setTimeout(() => { $("#splash").classList.add("fade-out"); }, 900);
  setTimeout(() => { $("#splash")?.remove(); }, 1800);
});

// ===== i18n init =====
const langSelect = $("#langSelect");
let LANG = localStorage.getItem("alitv_lang") || CONFIG.defaultLang;
langSelect.value = LANG;
applyI18n();
langSelect.onchange = ()=>{ LANG = langSelect.value; localStorage.setItem("alitv_lang", LANG); applyI18n(); };

// ===== tabs =====
function activate(tab){
  // header buttons
  $$(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab===tab));
  // sections visibility
  $$(".tab-section").forEach(s => s.classList.toggle("hidden", !s.id.endsWith(tab)));
  // hero only for trending
  $("#hero").classList.toggle("hidden", tab!=="trending");

  // تحميل الأفلام والمسلسلات عند اختيار القسم
  if(tab==="movies") loadMovies();
  else if(tab==="series") loadSeries();
// دوال تحميل الأفلام والمسلسلات
async function loadMovies(){
  showSkeleton("#grid-movies");
  const data = await cacheFetch("tmdb_movies", ()=> fetch(`${API_BASE}/api/tmdb/discover?type=movie`).then(r=>r.json()));
  hideSkeleton("#grid-movies");
  const grid = $("#grid-movies");
  grid.innerHTML = "";
  (data.results || []).forEach(item => grid.appendChild(makeTmdbCard(item)));
}

async function loadSeries(){
  showSkeleton("#grid-series");
  const data = await cacheFetch("tmdb_series", ()=> fetch(`${API_BASE}/api/tmdb/discover?type=tv`).then(r=>r.json()));
  hideSkeleton("#grid-series");
  const grid = $("#grid-series");
  grid.innerHTML = "";
  (data.results || []).forEach(item => grid.appendChild(makeTmdbCard(item)));
}
}
$$(".tab-btn").forEach(btn => btn.onclick = ()=> activate(btn.dataset.tab));
activate("trending");

// ===== modal =====
function openModal(html){ $("#modalContent").innerHTML = html; $("#modal").classList.remove("hidden"); }
$("#closeModal").onclick = ()=> $("#modal").classList.add("hidden");

// ===== fav & progress =====
const favKey = "alitv_favs"; const progKey = "alitv_progress";
const favs = new Set(JSON.parse(localStorage.getItem(favKey)||"[]"));
const progress = JSON.parse(localStorage.getItem(progKey)||"{}");
function toggleFav(id){ favs.has(id) ? favs.delete(id) : favs.add(id); localStorage.setItem(favKey, JSON.stringify([...favs])); }
function saveProgress(id, seconds){ progress[id] = { t: Date.now(), seconds }; localStorage.setItem(progKey, JSON.stringify(progress)); }

// ===== search (filters visible cards) =====
$("#searchInput").addEventListener("input", e=>{
  const q = e.target.value.toLowerCase();
  $$("#content .grid .card").forEach(c=>{
    const txt = (c.querySelector(".meta")?.innerText || "").toLowerCase();
    c.style.display = txt.includes(q) ? "" : "none";
  });
});

// ===== skeleton utils =====
function showSkeleton(gridSelector, count=8){
  const grid = document.querySelector(gridSelector); if(!grid) return;
  grid.innerHTML = ""; for(let i=0;i<count;i++){ const sk=document.createElement("div"); sk.className="card skeleton"; grid.appendChild(sk); }
}
function hideSkeleton(gridSelector){
  const grid = document.querySelector(gridSelector); if(!grid) return; grid.querySelectorAll(".skeleton").forEach(el=>el.remove());
}

// ===== TMDB (trending / hero / details) =====
async function loadTrending(type="movie"){
  showSkeleton("#grid-trending");
  const data = await cacheFetch(`tmdb_trending_${type}`, ()=> fetch(`${API_BASE}/api/tmdb/trending?type=${type}`).then(r=>r.json()));
  const results = data.results || [];
  hideSkeleton("#grid-trending");
  const grid = $("#grid-trending"); grid.innerHTML="";
  results.forEach(item => grid.appendChild(makeTmdbCard(item)));
  renderHero(results);
}
function renderHero(results){
  const track = $("#carousel-track"); track.innerHTML="";
  results.slice(0,8).forEach(item=>{
    const bg = item.backdrop_path ? `${CONFIG.tmdb.imageBase}/w780${item.backdrop_path}` :
               item.poster_path ? `${CONFIG.tmdb.imageBase}/w500${item.poster_path}` : "";
    const p = document.createElement("div"); p.className="poster"; p.style.backgroundImage=`url('${bg}')`;
    p.innerHTML = `<div class="meta">${item.title||item.name||""}</div>`;
    p.onclick = ()=> showMoreInfo(item);
    track.appendChild(p);
  });
  $("#watchNow").onclick = ()=> results[0] && openTrailer(results[0]);
  $("#moreInfo").onclick = ()=> results[0] && showMoreInfo(results[0]);
}
function makeTmdbCard(item){
  const el=document.createElement("div"); el.className="card";
  const img = item.poster_path ? `${CONFIG.tmdb.imageBase}/w500${item.poster_path}` : "";
  const id = `${item.media_type || (item.title? "movie":"tv")}:${item.id}`;
  const active = favs.has(id) ? " active":"";
  el.innerHTML = `<div class="thumb" style="background-image:url('${img}')"></div>
    <div class="meta"><span>${item.title||item.name||"—"}</span><button class="fav${active}">★</button></div>`;
  el.onclick = (e)=>{
    if(e.target.classList.contains("fav")){ e.stopPropagation(); e.target.classList.toggle("active"); toggleFav(id); }
    else showMoreInfo(item);
  };
  return el;
}
async function showMoreInfo(item){
  const type = item.media_type || (item.title? "movie":"tv");
  const ep = type==="movie" ? "movie":"tv";
  const res = await fetch(`${API_BASE}/api/tmdb/${ep}/${item.id}`); const j = await res.json(); const d=j.detail;
  const img = (d.backdrop_path||d.poster_path) ? `${CONFIG.tmdb.imageBase}/w780${d.backdrop_path||d.poster_path}` : "";
  const title = d.title||d.name||""; const year = (d.release_date||d.first_air_date||"").slice(0,4);
  const rating = (d.vote_average||0).toFixed(1);
  const genres = (d.genres||[]).map(g=>g.name).join(", ");
  const q = encodeURIComponent(title);
  const freeLinks = `
    <a class="btn" target="_blank" href="https://publicdomainmovies.net/?s=${q}">PublicDomainMovies</a>
    <a class="btn" target="_blank" href="https://archive.org/search?query=${q}+AND+mediatype%3Amovies">Archive.org</a>
    <a class="btn" target="_blank" href="https://www.youtube.com/results?search_query=${q}+full+movie">YouTube</a>`;
  openModal(`
    <h2>${title} ${year?`<small>(${year})</small>`:""}</h2>
    ${img?`<img src="${img}" alt="${title}" style="width:100%;border-radius:12px;"/>`:""}
    <div class="meta-row" style="margin:8px 0"><span>⭐ ${rating}</span>${genres?`<span> • ${genres}</span>`:""}</div>
    <p style="opacity:.9">${d.overview||""}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">${freeLinks}</div>
  `);
}
async function openTrailer(item){
  const type=item.media_type||(item.title?"movie":"tv"); const ep=type==="movie"?"movie":"tv";
  const res=await fetch(`${API_BASE}/api/tmdb/${ep}/${item.id}`); const j=await res.json();
  const v=(j.videos?.results||[]).find(x=>x.site==="YouTube" && /Trailer|Teaser/.test(x.type||""));
  if(v) window.open(`https://www.youtube.com/watch?v=${v.key}`,"_blank");
}

// trending picker
$$(".pill").forEach(p=> p.onclick=()=>{ $$(".pill").forEach(x=>x.classList.remove("active")); p.classList.add("active"); loadTrending(p.dataset.type); });
loadTrending("movie");

// ===== Live TV =====
let allChannels=[];
async function loadLiveTV(){
  showSkeleton("#grid-livetv", 10);
  const data = await cacheFetch("alitv_channels", ()=> fetch(`${API_BASE}/api/channels?limit=250`).then(r=>r.json()));
  allChannels = data.channels||[];
  hideSkeleton("#grid-livetv");
  renderChannels(allChannels);
}
function renderChannels(list){
  const grid=$("#grid-livetv"); grid.innerHTML="";
  list.forEach(ch=>{
    const d=document.createElement("div"); d.className="card";
    const logo = ch.logo || "https://via.placeholder.com/320x180?text=TV";
    const id = `ch:${ch.id||ch.name}`;
    const active = favs.has(id)? " active":"";
    d.innerHTML = `<div class="thumb" style="background-image:url('${logo}')"></div>
      <div class="meta"><span>${ch.name||"—"}</span><button class="fav${active}">★</button></div>`;
    d.onclick = (e)=>{
      if(e.target.classList.contains("fav")){ e.stopPropagation(); e.target.classList.toggle("active"); toggleFav(id); return; }
      playChannel(ch);
    };
    grid.appendChild(d);
  });
}

// quick filters
$$(".chip").forEach(btn => btn.onclick = ()=>{
  $$(".chip").forEach(x=>x.classList.remove("active")); btn.classList.add("active");
  const g=btn.dataset.group; if(g==="all") return renderChannels(allChannels);
  renderChannels(allChannels.filter(c => (c.group||"").toLowerCase().includes(g.toLowerCase())));
});

// favorites view on trending
$("#favBtn").onclick = ()=>{
  // يخفّي غير المفضّلة ضمن القسم الحالي فقط
  $$("#section-trending .grid .card").forEach(c=>{
    const isFav = c.querySelector(".fav")?.classList.contains("active");
    c.style.display = isFav ? "" : "none";
  });
};

// play + epg + continue
async function playChannel(ch){
  const s = ch.streams && ch.streams[0]; if(!s) return alert("لا يوجد رابط بث");
  const video=$("#player");
  try{
    if(Hls.isSupported()){
      if(window.__hls) window.__hls.destroy();
      const hls=new Hls(); window.__hls=hls; hls.loadSource(s.url); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, ()=> video.play());
    } else { video.src=s.url; video.play(); }
  }catch(e){ console.error(e); }

  const id=`ch:${ch.id||ch.name}`;
  video.ontimeupdate=()=> saveProgress(id, Math.floor(video.currentTime||0));

  // EPG
  const epgNow=$("#epgNow"); epgNow.textContent="جارٍ جلب الجدول…";
  const src = localStorage.getItem("alitv_epg") || CONFIG.defaultEPG;
  try{
    const r = await fetch(`${API_BASE}/api/epg?channel=${encodeURIComponent(ch.id)}&source=${encodeURIComponent(src)}`);
    const j = await r.json();
    const first=(j.items||[])[0];
    const title = first?.title ? (first.title._ || first.title) : "";
    epgNow.textContent = title ? `الآن يعرض: ${title}` : "لا توجد بيانات حالياً";
  }catch{ epgNow.textContent="تعذر جلب الدليل"; }
}

// import m3u
$("#importBtn").onclick = async ()=>{
  const url=$("#m3uUrl").value.trim(); if(!url) return alert("انسخ رابط M3U أولاً");
  showSkeleton("#grid-livetv", 8);
  try{
    const r=await fetch(`${API_BASE}/api/parse-m3u`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url})});
    const j=await r.json(); allChannels=j.channels||[]; renderChannels(allChannels);
  }catch{ alert("تعذر استيراد القائمة"); }
  hideSkeleton("#grid-livetv");
};

// init
loadLiveTV();
