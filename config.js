// إعدادات مشروع AliTV
// 🔗 روابط API الخلفية و TMDB
const API_BASE = "https://hakrawy-backend.onrender.com";

// مفتاح TMDB الخاص بك
const TMDB_API_KEY = "0775f71fe7655df78ef9d1738087d4e6";

// تكوينات عامة
const CONFIG = {
  tmdb: {
    apiKey: TMDB_API_KEY,
    baseUrl: "https://api.themoviedb.org/3",
    imageBase: "https://image.tmdb.org/t/p/w500",
  },
  cacheDuration: 1000 * 60 * 60 * 24, // 24 ساعة تخزين مؤقت
  defaultLang: "ar",
  defaultCountry: "SA",
  defaultEPG: "https://iptv-org.github.io/epg/guides/sa-ar.xml",
};

// 🔁 دالة فحص الكاش المحلي
function cacheFetch(key, fetchFn, maxAge = CONFIG.cacheDuration) {
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      const { time, data } = JSON.parse(cached);
      if (Date.now() - time < maxAge) return Promise.resolve(data);
    } catch (e) {
      console.warn("Cache parse error", e);
    }
  }
  return fetchFn().then((data) => {
    localStorage.setItem(key, JSON.stringify({ time: Date.now(), data }));
    return data;
  });
}
