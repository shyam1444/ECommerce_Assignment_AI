# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.models import SKU, Category, SKUPerformanceDaily, SKUPricing
from app.services.scoring import get_sku_health_matrix
from app.ai.groq_client import generate_assortment_insight, generate_sku_content
# pyrefly: ignore [missing-import]
from pydantic import BaseModel

router = APIRouter(prefix="/skus", tags=["Assortment & SKU"])


@router.get("/")
def list_skus(
    category_id: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    """List all SKUs with category info."""
    query = db.query(SKU, Category).join(Category, SKU.category_id == Category.id)
    if active_only:
        query = query.filter(SKU.is_active == True)
    if category_id:
        query = query.filter(SKU.category_id == category_id)

    results = query.all()
    return [
        {
            "id": sku.id,
            "sku_code": sku.sku_code,
            "product_name": sku.product_name,
            "brand": sku.brand,
            "category": cat.name,
            "uom": sku.uom,
            "pack_size": sku.pack_size,
            "mrp": sku.mrp,
            "floor_price": sku.floor_price,
            "content_score": sku.content_score,
            "is_active": sku.is_active,
            "gst_rate": sku.gst_rate,
            "description": sku.description,
            "image_url": sku.image_url,
        }
        for sku, cat in results
    ]


@router.get("/health-matrix")
def sku_health_matrix(db: Session = Depends(get_db)):
    """Full SKU health matrix with scores and recommendations."""
    return get_sku_health_matrix(db)


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    """List all categories."""
    cats = db.query(Category).all()
    sku_counts = {}
    for cat in cats:
        count = db.query(SKU).filter(SKU.category_id == cat.id, SKU.is_active == True).count()
        sku_counts[cat.id] = count
    return [
        {
            "id": c.id,
            "name": c.name,
            "target_margin_pct": c.target_margin_pct,
            "active_sku_count": sku_counts.get(c.id, 0),
        }
        for c in cats
    ]


@router.get("/assortment-insight")
def assortment_insight(db: Session = Depends(get_db)):
    """AI-generated assortment recommendations."""
    matrix = get_sku_health_matrix(db)
    insight = generate_assortment_insight(matrix)
    return {
        "insight": insight,
        "total_skus": len(matrix),
        "delist_candidates": [s for s in matrix if s["health_score"] < 25],
        "promote_candidates": [s for s in matrix if s["health_score"] >= 70][:5],
    }


class ContentGenerationRequest(BaseModel):
    sku_id: str


@router.post("/generate-content")
def generate_content(req: ContentGenerationRequest, db: Session = Depends(get_db)):
    """AI-generate product content for a SKU."""
    sku = db.query(SKU).filter(SKU.id == req.sku_id).first()
    if not sku:
        raise HTTPException(404, "SKU not found")

    category = db.query(Category).filter(Category.id == sku.category_id).first()

    return generate_sku_content(
        sku_code=sku.sku_code,
        product_name=sku.product_name,
        brand=sku.brand or "Generic",
        category=category.name if category else "Building Materials",
        specs=sku.specifications or {"pack_size": sku.pack_size, "uom": sku.uom},
    )


@router.get("/{sku_id}")
def get_sku(sku_id: str, db: Session = Depends(get_db)):
    """Get full SKU details."""
    sku = db.query(SKU).filter(SKU.id == sku_id).first()
    if not sku:
        raise HTTPException(404, "SKU not found")

    category = db.query(Category).filter(Category.id == sku.category_id).first()
    pricing = db.query(SKUPricing).filter(
        SKUPricing.sku_id == sku_id, SKUPricing.is_current == True
    ).first()

    return {
        "id": sku.id,
        "sku_code": sku.sku_code,
        "product_name": sku.product_name,
        "brand": sku.brand,
        "category": category.name if category else None,
        "description": sku.description,
        "specifications": sku.specifications,
        "uom": sku.uom,
        "pack_size": sku.pack_size,
        "mrp": sku.mrp,
        "floor_price": sku.floor_price,
        "hsn_code": sku.hsn_code,
        "gst_rate": sku.gst_rate,
        "content_score": sku.content_score,
        "image_url": sku.image_url,
        "is_active": sku.is_active,
        "current_pricing": {
            "selling_price": pricing.selling_price,
            "landed_cost": pricing.landed_cost,
            "gross_margin_pct": pricing.gross_margin_pct,
            "competitor_price": pricing.competitor_price,
        } if pricing else None,
    }


@router.get("/performance/summary")
def performance_summary(days: int = 30, db: Session = Depends(get_db)):
    """Category-level GMV and margin summary for the last N days."""
    # pyrefly: ignore [missing-import]
    from sqlalchemy import func
    from datetime import date, timedelta

    from_date = date.today() - timedelta(days=days)

    results = (
        db.query(
            Category.name,
            func.sum(SKUPerformanceDaily.gmv).label("total_gmv"),
            func.sum(SKUPerformanceDaily.gross_profit).label("total_gp"),
            func.sum(SKUPerformanceDaily.units_sold).label("total_units"),
        )
        .join(SKU, SKUPerformanceDaily.sku_id == SKU.id)
        .join(Category, SKU.category_id == Category.id)
        .filter(SKUPerformanceDaily.date >= from_date)
        .group_by(Category.name)
        .all()
    )

    return [
        {
            "category": r.name,
            "gmv": round(float(r.total_gmv or 0), 2),
            "gross_profit": round(float(r.total_gp or 0), 2),
            "units_sold": round(float(r.total_units or 0), 2),
            "margin_pct": round(float(r.total_gp or 0) / max(float(r.total_gmv or 1), 1) * 100, 2),
        }
        for r in results
    ]
