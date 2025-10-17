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

// inject SVG favicon (red 'A')
(function(){
  try{
    const old = document.querySelector('link[rel="icon"]');
    if(old) old.remove();
    const link = document.createElement('link');
    link.rel = 'icon'; link.type = 'image/svg+xml'; link.href = 'assets/favicon.svg';
    document.head.appendChild(link);
  }catch{}
})();

// ripple effect (delegated)
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('.ripple');
  if(!btn) return;
  const rect = btn.getBoundingClientRect();
  const wave = document.createElement('span'); wave.className = 'ripple-wave';
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  wave.style.left = x + 'px'; wave.style.top = y + 'px';
  const d = Math.max(rect.width, rect.height); wave.style.width = wave.style.height = d + 'px';
  btn.appendChild(wave); setTimeout(()=> wave.remove(), 650);
});

// ===== i18n init =====
const langSelect = $("#langSelect");
let LANG = localStorage.getItem("alitv_lang") || CONFIG.defaultLang;
langSelect.value = LANG;
applyI18n();
langSelect.onchange = ()=>{ LANG = langSelect.value; localStorage.setItem("alitv_lang", LANG); applyI18n(); };

// wire i18n bindings for existing DOM
(function wireI18n(){
  const mapText = [
    [".tab-btn[data-tab='trending']","trending"],
    [".tab-btn[data-tab='movies']","movies"],
    [".tab-btn[data-tab='series']","series"],
    [".tab-btn[data-tab='livetv']","livetv"],
    ["#watchNow","watchNow"],
    ["#moreInfo","moreInfo"],
    ["#favBtn","favorites"],
    [".pill[data-type='movie']","movies"],
    [".pill[data-type='tv']","series"],
    [".chip[data-group='all']","all"],
    [".chip[data-group='news']","news"],
    [".chip[data-group='sports']","sports"],
    [".chip[data-group='kids']","kids"],
    [".chip[data-group='movies']","movies"],
    [".chip[data-group='series']","series"],
    ["#importBtn","import"],
    [".import .hint","orUseDefault"],
  ];
  mapText.forEach(([sel,key])=>{ const el=document.querySelector(sel); if(el) el.setAttribute('data-i18n', key); });
  const mapPh = [ ["#searchInput","search"], ["#m3uUrl","pasteM3U"] ];
  mapPh.forEach(([sel,key])=>{ const el=document.querySelector(sel); if(el) el.setAttribute('data-i18n-placeholder', key); });
  applyI18n();
})();

// ===== tabs =====
function activate(tab){
  $$(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab===tab));
  $$(".tab-section").forEach(s => s.classList.toggle("hidden", !s.id.endsWith(tab)));
  $("#hero").classList.toggle("hidden", tab!=="trending");
  if (tab==="movies") loadMovies();
  else if (tab==="series") loadSeries();
}
$$(".tab-btn").forEach(btn => btn.onclick = ()=> activate(btn.dataset.tab));
activate("trending");

// ===== modal =====
function openModal(html){ $("#modalContent").innerHTML = html; $("#modal").classList.remove("hidden"); }
$("#closeModal").onclick = ()=> $("#modal").classList.add("hidden");

