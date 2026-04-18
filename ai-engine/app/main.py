import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
import yt_dlp
import google.generativeai as genai

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-1.5-pro')

if not GOOGLE_API_KEY:
    raise RuntimeError('GOOGLE_API_KEY is required')

genai.configure(api_key=GOOGLE_API_KEY)

SYSTEM_PROMPT = (
    "You are an expert Indian cyber-law legal assistant trained on the IT Act (2000) and IT Rules (2021). "
    "Analyze this sports media video/audio. Determine if it contains manipulated audio, deepfakes, or promotes illegal offshore gambling. "
    "Output strictly in JSON format: { 'is_violation': boolean, 'violation_type': string, 'it_act_section': string, 'confidence': integer, "
    "'cyber_police_draft': string (If is_violation is true, write a formal, 3-sentence complaint draft addressed to the National Cyber Crime Reporting Portal of India detailing the specific manipulated content and the IT Act section violated. If false, return null.) }"
)

class AnalyzeRequest(BaseModel):
    reel_url: HttpUrl

@app.post('/analyze')
async def analyze(request: AnalyzeRequest):
    try:
        with yt_dlp.YoutubeDL({'quiet': True, 'format': 'best', 'noplaylist': True}) as ydl:
            info = ydl.extract_info(str(request.reel_url), download=False)
            media_url = info.get('url')

        if not media_url:
            raise HTTPException(status_code=422, detail='Unable to resolve media stream from provided URL')

        response = genai.predict(
            model=GEMINI_MODEL,
            input={
                'content': [
                    {'type': 'text', 'text': SYSTEM_PROMPT},
                    {
                        'type': 'image/*',
                        'uri': media_url
                    }
                ]
            }
        )

        raw_text = response.output_text or ''

        # The Gemini response must be strict JSON. If there is any extra text, try to parse JSON block.
        import json
        text = raw_text.strip()
        if text.startswith('﻿'):
            text = text[1:]

        try:
            result = json.loads(text)
        except json.JSONDecodeError:
            # Fallback: try to locate JSON substring.
            import re
            match = re.search(r'{.*}', text, re.S)
            if match:
                result = json.loads(match.group(0))
            else:
                raise

        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
