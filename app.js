// ============ الأدوات المساعدة ============
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

// ============ إعداد اللغة ============
const langSelect = $("#langSelect");
let LANG = localStorage.getItem("alitv_lang") || CONFIG.defaultLang;
langSelect.value = LANG;
applyI18n();
langSelect.onchange = () => {
  LANG = langSelect.value;
  localStorage.setItem("alitv_lang", LANG);
  applyI18n();
};

// ============ التبويبات ============
function activate(tab) {
  $$(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  $$(".tab-section").forEach(s => s.classList.toggle("hidden", !s.id.endsWith(tab)));
  $("#hero").classList.toggle("hidden", tab !== "trending");
}
$$(".tab-btn").forEach(btn => btn.onclick = () => activate(btn.dataset.tab));
activate("trending");

// ============ المفضلة و التقدم ============
const favKey = "alitv_favs";
const progKey = "alitv_progress";
const favs = new Set(JSON.parse(localStorage.getItem(favKey) || "[]"));
const progress = JSON.parse(localStorage.getItem(progKey) || "{}");
function toggleFav(id) {
  favs.has(id) ? favs.delete(id) : favs.add(id);
  localStorage.setItem(favKey, JSON.stringify([...favs]));
}
function saveProgress(id, seconds) {
  progress[id] = { t: Date.now(), seconds };
  localStorage.setItem(progKey, JSON.stringify(progress));
}

// ============ Splash ============
setTimeout(() => {
  $("#splash").style.opacity = 0;
  setTimeout(() => $("#splash").remove(), 600);
}, 2400);

// ============ البحث ============
$("#searchInput").addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  $$(".card").forEach(c => {
    const txt = (c.querySelector(".meta")?.innerText || "").toLowerCase();
    c.style.display = txt.includes(q) ? "" : "none";
  });
});

// ============ TMDB ============
async function loadTrending(type = "movie") {
  showSkeleton("#grid-trending");
  const res = await fetch(`${API_BASE}/api/tmdb/trending?type=${type}`);
  const data = await res.json();
  const results = data.results || [];
  hideSkeleton("#grid-trending");
  const grid = $("#grid-trending");
  grid.innerHTML = "";
  results.forEach(item => grid.appendChild(makeTmdbCard(item)));
  renderHero(results);
}
function renderHero(results) {
  const track = $("#carousel-track");
  track.innerHTML = "";
  results.slice(0, 6).forEach(item => {
    const bg = item.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
      : "";
    const p = document.createElement("div");
    p.className = "poster";
    p.style.backgroundImage = `url('${bg}')`;
    p.innerHTML = `<div class="meta">${item.title || item.name}</div>`;
    p.onclick = () => showMoreInfo(item);
    track.appendChild(p);
  });
}
function makeTmdbCard(item) {
  const el = document.createElement("div");
  el.className = "card";
  const img = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "";
  const id = `${item.media_type || (item.title ? "movie" : "tv")}:${item.id}`;
  const active = favs.has(id) ? " active" : "";
  el.innerHTML = `
    <div class="thumb" style="background-image:url('${img}')"></div>
    <div class="meta">
      <span>${item.title || item.name || "—"}</span>
      <button class="fav${active}">★</button>
    </div>`;
  el.onclick = e => {
    if (e.target.classList.contains("fav")) {
      e.stopPropagation();
      e.target.classList.toggle("active");
      toggleFav(id);
    } else showMoreInfo(item);
  };
  return el;
}
async function showMoreInfo(item) {
  const type = item.media_type || (item.title ? "movie" : "tv");
  const ep = type === "movie" ? "movie" : "tv";
  const res = await fetch(`${API_BASE}/api/tmdb/${ep}/${item.id}`);
  const j = await res.json();
  const d = j.detail;
  const img = d.backdrop_path || d.poster_path
    ? `https://image.tmdb.org/t/p/w780${d.backdrop_path || d.poster_path}`
    : "";
  const title = d.title || d.name;
  const rating = (d.vote_average || 0).toFixed(1);
  const genres = (d.genres || []).map(g => g.name).join(", ");
  const q = encodeURIComponent(title);
  const freeLinks = `
    <a class="btn" target="_blank" href="https://publicdomainmovies.net/?s=${q}">PublicDomainMovies</a>
    <a class="btn" target="_blank" href="https://archive.org/search?query=${q}+AND+mediatype%3Amovies">Archive.org</a>
    <a class="btn" target="_blank" href="https://www.youtube.com/results?search_query=${q}+full+movie">YouTube</a>`;
  openModal(`
    <h2>${title}</h2>
    ${img ? `<img src="${img}" alt="${title}"/>` : ""}
    <div class="meta-row"><span>⭐ ${rating}</span> ${genres ? `• ${genres}` : ""}</div>
    <p>${d.overview || ""}</p>
    <div class="links">${freeLinks}</div>
  `);
}

