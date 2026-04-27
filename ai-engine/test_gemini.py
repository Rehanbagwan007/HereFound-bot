import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv('GOOGLE_API_KEY') or "fake_key")

SYSTEM_PROMPT = (
    "You are an expert Indian cyber-law legal assistant trained on the IT Act (2000) and IT Rules (2021). "
    "Analyze this sports media video/audio. Determine if it contains manipulated audio, deepfakes, or promotes illegal offshore gambling. "
    "Output strictly in JSON format: { 'is_violation': boolean, 'violation_type': string, 'it_act_section': string, 'confidence': integer, "
    "'cyber_police_draft': string }"
)

model = genai.GenerativeModel('gemini-1.5-pro-latest')
try:
    response = model.generate_content(
        contents=[SYSTEM_PROMPT, "https://d2vqpl3tx84ay5.cloudfront.net/test_video.mp4"]
    )
    print("RESPONSE:", response.text)
except Exception as e:
    print("ERROR:", str(e))