// ===== Settings (API Base) =====
(function setupSettings(){
  const tools = document.querySelector('.right-tools'); if(!tools) return;
  const btn = document.createElement('button');
  btn.id = 'settingsBtn'; btn.className = 'ghost ripple'; btn.title = t('settings');
  btn.setAttribute('aria-label', t('settings'));
  btn.textContent = '⚙️';
  tools.appendChild(btn);

  function openSettings(){
    const current = (window.__RESOLVED_API_BASE__ || (typeof API_BASE !== 'undefined' ? API_BASE : ''));
    const ls = (()=>{ try{return localStorage.getItem('alitv_api_base')||'';}catch{return '';} })();
    const html = `
      <h3 data-i18n="settings">Settings</h3>
      <div style="display:flex;flex-direction:column;gap:8px">
        <label><span data-i18n="apiBase">API Base URL</span></label>
        <input id="apiBaseInput" value="${ls||current}" placeholder="https://your-backend" style="background:#17171e;color:#e5e5e5;border:1px solid #2a2a33;border-radius:8px;padding:8px 10px;"/>
        <div style="opacity:.8;font-size:12px">Resolved: ${current}</div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button id="saveApiBase" class="primary ripple" data-i18n="save">Save</button>
          <button id="clearApiBase" class="ghost ripple" data-i18n="clear">Clear Override</button>
        </div>
      </div>`;
    openModal(html); applyI18n();
    const save = document.getElementById('saveApiBase');
    const clear = document.getElementById('clearApiBase');
    save?.addEventListener('click', ()=>{
      const v = String(document.getElementById('apiBaseInput').value||'').trim();
      try{ if(v){ localStorage.setItem('alitv_api_base', v); } }catch{}
      location.reload();
    });
    clear?.addEventListener('click', ()=>{ try{ localStorage.removeItem('alitv_api_base'); }catch{} location.reload(); });
  }
  btn.addEventListener('click', openSettings);
})();

// ===== Import UI (M3U / Xtream) =====
(function setupImportUI(){
  const box = document.querySelector('.import'); if(!box) return;
  const m3uInput = document.querySelector('#m3uUrl');
  const m3uBtn = document.querySelector('#importBtn');
  // Mode selector
  const modeWrap = document.createElement('div'); modeWrap.style.margin = '6px 0';
  modeWrap.innerHTML = `
    <label style="margin-inline-end:8px" data-i18n="importSource">Import Source</label>
    <select id="importMode" style="background:#17171e;color:#e5e5e5;border:1px solid #2a2a33;border-radius:8px;padding:6px 8px;">
      <option value="m3u" data-i18n="sourceM3U">M3U</option>
      <option value="xtream" data-i18n="sourceXtream">Xtream</option>
    </select>`;
  box.insertBefore(modeWrap, box.firstChild);

  // Xtream fields
  const xt = document.createElement('div'); xt.id = 'xtreamBox'; xt.style.display = 'none'; xt.style.marginTop = '8px';
  xt.innerHTML = `
    <input id="xtHost" placeholder="Server / Host" data-i18n-placeholder="xtreamHost" style="background:#17171e;color:#e5e5e5;border:1px solid #2a2a33;border-radius:8px;padding:8px 10px; margin-inline-end:6px" />
    <input id="xtPort" placeholder="Port" data-i18n-placeholder="xtreamPort" value="80" style="width:90px;background:#17171e;color:#e5e5e5;border:1px solid #2a2a33;border-radius:8px;padding:8px 10px; margin-inline-end:6px" />
    <input id="xtUser" placeholder="Username" data-i18n-placeholder="xtreamUser" style="background:#17171e;color:#e5e5e5;border:1px solid #2a2a33;border-radius:8px;padding:8px 10px; margin-inline-end:6px" />
    <input id="xtPass" type="password" placeholder="Password" data-i18n-placeholder="xtreamPass" style="background:#17171e;color:#e5e5e5;border:1px solid #2a2a33;border-radius:8px;padding:8px 10px; margin-inline-end:6px" />
    <button id="xtreamBtn" class="ghost ripple" data-i18n="xtreamImport">Import Xtream</button>
  `;
  box.appendChild(xt);

  const modeSel = document.querySelector('#importMode');
  modeSel.onchange = ()=>{
    const useXt = modeSel.value === 'xtream';
    xt.style.display = useXt ? '' : 'none';
    if(m3uInput) m3uInput.style.display = useXt ? 'none' : '';
    if(m3uBtn) m3uBtn.style.display = useXt ? 'none' : '';
    applyI18n();
  };
  applyI18n();

  const xtBtn = document.querySelector('#xtreamBtn');
  xtBtn?.addEventListener('click', async ()=>{
    const host = (document.querySelector('#xtHost')?.value||'').trim();
    const port = (document.querySelector('#xtPort')?.value||'').trim() || '80';
    const username = (document.querySelector('#xtUser')?.value||'').trim();
    const password = (document.querySelector('#xtPass')?.value||'').trim();
    if(!host || !username || !password){ alert(t('error')); return; }
    showSkeleton('#grid-livetv', 10);
    try{
      const resp = await fetch(`${API_BASE}/api/xtream/import`,{
        method:'POST', headers:{'Content-Type':'application/json','X-Device-UA':'Dalvik/2.1.0 (Linux; U; Android 10) AliTV/1.0'},
        body: JSON.stringify({ host, port, username, password })
      });
      const data = await resp.json();
      if(!resp.ok) throw new Error('xtream failed');
      allChannels = data.channels || [];
      renderChannels(allChannels);
    }catch(e){ alert(t('error')); }
    hideSkeleton('#grid-livetv');
  });
})();

