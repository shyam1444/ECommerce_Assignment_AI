# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import func
from typing import Optional
from app.database import get_db
from app.models.models import SKU, SKUPricing, Hub, Category
from app.ai.groq_client import generate_pricing_suggestion
# pyrefly: ignore [missing-import]
from pydantic import BaseModel

router = APIRouter(prefix="/pricing", tags=["Pricing & Margin"])


@router.get("/dashboard")
def pricing_dashboard(db: Session = Depends(get_db)):
    """Full pricing dashboard with margin analysis."""
    pricing_records = (
        db.query(SKUPricing, SKU, Hub)
        .join(SKU, SKUPricing.sku_id == SKU.id)
        .join(Hub, SKUPricing.hub_id == Hub.id)
        .filter(SKUPricing.is_current == True, SKU.is_active == True)
        .all()
    )

    result = []
    for p, sku, hub in pricing_records:
        competitor_gap = None
        if p.competitor_price and p.selling_price:
            competitor_gap = round((p.selling_price - p.competitor_price) / p.competitor_price * 100, 1)

        margin_flag = "OK"
        if p.gross_margin_pct < 10:
            margin_flag = "CRITICAL"
        elif p.gross_margin_pct < 15:
            margin_flag = "LOW"
        elif p.gross_margin_pct > 35:
            margin_flag = "HIGH"

        result.append({
            "sku_id": sku.id,
            "sku_code": sku.sku_code,
            "product_name": sku.product_name,
            "brand": sku.brand,
            "hub": hub.name,
            "selling_price": p.selling_price,
            "landed_cost": p.landed_cost,
            "mrp": sku.mrp,
            "floor_price": sku.floor_price,
            "gross_margin_pct": p.gross_margin_pct,
            "competitor_price": p.competitor_price,
            "comp_source": p.comp_source,
            "competitor_gap_pct": competitor_gap,
            "margin_flag": margin_flag,
        })
    return result


@router.get("/margin-summary")
def margin_summary(db: Session = Depends(get_db)):
    """Overall margin health KPIs."""
    pricing = db.query(SKUPricing).filter(SKUPricing.is_current == True).all()
    if not pricing:
        return {"avg_margin": 0, "below_floor": 0, "above_target": 0}

    avg_margin = sum(p.gross_margin_pct for p in pricing) / len(pricing)
    below_15 = sum(1 for p in pricing if p.gross_margin_pct < 15)
    below_10 = sum(1 for p in pricing if p.gross_margin_pct < 10)
    above_30 = sum(1 for p in pricing if p.gross_margin_pct > 30)

    # Competitive pricing
    has_comp = [p for p in pricing if p.competitor_price]
    undercut_count = sum(1 for p in has_comp if p.competitor_price < p.selling_price * 0.90)

    return {
        "total_pricing_records": len(pricing),
        "avg_gross_margin_pct": round(avg_margin, 2),
        "below_15pct_count": below_15,
        "below_10pct_count": below_10,
        "above_30pct_count": above_30,
        "competitor_undercut_count": undercut_count,
        "total_with_comp_data": len(has_comp),
    }


class PriceSuggestionRequest(BaseModel):
    sku_id: str
    hub_id: Optional[str] = None


@router.post("/suggest")
def suggest_price(req: PriceSuggestionRequest, db: Session = Depends(get_db)):
    """AI pricing suggestion for a SKU."""
    sku = db.query(SKU).filter(SKU.id == req.sku_id).first()
    if not sku:
        raise HTTPException(404, "SKU not found")

    pricing = (
        db.query(SKUPricing)
        .filter(SKUPricing.sku_id == req.sku_id, SKUPricing.is_current == True)
        .first()
    )
    if not pricing:
        raise HTTPException(404, "No pricing data found for this SKU")

    # Get category margin target
    category = db.query(Category).filter(Category.id == sku.category_id).first()
    target_margin = category.target_margin_pct if category else 18.0

    return generate_pricing_suggestion(
        sku_name=sku.product_name,
        our_price=pricing.selling_price,
        landed_cost=pricing.landed_cost,
        competitor_price=pricing.competitor_price or pricing.selling_price * 0.95,
        category_margin_target=target_margin,
        current_margin_pct=pricing.gross_margin_pct,
        velocity_rank="HIGH" if pricing.gross_margin_pct > 20 else "MEDIUM",
    )


