# Code Dr — Groq version — Deploy Guide

Ithu 7B model self-host panradha vittu, Groq API (free tier) use pannுthu.
Backend lightweight-a irukkum, so Render free tier (512MB RAM) la easy-a fit aagum.

## A. Backend Deploy — Render.com

1. **Render account create pannunga** (render.com, free, GitHub login use pannalam)

2. **GitHub repo create pannunga** (e.g. `code-dr-backend`) — `backend/` folder la irukkura
   3 files (`main.py`, `requirements.txt`, `Dockerfile`) upload pannunga.

3. **Render Dashboard -> New -> Web Service**
   - Connect your GitHub repo
   - Environment: **Docker** (auto-detect aagum, Dockerfile irukkurathunala)
   - Instance Type: **Free**

4. **Environment Variable add pannunga** (IMPORTANT)
   - Service page -> "Environment" tab -> "Add Environment Variable"
   - Key: `GROQ_API_KEY`
   - Value: உங்க Groq API key (Super AI Studio-ல use panradhu)
   - Save

5. **Deploy pannunga** — Render automatic-a build pannum (Docker image build aagum,
   ~2-5 mins). "Live" status varum.

6. **Backend URL edunga**
   - Top-la irukkum: `https://code-dr-backend-xxxx.onrender.com`

## B. Frontend Deploy — GitHub Pages

7. **GitHub repo create pannunga** (e.g. `code-dr-live`) — `frontend/` folder upload pannunga

8. **`script.js` la BACKEND_URL maathunga**
   ```js
   const BACKEND_URL = "https://code-dr-backend-xxxx.onrender.com/generate";
   ```
   (step 6-la vaangina URL + `/generate`)

9. **GitHub Pages enable pannunga**
   - Repo -> Settings -> Pages -> Source: "Deploy from branch" -> main -> `/frontend` (or root)

10. **Site live** — `https://YOUR_USERNAME.github.io/code-dr-live/`

## Notes

- **Free tier cold start**: Render free web service 15 mins inactivity-la spin down
  aagum. Adutha request vandha ~30-50 sec wake-up time edukkum. Idhukku appuram fast-a
  irukkum (Groq itself is very fast, usually 1-3 sec per generation).
- **No RAM issue anymore** — model self-host panradhu illa, so 512MB free RAM
  more-than-enough.
- Groq free tier rate limits irukku (requests/day, tokens/min) — heavy usage na
  atha check pannunga: https://console.groq.com/settings/limits

## Local test panna

```
cd backend
pip install -r requirements.txt
export GROQ_API_KEY=your_key_here      # Windows: set GROQ_API_KEY=your_key_here
uvicorn main:app --host 0.0.0.0 --port 10000
```
Then frontend `script.js` la: `const BACKEND_URL = "http://localhost:10000/generate";`