// ===== fav & progress =====
const favKey = "alitv_favs"; const progKey = "alitv_progress";
const favs = new Set(JSON.parse(localStorage.getItem(favKey)||"[]"));
const progress = JSON.parse(localStorage.getItem(progKey)||"{}");
function toggleFav(id){ favs.has(id) ? favs.delete(id) : favs.add(id); localStorage.setItem(favKey, JSON.stringify([...favs])); }
function saveProgress(id, seconds){ progress[id] = { t: Date.now(), seconds }; localStorage.setItem(progKey, JSON.stringify(progress)); }

// ===== search =====
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

// helper: prepare lazy backgrounds inside a container
function setupLazyIn(selector){
  const root = document.querySelector(selector); if(!root) return;
  root.querySelectorAll('.thumb, .poster').forEach(el=>{
    if(el.hasAttribute('data-bg')){ observeLazyBg(el); return; }
    const style = el.style && el.style.backgroundImage || '';
    const m = style.match(/url\(['\"]?([^)'\"]+)/);
    if(m && m[1]){
      el.classList.add('lazy-bg'); el.setAttribute('data-bg', m[1]); el.style.backgroundImage='';
      observeLazyBg(el);
    }
  });
}

// lazy-load for background images
const __lazyBgObserver = new IntersectionObserver((entries, obs)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){ const el=entry.target; const bg=el.getAttribute('data-bg');
      if(bg){ el.style.backgroundImage = `url('${bg}')`; el.removeAttribute('data-bg'); }
      obs.unobserve(el);
    }
  });
},{ rootMargin: '200px' });
function observeLazyBg(el){ if(el) __lazyBgObserver.observe(el); }

// ===== TMDB (trending / hero / details) =====
// paging state + infinite loader
const STATE = {
  trending: { type:'movie', page:1, loading:false, done:false },
  movies:   { page:1, loading:false, done:false },
  series:   { page:1, loading:false, done:false },
};
const __moreObserver = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting && typeof e.target.__loadMore==='function'){ e.target.__loadMore(); } });
},{ rootMargin:'800px 0px' });
function ensureSentinel(gridSelector, onLoadMore){
  const grid = document.querySelector(gridSelector); if(!grid || !grid.parentElement) return;
  let s = grid.parentElement.querySelector('.load-sentinel');
  if(!s){ s = document.createElement('div'); s.className='load-sentinel'; s.style.height='1px'; s.style.opacity='0'; grid.parentElement.appendChild(s); }
  s.__loadMore = onLoadMore; __moreObserver.observe(s);
}

