# AliTV Backend (Express Skeleton)

This is a minimal backend that supports the AliTV frontend features: TMDB, M3U import, EPG, and Xtream Codes import.

## Setup

- Node.js 18+
- Install deps:

```
cd backend
npm install
```

- Run:
```
npm start
```

## Environment

- `PORT` (default `3000`)
- `TMDB_API_KEY` – your TMDB v3 API key
- `CORS_ORIGIN` – allowed origin (default `*` for development)
- `DEFAULT_M3U_URL` – optional default M3U URL to hydrate `/api/channels`

## Endpoints

- `GET /api/tmdb/trending?type=movie|tv`
- `GET /api/tmdb/discover?type=movie|tv`
- `GET /api/tmdb/movie/:id`
- `GET /api/tmdb/tv/:id`
- `GET /api/channels?limit=250` – returns channels; uses `DEFAULT_M3U_URL` if set, else sample
- `POST /api/parse-m3u` – body: `{ url }`
- `GET /api/epg?channel=<id>&source=<xml-url>` – returns first few EPG items
- `POST /api/xtream/import` – body: `{ host, port, username, password }`
  - Reads `X-Device-UA` header and uses it as `User-Agent` to mimic mobile app

## Notes

- Caching: in-memory with small TTLs for TMDB/EPG and M3U
- M3U parser: simple EXTINF parser to extract `name`, `logo`, `group`, and the first stream URL
- EPG: parses iptv-org XML with `fast-xml-parser`, filters programmes by `channel` attribute containing the query
- Xtream: builds HLS URLs: `http://host:port/live/<user>/<pass>/<stream_id>.m3u8`

Adjust and harden as needed (rate limits, allowlists, auth, production CORS, error handling).
