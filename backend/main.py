import os
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq

app = FastAPI(title="Code Dr ULTRA Backend (Groq)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set this in Render's Environment Variables tab (Dashboard -> your service -> Environment)
# Key: GROQ_API_KEY   Value: <your groq api key>
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY not set. /generate will fail until you set it.")

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Fast + strong code-gen model on Groq. Swap if Groq deprecates/renames it.
MODEL_NAME = "openai/gpt-oss-120b"


class PromptRequest(BaseModel):
    prompt: str
    style: str = "Modern & Minimal"


@app.get("/")
def home():
    return {"status": "Code Dr ULTRA Backend (Groq) is LIVE 🔥", "model": MODEL_NAME}


@app.post("/generate")
def generate(req: PromptRequest):
    if client is None:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured on server.")

    system_prompt = f"""You are a TOP 1% Senior Full-Stack Developer at Google.
TASK: Create a {req.style} style, ultra-modern, production-ready, SINGLE HTML file website.
USER REQUEST: {req.prompt}

REQUIREMENTS:
- Use SINGLE HTML file only with <style> and <script> inside.
- Inside <head> include: <script src="https://cdn.tailwindcss.com"></script>
- Use Google Fonts, FontAwesome CDN if needed.
- Modern UI: glassmorphism, animations, hover effects.
- 100% responsive, mobile friendly.
- Use dummy images from https://picsum.photos/400 or unsplash.
- OUTPUT ONLY HTML CODE, no markdown, no explanation."""

    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You output only raw HTML code, nothing else."},
                {"role": "user", "content": system_prompt},
            ],
            temperature=0.3,
            max_tokens=8000,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {e}")

    html_code = completion.choices[0].message.content.strip()

    # clean markdown fences if the model wrapped the output
    m = re.search(r"```html(.*?)```", html_code, re.DOTALL)
    if m:
        html_code = m.group(1)
    else:
        m2 = re.search(r"```(.*?)```", html_code, re.DOTALL)
        if m2:
            html_code = m2.group(1)

    return {"code": html_code.strip(), "style": req.style}
