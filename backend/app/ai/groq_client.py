"""
Fixxly AI Client
Primary: Groq (FREE — https://console.groq.com → create free account → copy API key)
Fallback: Google Gemini (FREE tier — https://ai.google.dev)
"""
import json
import logging
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ─────────────────────────────────────────────────
# GROQ CLIENT (primary, free tier)
# ─────────────────────────────────────────────────
def _call_groq(messages: list, temperature: float = 0.3, max_tokens: int = 1500) -> str:
    """Call Groq API. Model: llama-3.3-70b-versatile (free, fast)."""
    try:
        # pyrefly: ignore [missing-import]
        from groq import Groq
        client = Groq(api_key=settings.GROQ_API_KEY)
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.warning(f"Groq call failed: {e}")
        raise

# ─────────────────────────────────────────────────
# GEMINI CLIENT (fallback, free tier)
# ─────────────────────────────────────────────────
def _call_gemini(prompt: str, temperature: float = 0.3) -> str:
    """Call Google Gemini API as fallback."""
    try:
        # pyrefly: ignore [missing-import]
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=1500,
            )
        )
        return response.text.strip()
    except Exception as e:
        logger.warning(f"Gemini call failed: {e}")
        raise

# ─────────────────────────────────────────────────
# UNIFIED AI CALL
# ─────────────────────────────────────────────────
def ai_complete(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_tokens: int = 1500,
) -> str:
    """
    Try Groq first, fallback to Gemini, then return a static message if both fail
    (useful if no API keys are configured yet).
    """
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    # 1. Try Groq if key is set
    if settings.GROQ_API_KEY:
        try:
            return _call_groq(messages, temperature, max_tokens)
        except Exception:
            logger.warning("Groq failed, trying Gemini...")

    # 2. Try Gemini if key is set
    if settings.GEMINI_API_KEY:
        try:
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            return _call_gemini(full_prompt, temperature)
        except Exception:
            logger.warning("Gemini also failed.")

    # 3. Static fallback (demo mode)
    return (
        "[AI Demo Mode] No API key configured. "
        "Add GROQ_API_KEY in backend/.env to enable AI features. "
        "Get a free key at https://console.groq.com"
    )


# ─────────────────────────────────────────────────
# SPECIFIC AI FUNCTIONS
# ─────────────────────────────────────────────────

FIXXLY_SYSTEM = """You are Fixxly AI, a senior category management assistant for a quick-commerce 
building materials company. You give concise, practical, data-driven recommendations. 
Always respond in structured plain text. No markdown headers unless asked. Be direct."""


def generate_po_recommendation(sku_name: str, vendor: str, current_stock: float,
                                reorder_point: float, forecast_qty: float,
                                lead_time_days: int, landed_cost: float) -> dict:
    """Generate PO recommendation with reasoning."""
    eoq = round((2 * forecast_qty * 500 / (landed_cost * 0.20)) ** 0.5, 0)
    suggested_qty = max(eoq, round(forecast_qty * 1.3, 0))

    prompt = f"""
Analyse this reorder situation and give a purchase recommendation:

SKU: {sku_name}
Vendor: {vendor}
Current Stock: {current_stock} units
Reorder Point: {reorder_point} units  
14-day Forecast Demand: {forecast_qty} units
Vendor Lead Time: {lead_time_days} days
Landed Cost per Unit: ₹{landed_cost}
Suggested EOQ: {suggested_qty} units
Estimated PO Value: ₹{suggested_qty * landed_cost:,.0f}

Give:
1. Should we order now? (Yes/No + one-line reason)
2. Recommended quantity (accept or adjust EOQ with brief reason)
3. Risk if we delay by 2 days
4. One specific negotiation tip for this order
Keep total response under 150 words.
"""
    ai_text = ai_complete(FIXXLY_SYSTEM, prompt)
    return {
        "suggested_qty": suggested_qty,
        "estimated_value": round(suggested_qty * landed_cost, 2),
        "ai_reasoning": ai_text,
    }


def generate_vendor_email(vendor_name: str, issue_type: str, details: str) -> str:
    """Draft a professional vendor communication email."""
    prompt = f"""
Draft a professional vendor email for Fixxly Pvt Ltd (quick commerce, building materials).

Vendor: {vendor_name}
Issue Type: {issue_type}
Details: {details}

Write a formal but firm email. Include:
- Subject line (start with "Subject: ")
- Greeting
- Issue description
- Specific ask / resolution required
- Deadline
- Closing

Keep it under 200 words. Tone: professional, solution-focused.
"""
    return ai_complete(FIXXLY_SYSTEM, prompt)


