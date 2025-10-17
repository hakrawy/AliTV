// 🌍 i18n.js - نظام الترجمة للواجهة

window.I18N = {
  ar: {
    trending: "الشائع الآن",
    movies: "أفلام",
    series: "مسلسلات",
    livetv: "البث المباشر",
    search: "بحث...",
    watchNow: "شاهد الآن",
    moreInfo: "المزيد من التفاصيل",
    import: "استيراد",
    pasteM3U: "الصق رابط قائمة M3U",
    orUseDefault: "أو استخدم قائمة iptv-org الافتراضية",
    favorites: "المفضلة",
    all: "الكل",
    news: "أخبار",
    sports: "رياضة",
    kids: "أطفال",
    epg: "دليل القنوات",
    epgLoading: "جارٍ جلب الجدول…",
    freeWatch: "روابط مشاهدة مجانية",
    nowPlaying: "الآن يعرض:",
    noEPG: "لا توجد بيانات حالياً",
    loading: "جاري التحميل...",
    error: "حدث خطأ أثناء الجلب.",
  },
  en: {
    trending: "Trending Now",
    movies: "Movies",
    series: "Series",
    livetv: "Live TV",
    search: "Search...",
    watchNow: "Watch Now",
    moreInfo: "More Info",
    import: "Import",
    pasteM3U: "Paste M3U playlist link",
    orUseDefault: "Or use iptv-org default list",
    favorites: "Favorites",
    all: "All",
    news: "News",
    sports: "Sports",
    kids: "Kids",
    epg: "Channel Guide",
    epgLoading: "Loading schedule…",
    freeWatch: "Free Watch Links",
    nowPlaying: "Now Playing:",
    noEPG: "No data currently available",
    loading: "Loading...",
    error: "An error occurred while fetching data.",
  }
};

// 🌐 دوال الترجمة
function t(key) {
  const lang = localStorage.getItem("alitv_lang") || "ar";
  return (window.I18N[lang] && window.I18N[lang][key]) || key;
}

function applyI18n() {
  const lang = localStorage.getItem("alitv_lang") || "ar";
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.placeholder = t(key);
  });
}
