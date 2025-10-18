// Backend + TMDB config
// Priority: localStorage override > window global override > hostname heuristic
(function(){
  let lsOverride = null; try { lsOverride = localStorage.getItem('alitv_api_base'); } catch {}
  const win = (typeof window !== 'undefined') ? window : {};
  const host = (typeof location !== 'undefined') ? location.hostname : '';
  const isLocal = (host === 'localhost' || host === '127.0.0.1');
  const FORCED_PROD_BASE = 'https://hakrawy-backend.onrender.com';
  const defaultBase = isLocal ? 'http://localhost:3000' : FORCED_PROD_BASE;

  // If running on GitHub Pages, lock to FORCED_PROD_BASE unless user explicitly overrides via localStorage
  const isGitHubPages = /\.github\.io$/.test(host) || host === 'github.io';
  const globalOverride = win.__ALITV_API_BASE__ || win.__API_BASE__ || null;
  const resolved = lsOverride || (isGitHubPages ? FORCED_PROD_BASE : (globalOverride || defaultBase));

  try { (typeof globalThis!=='undefined' ? globalThis : window).API_BASE = resolved; } catch {}
  if (win) win.__RESOLVED_API_BASE__ = resolved;
})();
const TMDB_API_KEY = "0775f71fe7655df78ef9d1738087d4e6";

const CONFIG = {
  tmdb: {
    apiKey: TMDB_API_KEY,
    baseUrl: "https://api.themoviedb.org/3",
    imageBase: "https://image.tmdb.org/t/p",
  },
  cacheDuration: 1000 * 60 * 60 * 24, // 24h
  defaultLang: "ar",
  defaultEPG: "https://iptv-org.github.io/epg/guides/sa-ar.xml",
};

function cacheFetch(key, fetchFn, maxAge = CONFIG.cacheDuration) {
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      const { time, data } = JSON.parse(cached);
      if (Date.now() - time < maxAge) return Promise.resolve(data);
    } catch {}
  }
  return fetchFn().then((data) => {
    localStorage.setItem(key, JSON.stringify({ time: Date.now(), data }));
    return data;
  });
}
