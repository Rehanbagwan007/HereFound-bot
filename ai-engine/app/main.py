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
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-1.5-pro-latest')

if not GOOGLE_API_KEY:
    raise RuntimeError('GOOGLE_API_KEY is required')

genai.configure(api_key=GOOGLE_API_KEY)

SYSTEM_PROMPT = (
    "You are an expert Indian cyber-law legal assistant and digital forensics analyst trained on the IT Act (2000) and IT Rules (2021). "
    "Analyze this video carefully for two things:\n"
    "1. LEGAL VIOLATIONS: Determine if it contains manipulated audio, deepfakes, or promotes illegal offshore gambling.\n"
    "2. AI GENERATION: Determine if the video itself was generated or significantly synthesized by AI (look for unnatural motion, artifacts, inconsistent lighting, synthetic faces/voices, or other AI generation indicators).\n"
    "Output STRICTLY in JSON format with these exact keys (no extra text, no markdown code fences):\n"
    "{ "
    "\"is_violation\": boolean, "
    "\"violation_type\": string or null, "
    "\"it_act_section\": string or null, "
    "\"confidence\": integer (0-100), "
    "\"is_ai_generated\": boolean, "
    "\"ai_generation_confidence\": integer (0-100), "
    "\"cyber_police_draft\": string or null (If is_violation is true, write a formal 3-sentence complaint addressed to the National Cyber Crime Reporting Portal of India. If false, return null.) "
    "}"
)

class AnalyzeRequest(BaseModel):
    reel_url: HttpUrl

@app.post('/analyze')
async def analyze(request: AnalyzeRequest):
    import uuid
    import time
    file_path = f"/tmp/{uuid.uuid4()}.mp4"
    uploaded_file = None
    try:
        ydl_opts = {
            'quiet': True, 
            'format': 'best', 
            'noplaylist': True,
            'outtmpl': file_path
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.extract_info(str(request.reel_url), download=True)
            
        if not os.path.exists(file_path):
            raise HTTPException(status_code=422, detail='Failed to download the video')

        uploaded_file = genai.upload_file(path=file_path)
        
        while uploaded_file.state.name == "PROCESSING":
            time.sleep(2)
            uploaded_file = genai.get_file(uploaded_file.name)
            
        if uploaded_file.state.name == "FAILED":
            raise ValueError("Gemini failed to process the uploaded video file.")

        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(
            contents=[SYSTEM_PROMPT, uploaded_file]
        )

        raw_text = response.text or ''

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

        print('=== ANALYSIS REPORT ===')
        print(f"Reel URL: {request.reel_url}")
        print(f"Status: {'🚨 VIOLATION' if result.get('is_violation') else '✅ CLEAN'}")
        print(f"Violation Type: {result.get('violation_type', 'N/A')}")
        print(f"IT Act Section: {result.get('it_act_section', 'N/A')}")
        print(f"Confidence: {result.get('confidence', 'N/A')}%")
        print(f"AI Generated: {'🤖 YES' if result.get('is_ai_generated') else '👤 NO'} (confidence: {result.get('ai_generation_confidence', 'N/A')}%)")
        print('=======================')
        return result
    except Exception as exc:
        import traceback
        import sys
        print(f"AI Engine Analysis Error occurred: {exc}", file=sys.stderr)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI Engine Error: {str(exc)}")
    finally:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass
        if uploaded_file:
            try:
                genai.delete_file(uploaded_file.name)
            except:
                pass
