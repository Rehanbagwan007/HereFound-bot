import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv('/home/rehan_7/Desktop/Projects/HereFound/HereFound-bot/ai-engine/.env')

genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

print("Available models:")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(f"Name: {m.name}")