class PriceUpdateRequest(BaseModel):
    sku_id: str
    hub_id: str
    new_selling_price: float
    reason: str
    requested_by: str = "category_leader"


@router.post("/update")
def update_price(req: PriceUpdateRequest, db: Session = Depends(get_db)):
    """Submit a price change (creates approval request if > threshold)."""
    from app.config import get_settings
    from app.models.models import ApprovalRequest
    from datetime import datetime, timedelta

    settings = get_settings()

    sku = db.query(SKU).filter(SKU.id == req.sku_id).first()
    if not sku:
        raise HTTPException(404, "SKU not found")

    current_pricing = db.query(SKUPricing).filter(
        SKUPricing.sku_id == req.sku_id,
        SKUPricing.hub_id == req.hub_id,
        SKUPricing.is_current == True,
    ).first()

    if not current_pricing:
        raise HTTPException(404, "Current pricing not found")

    # Floor price check
    if req.new_selling_price < (sku.floor_price or 0):
        raise HTTPException(400, f"Price ₹{req.new_selling_price} is below floor price ₹{sku.floor_price}. VP override required.")

    # Calculate change %
    change_pct = abs(req.new_selling_price - current_pricing.selling_price) / current_pricing.selling_price * 100

    requires_approval = change_pct >= settings.PRICE_CHANGE_APPROVAL_THRESHOLD

    if requires_approval:
        # Create approval request
        approval = ApprovalRequest(
            request_type="PRICE_CHANGE",
            reference_id=req.sku_id,
            reference_label=f"Price change for {sku.product_name}: ₹{current_pricing.selling_price} → ₹{req.new_selling_price} ({change_pct:.1f}% change)",
            requested_by="system",
            assigned_to="system",
            ai_risk_score=min(int(change_pct * 4), 100),
            ai_recommendation=f"Price change of {change_pct:.1f}% requires review. New margin would be {round((req.new_selling_price - current_pricing.landed_cost) / req.new_selling_price * 100, 1)}%",
            expires_at=datetime.utcnow() + timedelta(hours=4),
        )
        db.add(approval)
        db.commit()
        return {
            "status": "PENDING_APPROVAL",
            "message": f"Price change of {change_pct:.1f}% requires approval",
            "approval_id": approval.id,
            "change_pct": round(change_pct, 2),
        }
    else:
        # Apply directly
        current_pricing.is_current = False
        new_pricing = SKUPricing(
            sku_id=req.sku_id,
            hub_id=req.hub_id,
            selling_price=req.new_selling_price,
            landed_cost=current_pricing.landed_cost,
            gross_margin_pct=round((req.new_selling_price - current_pricing.landed_cost) / req.new_selling_price * 100, 2),
            competitor_price=current_pricing.competitor_price,
            comp_source=current_pricing.comp_source,
            effective_from=datetime.utcnow().date(),
            is_current=True,
        )
        db.add(new_pricing)
        db.commit()
        return {
            "status": "APPLIED",
            "new_price": req.new_selling_price,
            "new_margin_pct": new_pricing.gross_margin_pct,
            "change_pct": round(change_pct, 2),
        }


@router.get("/competitive-gap")
def competitive_gap(db: Session = Depends(get_db)):
    """SKUs where we're more than 10% more expensive than competitors."""
    pricing = (
        db.query(SKUPricing, SKU)
        .join(SKU, SKUPricing.sku_id == SKU.id)
        .filter(SKUPricing.is_current == True, SKUPricing.competitor_price.isnot(None))
        .all()
    )
    gaps = []
    for p, sku in pricing:
        gap_pct = (p.selling_price - p.competitor_price) / p.competitor_price * 100
        if gap_pct > 5:
            gaps.append({
                "sku_code": sku.sku_code,
                "product_name": sku.product_name,
                "our_price": p.selling_price,
                "competitor_price": p.competitor_price,
                "gap_pct": round(gap_pct, 1),
                "revenue_risk": "HIGH" if gap_pct > 15 else "MEDIUM",
            })
    gaps.sort(key=lambda x: x["gap_pct"], reverse=True)
    return gaps
