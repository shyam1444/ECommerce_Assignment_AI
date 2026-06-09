"""
SKU Health Scoring service.
Score = (velocity × 0.30) + (margin × 0.25) + (availability × 0.20) + (return_rate_inv × 0.15) + (content_score × 0.10)
"""
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from app.models.models import SKU, SKUPerformanceDaily, SKUPricing, Inventory


def compute_sku_health_score(
    velocity_rank_pct: float,      # 0-100 (100 = fastest seller)
    gross_margin_pct: float,        # 0-100
    availability_pct: float,        # 0-100
    return_rate_pct: float,         # 0-100 (lower is better)
    content_score: float,           # 0-100
) -> float:
    """Compute composite SKU health score (0-100)."""
    return_rate_inv = max(0, 100 - return_rate_pct * 10)  # invert and scale

    score = (
        velocity_rank_pct * 0.30
        + min(gross_margin_pct * 2, 100) * 0.25   # scale margin 0-50% → 0-100
        + availability_pct * 0.20
        + return_rate_inv * 0.15
        + content_score * 0.10
    )
    return round(min(max(score, 0), 100), 2)


def get_sku_health_matrix(db: Session) -> list:
    """
    Return a health matrix for all active SKUs with scores.
    """
    # pyrefly: ignore [missing-import]
    from sqlalchemy import func
    from datetime import date, timedelta

    skus = db.query(SKU).filter(SKU.is_active == True).all()
    results = []

    # Aggregate 30-day velocity for ranking
    thirty_days_ago = date.today() - timedelta(days=30)

    all_velocities = []
    for sku in skus:
        perf = (
            db.query(func.sum(SKUPerformanceDaily.units_sold))
            .filter(
                SKUPerformanceDaily.sku_id == sku.id,
                SKUPerformanceDaily.date >= thirty_days_ago,
            )
            .scalar()
        ) or 0.0
        all_velocities.append((sku.id, perf))

    # Rank velocities (percentile)
    all_velocities.sort(key=lambda x: x[1])
    n = len(all_velocities)
    velocity_rank = {vid: (i + 1) / n * 100 for i, (vid, _) in enumerate(all_velocities)}

    for sku in skus:
        # Get pricing
        pricing = (
            db.query(SKUPricing)
            .filter(SKUPricing.sku_id == sku.id, SKUPricing.is_current == True)
            .first()
        )
        margin_pct = pricing.gross_margin_pct if pricing else 15.0

        # Get availability (avg from performance)
        avg_avail = (
            db.query(func.avg(SKUPerformanceDaily.availability_pct))
            .filter(
                SKUPerformanceDaily.sku_id == sku.id,
                SKUPerformanceDaily.date >= thirty_days_ago,
            )
            .scalar()
        ) or 85.0

        # Return rate
        total_sold = (
            db.query(func.sum(SKUPerformanceDaily.units_sold))
            .filter(
                SKUPerformanceDaily.sku_id == sku.id,
                SKUPerformanceDaily.date >= thirty_days_ago,
            )
            .scalar()
        ) or 1
        total_returns = (
            db.query(func.sum(SKUPerformanceDaily.returns_qty))
            .filter(
                SKUPerformanceDaily.sku_id == sku.id,
                SKUPerformanceDaily.date >= thirty_days_ago,
            )
            .scalar()
        ) or 0
        return_rate = (total_returns / total_sold * 100) if total_sold > 0 else 0

        v_rank = velocity_rank.get(sku.id, 50)
        health_score = compute_sku_health_score(
            velocity_rank_pct=v_rank,
            gross_margin_pct=margin_pct,
            availability_pct=avg_avail,
            return_rate_pct=return_rate,
            content_score=sku.content_score or 70,
        )

        # Recommendation
        if health_score >= 70:
            recommendation = "HEALTHY — Maintain and push promotions"
        elif health_score >= 45:
            recommendation = "REVIEW — Improve availability or margin"
        elif health_score >= 25:
            recommendation = "AT RISK — Consider markdown or substitution"
        else:
            recommendation = "DELIST — Low velocity, margin, and content"

        gmv_30d = (
            db.query(func.sum(SKUPerformanceDaily.gmv))
            .filter(
                SKUPerformanceDaily.sku_id == sku.id,
                SKUPerformanceDaily.date >= thirty_days_ago,
            )
            .scalar()
        ) or 0

        results.append({
            "sku_id": sku.id,
            "sku_code": sku.sku_code,
            "product_name": sku.product_name,
            "brand": sku.brand,
            "health_score": health_score,
            "velocity_rank_pct": round(v_rank, 1),
            "gross_margin_pct": round(margin_pct, 1),
            "availability_pct": round(avg_avail, 1),
            "return_rate_pct": round(return_rate, 1),
            "content_score": sku.content_score,
            "gmv_30d": round(gmv_30d, 2),
            "recommendation": recommendation,
        })

    results.sort(key=lambda x: x["health_score"], reverse=True)
    return results
