// Backend + TMDB config
// Priority: localStorage override > window global override > hostname heuristic
(function(){
  let lsOverride = null; try { lsOverride = localStorage.getItem('alitv_api_base'); } catch {}
  const win = (typeof window !== 'undefined') ? window : {};
  const globalOverride = win.__ALITV_API_BASE__ || win.__API_BASE__ || null;
  const host = (typeof location !== 'undefined') ? location.hostname : '';
  const heuristic = (host === 'localhost' || host === '127.0.0.1') ? 'http://localhost:3000' : 'https://hakrawy-backend.onrender.com';
  // eslint-disable-next-line no-var
  var API_BASE = lsOverride || globalOverride || heuristic;
  // expose for debugging
  if (win) win.__RESOLVED_API_BASE__ = API_BASE;
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
