// Backend + TMDB config
const API_BASE = "https://hakrawy-backend.onrender.com";
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