// ============ Modal ============
function openModal(html) {
  $("#modalContent").innerHTML = html;
  $("#modal").classList.remove("hidden");
}
$("#closeModal").onclick = () => $("#modal").classList.add("hidden");

// ============ Skeleton Loader ============
function showSkeleton(gridSelector, count = 6) {
  const grid = document.querySelector(gridSelector);
  if (!grid) return;
  grid.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const sk = document.createElement("div");
    sk.className = "card skeleton";
    grid.appendChild(sk);
  }
}
function hideSkeleton(gridSelector) {
  const grid = document.querySelector(gridSelector);
  if (!grid) return;
  grid.querySelectorAll(".skeleton").forEach(el => el.remove());
}

// ============ Live TV ============
let allChannels = [];
async function loadLiveTV() {
  showSkeleton("#grid-livetv");
  const data = await cacheFetch("alitv_channels", () =>
    fetch(`${API_BASE}/api/channels?limit=200`).then(r => r.json())
  );
  allChannels = data.channels || [];
  hideSkeleton("#grid-livetv");
  renderChannels(allChannels);
}
function renderChannels(list) {
  const grid = $("#grid-livetv");
  grid.innerHTML = "";
  list.forEach(ch => {
    const d = document.createElement("div");
    d.className = "card";
    const logo = ch.logo || "https://via.placeholder.com/320x180?text=TV";
    const id = `ch:${ch.id || ch.name}`;
    const active = favs.has(id) ? " active" : "";
    d.innerHTML = `
      <div class="thumb" style="background-image:url('${logo}')"></div>
      <div class="meta"><span>${ch.name}</span><button class="fav${active}">★</button></div>`;
    d.onclick = e => {
      if (e.target.classList.contains("fav")) {
        e.stopPropagation();
        e.target.classList.toggle("active");
        toggleFav(id);
      } else playChannel(ch);
    };
    grid.appendChild(d);
  });
}

// ============ Xtream Import ============
$("#importBtn").onclick = async () => {
  const url = $("#m3uUrl").value.trim();
  if (!url) return alert("انسخ رابط M3U أولاً");
  const r = await fetch(`${API_BASE}/api/parse-m3u`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const j = await r.json();
  allChannels = j.channels || [];
  renderChannels(allChannels);
};

// ============ الفلاتر ============
$$(".chip").forEach(btn => {
  btn.onclick = () => {
    $$(".chip").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    const g = btn.dataset.group;
    if (g === "all") return renderChannels(allChannels);
    renderChannels(
      allChannels.filter(c =>
        (c.group || "").toLowerCase().includes(g.toLowerCase())
      )
    );
  };
});

// ============ تشغيل القنوات ============
async function playChannel(ch) {
  const s = ch.streams && ch.streams[0];
  if (!s) return alert("لا يوجد رابط بث");
  const video = $("#player");
  if (Hls.isSupported()) {
    if (window.__hls) window.__hls.destroy();
    const hls = new Hls();
    window.__hls = hls;
    hls.loadSource(s.url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
  } else {
    video.src = s.url;
    video.play();
  }

  const id = `ch:${ch.id || ch.name}`;
  video.ontimeupdate = () => saveProgress(id, Math.floor(video.currentTime));
  fetchEPG(ch.id);
}

// ============ EPG ============
async function fetchEPG(id) {
  const epgNow = $("#epgNow");
  try {
    const src = localStorage.getItem("alitv_epg") || CONFIG.defaultEPG;
    const r = await fetch(`${API_BASE}/api/epg?channel=${encodeURIComponent(id)}&source=${encodeURIComponent(src)}`);
    const j = await r.json();
    const first = (j.items || [])[0];
    const title = first?.title?._ || first?.title || "";
    epgNow.textContent = title ? `الآن يعرض: ${title}` : t("noEPG");
  } catch {
    epgNow.textContent = t("error");
  }
}

// ============ بدء التحميل ============
loadTrending("movie");
loadLiveTV();