async function loadTrending(type="movie", append=false){
  const st = STATE.trending; if(!append){ st.type=type; st.page=1; st.done=false; st.loading=false; }
  if(st.loading || st.done) return; st.loading=true;
  if(!append) showSkeleton('#grid-trending');
  try{
    const res = await fetch(`${API_BASE}/api/tmdb/trending?type=${type}&page=${st.page}`); const data = await res.json();
    const results = data.results || [];
    const grid = $('#grid-trending'); if(!append){ hideSkeleton('#grid-trending'); grid.innerHTML=''; }
    results.forEach(item => grid.appendChild(makeTmdbCard(item)));
    if(!append) { renderHero(results); }
    setupLazyIn('#grid-trending');
    st.page += 1; if(results.length === 0) st.done = true;
    ensureSentinel('#grid-trending', ()=> loadTrending(st.type, true));
  }catch(e){ console.error(e); st.done=true; }
  st.loading=false;
}
function renderHero(results){
  const track = $("#carousel-track"); track.innerHTML="";
  results.slice(0,8).forEach(item=>{
    const bg = item.backdrop_path ? `${CONFIG.tmdb.imageBase}/w780${item.backdrop_path}` :
               item.poster_path ? `${CONFIG.tmdb.imageBase}/w500${item.poster_path}` : "";
    const p = document.createElement("div"); p.className="poster lazy-bg"; p.setAttribute('data-bg', bg);
    p.innerHTML = `<div class="meta">${item.title||item.name||""}</div>`;
    p.onclick = ()=> showMoreInfo(item);
    track.appendChild(p);
    observeLazyBg(p);
  });
  $("#watchNow").onclick = ()=> results[0] && openTrailer(results[0]);
  $("#moreInfo").onclick = ()=> results[0] && showMoreInfo(results[0]);
  setupLazyIn('#hero');
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
$$(".pill").forEach(p=> p.onclick=()=>{ $$(".pill").forEach(x=>x.classList.remove("active")); p.classList.add("active"); STATE.trending.done=false; STATE.trending.page=1; loadTrending(p.dataset.type,false); });
loadTrending("movie", false);

// ===== Movies & Series sections =====
async function loadMovies(append=false){
  const st = STATE.movies; if(!append){ st.page=1; st.done=false; st.loading=false; }
  if(st.loading || st.done) return; st.loading=true;
  if(!append) showSkeleton('#grid-movies');
  try{
    const res = await fetch(`${API_BASE}/api/tmdb/discover?type=movie&page=${st.page}`); const data = await res.json();
    const results = data.results || [];
    const grid=$("#grid-movies"); if(!append){ hideSkeleton('#grid-movies'); grid.innerHTML=''; }
    (results).forEach(item => grid.appendChild(makeTmdbCard(item)));
    setupLazyIn('#grid-movies');
    st.page += 1; if(results.length === 0) st.done = true;
    ensureSentinel('#grid-movies', ()=> loadMovies(true));
  }catch(e){ console.error(e); st.done=true; }
  st.loading=false;
}
async function loadSeries(append=false){
  const st = STATE.series; if(!append){ st.page=1; st.done=false; st.loading=false; }
  if(st.loading || st.done) return; st.loading=true;
  if(!append) showSkeleton('#grid-series');
  try{
    const res = await fetch(`${API_BASE}/api/tmdb/discover?type=tv&page=${st.page}`); const data = await res.json();
    const results = data.results || [];
    const grid=$("#grid-series"); if(!append){ hideSkeleton('#grid-series'); grid.innerHTML=''; }
    (results).forEach(item => grid.appendChild(makeTmdbCard(item)));
    setupLazyIn('#grid-series');
    st.page += 1; if(results.length === 0) st.done = true;
    ensureSentinel('#grid-series', ()=> loadSeries(true));
  }catch(e){ console.error(e); st.done=true; }
  st.loading=false;
}

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
  setupLazyIn('#grid-livetv');
}

// quick filters
$$(".chip").forEach(btn => btn.onclick = ()=>{
  $$(".chip").forEach(x=>x.classList.remove("active")); btn.classList.add("active");
  const g=btn.dataset.group; if(g==="all") return renderChannels(allChannels);
  renderChannels(allChannels.filter(c => (c.group||"").toLowerCase().includes(g.toLowerCase())));
});

// favorites view (trending section)
$("#favBtn").onclick = ()=>{
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
  const srcSelect = $("#epgSelect");
  const srcVal = srcSelect.value || CONFIG.defaultEPG;
  try{
    const r = await fetch(`${API_BASE}/api/epg?channel=${encodeURIComponent(ch.id)}&source=${encodeURIComponent(srcVal)}`);
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

// persist EPG source
const epgSelect = $("#epgSelect");
epgSelect.value = localStorage.getItem("alitv_epg") || epgSelect.value;
epgSelect.onchange = ()=> localStorage.setItem("alitv_epg", epgSelect.value);

// init
loadTrending("movie", false);
loadLiveTV();
