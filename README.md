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
- `RAPIDAPI_HOST`
- `RAPIDAPI_PATH` (opsional, default `/`)

## Routes
- `GET /`
- `GET /docs`
- `POST /api/tiktok` body `{ "url": "https://vt.tiktok.com/xxxx" }`
