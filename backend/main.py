import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from groq import Groq

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

class GenerationRequest(BaseModel):
    prompt: str
    style: str
    image: Optional[str] = None

@app.post("/generate")
def generate_code(req: GenerationRequest):
    try:
        # Fixed model name to support vision properly via Groq API
        model_name = "qwen/qwen3.6-27b" if req.image else os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
        
        system_prompt = (
            "You are an elite frontend developer. Return ONLY a single complete, valid, production-ready HTML file "
            "with embedded Tailwind CSS and modern JavaScript. Do NOT include markdown code blocks like ```html. "
            "Make it fully responsive and visually stunning based on the user instructions and style."
        )

        messages = [{"role": "system", "content": system_prompt}]

        if req.image:
            # Multi-modal content layout for Groq Vision API
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": f"Style: {req.style}. Instructions: {req.prompt}"},
                    {"type": "image_url", "image_url": {"url": req.image}}
                ]
            })
        else:
            messages.append({
                "role": "user",
                "content": f"Style: {req.style}. Requirements: {req.prompt}"
            })

        completion = client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=0.7,
            max_tokens=4000
        )

        code = completion.choices[0].message.content.strip()
        
        # Clean markdown ticks if model adds them accidentally
        if code.startswith("```html"):
            code = code[7:]
        if code.startswith("```"):
            code = code[3:]
        if code.endswith("```"):
            code = code[:-3]

        return {"code": code.strip()}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))