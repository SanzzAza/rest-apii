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

## Routes
- `GET /` landing page
- `GET /docs` docs JSON
- `POST /api/tiktok`

Body:
```json
{ "url": "https://vt.tiktok.com/xxxx" }
```

Catatan: shortlink TikTok akan dicoba di-resolve dulu sebelum call oEmbed.
