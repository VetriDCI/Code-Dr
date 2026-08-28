import os
import re
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
        # Use Qwen vision model if image is present, otherwise versatile text model
        model_name = "qwen/qwen3.6-27b" if req.image else os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
        
        system_prompt = (
            "You are an elite, production-grade frontend web developer and UI/UX expert. "
            "Your task is to generate a fully functional, stunning, responsive webpage. "
            "CRITICAL INSTRUCTIONS: "
            "1. Return ONLY pure raw HTML code containing embedded Tailwind CSS and interactive JavaScript. "
            "2. Do NOT output any thinking process, chain-of-thought, notes, explanations, or analysis. "
            "3. Do NOT wrap the code in ```html markdown blocks. Output raw code directly starting with <!DOCTYPE html>."
        )

        messages = [{"role": "system", "content": system_prompt}]

        if req.image:
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": f"Style: {req.style}. Requirements from image and text prompt: {req.prompt}"},
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
            temperature=0.3,
            max_tokens=6000
        )

        raw_output = completion.choices[0].message.content.strip()
        
        # Remove any reasoning/thinking tags if model outputs them
        clean_code = re.sub(r'<think>.*?</think>', '', raw_output, flags=re.DOTALL).strip()
        
        # Strip markdown fences if present
        if clean_code.startswith("```html"):
            clean_code = clean_code[7:]
        elif clean_code.startswith("```"):
            clean_code = clean_code[3:]
            
        if clean_code.endswith("```"):
            clean_code = clean_code[:-3]

        clean_code = clean_code.strip()
        
        # Ensure it starts with html structure
        if "<html" not in clean_code.lower() and "<DOCTYPE" not in clean_code.upper():
            clean_code = f"<!DOCTYPE html>\n<html>\n<head><script src='https://cdn.tailwindcss.com'></script></head>\n<body class='bg-gray-50 p-6'>\n{clean_code}\n</body>\n</html>"

        return {"code": clean_code}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))