def generate_pricing_suggestion(sku_name: str, our_price: float, landed_cost: float,
                                  competitor_price: float, category_margin_target: float,
                                  current_margin_pct: float, velocity_rank: str) -> dict:
    """Generate pricing recommendation with 3 options."""
    floor_price = round(landed_cost * 1.15, 2)
    prompt = f"""
Analyse pricing for this SKU and recommend 3 options:

SKU: {sku_name}
Our Current Price: ₹{our_price}
Landed Cost: ₹{landed_cost}
Current Margin: {current_margin_pct:.1f}%
Category Target Margin: {category_margin_target:.1f}%
Competitor Price: ₹{competitor_price}
Floor Price (15% margin): ₹{floor_price}
Velocity: {velocity_rank}

Give exactly 3 options:
Option 1 - Aggressive (win volume): price, margin%, 1-line rationale
Option 2 - Neutral (balance): price, margin%, 1-line rationale  
Option 3 - Defensive (protect margin): price, margin%, 1-line rationale

Then give a 1-line recommended action.
"""
    ai_text = ai_complete(FIXXLY_SYSTEM, prompt)
    return {
        "floor_price": floor_price,
        "current_price": our_price,
        "competitor_price": competitor_price,
        "ai_options": ai_text,
    }


def generate_dbr_narrative(data: dict) -> str:
    """Generate a Daily Business Review narrative from structured data."""
    prompt = f"""
Write a Daily Business Review narrative for Fixxly's category team.
Data for today:

{json.dumps(data, indent=2)}

Write a 5-paragraph executive narrative covering:
1. Overall performance (GMV, orders, margin vs targets)
2. Top 3 wins / positives
3. Top 3 risks / issues
4. Inventory & supply chain health
5. Tomorrow's priority actions (numbered list)

Use specific numbers from the data. Be direct. Total: 200-300 words.
"""
    return ai_complete(FIXXLY_SYSTEM, prompt, temperature=0.4, max_tokens=500)


def generate_sku_content(sku_code: str, product_name: str, brand: str,
                          category: str, specs: dict) -> dict:
    """Generate product title, description, and attributes."""
    prompt = f"""
Generate professional product content for an e-commerce listing on Fixxly (building materials platform).

SKU Code: {sku_code}
Raw Product Name: {product_name}
Brand: {brand}
Category: {category}
Specifications: {json.dumps(specs)}

Generate:
1. SEO Title (max 80 chars, include brand + key spec + use case)
2. Short Description (2-3 sentences, benefits-focused, for customers)
3. Bullet Points (5 key features, start each with a strong word)
4. Search Keywords (10 relevant keywords, comma-separated)

Format clearly with labels.
"""
    ai_text = ai_complete(FIXXLY_SYSTEM, prompt)
    return {"generated_content": ai_text}


def generate_assortment_insight(skus_data: list) -> str:
    """Generate assortment recommendations from SKU performance data."""
    prompt = f"""
Analyse this assortment data for Fixxly's category and give actionable recommendations:

{json.dumps(skus_data[:15], indent=2)}

Provide:
1. Top 3 SKUs to promote (high margin + good velocity)
2. Top 3 SKUs to delist (low velocity + poor margin)
3. 2 assortment gap opportunities to fill
4. One key insight about the category health

Be specific with SKU names and numbers. Max 200 words.
"""
    return ai_complete(FIXXLY_SYSTEM, prompt)


def generate_approval_risk_assessment(request_type: str, details: dict) -> dict:
    """Score an approval request with AI risk assessment."""
    prompt = f"""
Risk-assess this approval request for Fixxly's category management system.

Request Type: {request_type}
Details: {json.dumps(details, indent=2)}

Give:
1. Risk Score (0-100, where 100 = highest risk)
2. Risk Level (LOW / MEDIUM / HIGH / CRITICAL)
3. Key risks (2-3 bullet points)
4. Recommended Action (APPROVE / APPROVE_WITH_CONDITIONS / REJECT)
5. One-line justification

Format as JSON with keys: risk_score, risk_level, risks, recommended_action, justification
"""
    ai_text = ai_complete(FIXXLY_SYSTEM, prompt)

    # Try to parse JSON from response
    try:
        start = ai_text.find("{")
        end = ai_text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(ai_text[start:end])
    except Exception:
        pass

    return {
        "risk_score": 50,
        "risk_level": "MEDIUM",
        "risks": ["Unable to parse AI response"],
        "recommended_action": "APPROVE_WITH_CONDITIONS",
        "justification": ai_text[:200],
    }
