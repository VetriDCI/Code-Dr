# Code Dr ULTRA v6

Frontend: `docs/` (GitHub Pages)
Backend: `backend/` (FastAPI on Render)
AI: Groq

## Render environment variables
- `GROQ_API_KEY` = your Groq API key
- Optional `GROQ_MODEL` = `openai/gpt-oss-120b`
- Optional `MAX_PROMPT_CHARS` = `1800`
- Optional `MAX_OUTPUT_TOKENS` = `1000`

The backend is deliberately conservative for Groq Free-tier TPM limits. The frontend also has a 90-second timeout and clearer rate-limit/network errors.

## Frontend
Set `BACKEND_URL` in `docs/script.js` to the real Render `/generate` endpoint before deploying GitHub Pages.
