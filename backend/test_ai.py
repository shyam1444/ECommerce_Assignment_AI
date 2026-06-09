import os
from dotenv import load_dotenv
load_dotenv()

from app.config import get_settings
settings = get_settings()

print("🔍 Testing AI Agent integrations...")
print(f"   Groq API Key status: {'CONFIGURED' if settings.GROQ_API_KEY else 'EMPTY'}")
print(f"   Gemini API Key status: {'CONFIGURED' if settings.GEMINI_API_KEY else 'EMPTY'}")

if settings.GROQ_API_KEY:
    print("\n🚀 Testing Groq API connection...")
    try:
        from groq import Groq
        client = Groq(api_key=settings.GROQ_API_KEY)
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": "user", "content": "Say 'Groq is connected successfully!' in 1 sentence."}],
            temperature=0.3,
            max_tokens=50
        )
        print(f"✅ Groq Response: {response.choices[0].message.content.strip()}")
    except Exception as e:
        print(f"❌ Groq connection failed: {e}")

if settings.GEMINI_API_KEY:
    print("\n🚀 Testing Gemini API connection...")
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(
            "Say 'Gemini is connected successfully!' in 1 sentence.",
            generation_config=genai.GenerationConfig(temperature=0.3, max_output_tokens=50)
        )
        print(f"✅ Gemini Response: {response.text.strip()}")
    except Exception as e:
        print(f"❌ Gemini connection failed: {e}")

if not settings.GROQ_API_KEY and not settings.GEMINI_API_KEY:
    print("\n⚠️ Neither key is configured in backend/.env. Running in AI Demo fallback mode.")
