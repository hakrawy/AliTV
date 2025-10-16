# AliTV Backend (Arabic Edition)

Features:
- IPTV-org index with caching
- M3U import (URL/content)
- Xtream Codes Player API (metadata fetch)
- TMDB (Arabic) trending, movie/tv details, credits, videos, similar
- EPG (XMLTV) with selectable sources via `?source=` or default from `EPG_URL`
- CORS controlled by `FRONTEND_ORIGIN`
- Optional Redis cache (fallback in-memory)

## ENV (Render)
- PORT=5000
- FRONTEND_ORIGIN=https://hakrawy.github.io
- TMDB_API_KEY=0775f71fe7655df78ef9d1738087d4e6
- EPG_URL=https://iptv-org.github.io/epg/guides/sa-ar.xml
- IPTV_ORG_INDEX_URL=https://iptv-org.github.io/iptv/index.m3u
- (optional) REDIS_URL=rediss://USER:PASSWORD@HOST:PORT
- (optional) CACHE_TTL_SECONDS=21600
