# Code Dr ULTRA

AI website generator — Groq API (backend) + GitHub Pages (frontend).

## Structure
- `backend/` → deploy to Render.com (Web Service, Docker, Free)
  - Set Environment Variable `GROQ_API_KEY` in Render dashboard
- `docs/` → GitHub Pages source (Settings → Pages → Branch: main → Folder: /docs)

## Backend URL already set in docs/script.js
```
https://code-dr.onrender.com/generate
```
If you redeploy backend with a new URL, update that line in `docs/script.js`.
