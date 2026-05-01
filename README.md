# rest-apii

REST API TikTok oEmbed + landing page, siap deploy ke Vercel.

## Local run

```bash
npm start
```

## Deploy ke Vercel

```bash
vercel --prod
```

Konfigurasi sudah pakai `vercel.json` rewrite semua route ke `api/index.js`.

## Routes
- `GET /` landing page
- `GET /docs` docs JSON
- `POST /api/tiktok` body: `{ "url": "https://www.tiktok.com/@user/video/123" }`
