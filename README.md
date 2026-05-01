# rest-apii

REST API TikTok downloader style + landing page, deploy-ready untuk Vercel.

## Local run

```bash
cp .env.example .env
# isi RAPIDAPI_KEY dan RAPIDAPI_HOST
npm start
```

## Vercel env
Set di Vercel Project Settings -> Environment Variables:
- `RAPIDAPI_KEY`
- `RAPIDAPI_HOST` (opsional, default: `social-media-video-downloader.p.rapidapi.com`)
- `RAPIDAPI_PATH` (opsional, default `/`, untuk host ini biasanya `/v1/social/autolink`)

## Routes
- `GET /`
- `GET /docs`
- `POST /api/tiktok` body `{ "url": "https://vt.tiktok.com/xxxx" }`
