import asyncio
import os
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from groq import Groq

app = FastAPI(title="Code Dr ULTRA Backend", version="6.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
MAX_PROMPT_CHARS = int(os.getenv("MAX_PROMPT_CHARS", "1800"))
MAX_OUTPUT_TOKENS = int(os.getenv("MAX_OUTPUT_TOKENS", "1000"))

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
# One generation at a time per Render instance prevents users from consuming the
# same minute quota simultaneously. It is intentionally conservative for Free-tier use.
generation_lock = asyncio.Lock()

class PromptRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=MAX_PROMPT_CHARS)
    style: str = Field(default="Modern & Minimal", max_length=60)

@app.get("/")
def home():
    return {
        "status": "Code Dr ULTRA Backend is LIVE",
        "version": "6.0.0",
        "model": MODEL_NAME,
        "api_configured": bool(GROQ_API_KEY),
        "max_prompt_chars": MAX_PROMPT_CHARS,
        "max_output_tokens": MAX_OUTPUT_TOKENS,
    }

@app.get("/health")
def health():
    return {"ok": True, "api_configured": bool(GROQ_API_KEY), "model": MODEL_NAME}

def clean_html(text: str) -> str:
    text = (text or "").strip()
    m = re.search(r"```(?:html)?\s*(.*?)```", text, re.IGNORECASE | re.DOTALL)
    if m:
        text = m.group(1).strip()
    lower = text.lower()
    starts = [p for p in (lower.find("<!doctype html>"), lower.find("<html")) if p >= 0]
    if starts:
        text = text[min(starts):]
    end = text.lower().rfind("</html>")
    if end >= 0:
        text = text[: end + len("</html>")]
    return text.strip()

def is_rate_error(exc: Exception) -> bool:
    status = getattr(exc, "status_code", None)
    text = str(exc).lower()
    return status in (413, 429) or "rate_limit_exceeded" in text or "tokens per minute" in text

def call_groq(prompt: str, style: str, output_tokens: int):
    system_prompt = (
        "Return ONLY one complete HTML document. Build a polished responsive website "
        "for the user's request. Use embedded CSS and vanilla JS only. Include working "
        "demo interactions. Keep the HTML compact; do not explain the code."
    )
    user_prompt = f"Style: {style}\nRequest: {prompt}"
    return client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_completion_tokens=output_tokens,
        reasoning_effort="low",
    )

@app.post("/generate")
async def generate(req: PromptRequest):
    if client is None:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the Render service.")

    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    # Clamp values even if environment variables were accidentally set too high.
    prompt = prompt[:MAX_PROMPT_CHARS]
    output_tokens = max(256, min(MAX_OUTPUT_TOKENS, 1200))

    async with generation_lock:
        try:
            completion = await asyncio.to_thread(call_groq, prompt, req.style, output_tokens)
        except Exception as first_error:
            # A 413/token-limit response means the request itself was too large.
            # Retry once with a very small completion budget; never retry repeatedly.
            if is_rate_error(first_error) and output_tokens > 600:
                try:
                    completion = await asyncio.to_thread(call_groq, prompt[:1200], req.style, 600)
                except Exception as retry_error:
                    if is_rate_error(retry_error):
                        raise HTTPException(
                            status_code=429,
                            detail="Groq token/rate limit reached. Wait about 60 seconds and try a shorter request."
                        )
                    raise HTTPException(status_code=502, detail=f"Groq API error: {retry_error}")
            elif is_rate_error(first_error):
                raise HTTPException(
                    status_code=429,
                    detail="Groq token/rate limit reached. Wait about 60 seconds and try a shorter request."
                )
            else:
                raise HTTPException(status_code=502, detail=f"Groq API error: {first_error}")

    message = completion.choices[0].message
    html_code = clean_html(message.content or "")
    if not html_code or "<html" not in html_code.lower() or "</html>" not in html_code.lower():
        raise HTTPException(status_code=502, detail="AI returned incomplete HTML. Try a simpler request.")

    return {"code": html_code, "style": req.style}
