# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import func
from datetime import date, timedelta
from app.database import get_db
from app.models.models import SKUPerformanceDaily, SKU, Category, Inventory, Vendor, ApprovalRequest, AIInsight
from app.ai.groq_client import generate_dbr_narrative

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])


@router.get("/cockpit")
def executive_cockpit(db: Session = Depends(get_db)):
    """Main cockpit data — all KPIs for the executive dashboard."""
    today = date.today()
    yesterday = today - timedelta(days=1)
    last_week = today - timedelta(days=7)
    last_30 = today - timedelta(days=30)

    # Today's GMV
    gmv_today = db.query(func.sum(SKUPerformanceDaily.gmv)).filter(
        SKUPerformanceDaily.date == yesterday
    ).scalar() or 0

    gmv_7d = db.query(func.sum(SKUPerformanceDaily.gmv)).filter(
        SKUPerformanceDaily.date >= last_week
    ).scalar() or 0

    gmv_30d = db.query(func.sum(SKUPerformanceDaily.gmv)).filter(
        SKUPerformanceDaily.date >= last_30
    ).scalar() or 0

    gp_7d = db.query(func.sum(SKUPerformanceDaily.gross_profit)).filter(
        SKUPerformanceDaily.date >= last_week
    ).scalar() or 0

    # Stockout count
    stockout_count = db.query(Inventory).filter(Inventory.qty_on_hand <= 0).count()
    low_stock = db.query(Inventory).filter(
        Inventory.qty_on_hand < Inventory.reorder_point,
        Inventory.qty_on_hand > 0,
    ).count()

    total_skus = db.query(SKU).filter(SKU.is_active == True).count()
    fill_rate = round((1 - stockout_count / max(total_skus, 1)) * 100, 1)

    # Vendor health
    red_vendors = db.query(Vendor).filter(Vendor.flag == "RED", Vendor.is_active == True).count()
    yellow_vendors = db.query(Vendor).filter(Vendor.flag == "YELLOW", Vendor.is_active == True).count()

    # Pending approvals
    pending_approvals = db.query(ApprovalRequest).filter(ApprovalRequest.status == "PENDING").count()
    high_risk_approvals = db.query(ApprovalRequest).filter(
        ApprovalRequest.status == "PENDING", ApprovalRequest.ai_risk_score >= 70
    ).count()

    # Margin
    margin_pct_7d = round(gp_7d / max(gmv_7d, 1) * 100, 2)

    # Top 5 categories by GMV
    top_categories = (
        db.query(Category.name, func.sum(SKUPerformanceDaily.gmv).label("gmv"))
        .join(SKU, SKUPerformanceDaily.sku_id == SKU.id)
        .join(Category, SKU.category_id == Category.id)
        .filter(SKUPerformanceDaily.date >= last_30)
        .group_by(Category.name)
        .order_by(func.sum(SKUPerformanceDaily.gmv).desc())
        .limit(5)
        .all()
    )

    # GMV trend (last 14 days)
    gmv_trend = (
        db.query(SKUPerformanceDaily.date, func.sum(SKUPerformanceDaily.gmv).label("gmv"))
        .filter(SKUPerformanceDaily.date >= today - timedelta(days=14))
        .group_by(SKUPerformanceDaily.date)
        .order_by(SKUPerformanceDaily.date)
        .all()
    )

    # Active AI insights
    insights = (
        db.query(AIInsight)
        .filter(AIInsight.status == "ACTIVE")
        .order_by(AIInsight.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "kpis": {
            "gmv_today": round(float(gmv_today), 2),
            "gmv_7d": round(float(gmv_7d), 2),
            "gmv_30d": round(float(gmv_30d), 2),
            "gross_margin_pct_7d": margin_pct_7d,
            "fill_rate_pct": fill_rate,
            "stockout_count": stockout_count,
            "low_stock_count": low_stock,
            "total_active_skus": total_skus,
            "pending_approvals": pending_approvals,
            "high_risk_approvals": high_risk_approvals,
            "red_vendors": red_vendors,
            "yellow_vendors": yellow_vendors,
        },
        "top_categories": [
            {"name": c.name, "gmv": round(float(c.gmv or 0), 2)}
            for c in top_categories
        ],
        "gmv_trend": [
            {"date": str(r.date), "gmv": round(float(r.gmv or 0), 2)}
            for r in gmv_trend
        ],
        "ai_insights": [
            {
                "id": i.id,
                "module": i.module,
                "insight_type": i.insight_type,
                "insight_text": i.insight_text,
                "severity": i.severity,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            }
            for i in insights
        ],
    }


@router.get("/daily-business-review")
def daily_business_review(db: Session = Depends(get_db)):
    """Generate AI-powered Daily Business Review."""
    today = date.today()
    last_7 = today - timedelta(days=7)

    # Build data context
    gmv_7d = float(db.query(func.sum(SKUPerformanceDaily.gmv)).filter(
        SKUPerformanceDaily.date >= last_7).scalar() or 0)
    gp_7d = float(db.query(func.sum(SKUPerformanceDaily.gross_profit)).filter(
        SKUPerformanceDaily.date >= last_7).scalar() or 0)
    units_7d = float(db.query(func.sum(SKUPerformanceDaily.units_sold)).filter(
        SKUPerformanceDaily.date >= last_7).scalar() or 0)
    stockouts = db.query(Inventory).filter(Inventory.qty_on_hand <= 0).count()
    pending_po = db.query(ApprovalRequest).filter(
        ApprovalRequest.status == "PENDING",
        ApprovalRequest.request_type == "PO",
    ).count()

    # Top categories
    top_cats = (
        db.query(Category.name, func.sum(SKUPerformanceDaily.gmv).label("gmv"))
        .join(SKU, SKUPerformanceDaily.sku_id == SKU.id)
        .join(Category, SKU.category_id == Category.id)
        .filter(SKUPerformanceDaily.date >= last_7)
        .group_by(Category.name)
        .order_by(func.sum(SKUPerformanceDaily.gmv).desc())
        .limit(3)
        .all()
    )

    data = {
        "report_date": today.isoformat(),
        "period": "Last 7 days",
        "gmv_inr": round(gmv_7d, 2),
        "gross_profit_inr": round(gp_7d, 2),
        "gross_margin_pct": round(gp_7d / max(gmv_7d, 1) * 100, 2),
        "units_sold": round(units_7d, 0),
        "active_stockouts": stockouts,
        "pending_po_approvals": pending_po,
        "top_categories": [{"name": c.name, "gmv": round(float(c.gmv or 0), 2)} for c in top_cats],
        "vendor_issues": db.query(Vendor).filter(Vendor.flag == "RED").count(),
        "gmv_target_inr": 2000000,
        "margin_target_pct": 18.0,
    }

    narrative = generate_dbr_narrative(data)
    return {
        "report_date": today.isoformat(),
        "data": data,
        "narrative": narrative,
    }


@router.get("/gmv-trend")
def gmv_trend(days: int = 30, db: Session = Depends(get_db)):
    """Daily GMV trend for chart."""
    from_date = date.today() - timedelta(days=days)
    records = (
        db.query(
            SKUPerformanceDaily.date,
            func.sum(SKUPerformanceDaily.gmv).label("gmv"),
            func.sum(SKUPerformanceDaily.gross_profit).label("gp"),
            func.sum(SKUPerformanceDaily.units_sold).label("units"),
        )
        .filter(SKUPerformanceDaily.date >= from_date)
        .group_by(SKUPerformanceDaily.date)
        .order_by(SKUPerformanceDaily.date)
        .all()
    )
    return [
        {
            "date": str(r.date),
            "gmv": round(float(r.gmv or 0), 2),
            "gross_profit": round(float(r.gp or 0), 2),
            "units": round(float(r.units or 0), 0),
        }
        for r in records
    ]


@router.get("/category-performance")
def category_performance(days: int = 30, db: Session = Depends(get_db)):
    """Category-level performance breakdown."""
    from_date = date.today() - timedelta(days=days)
    results = (
        db.query(
            Category.name,
            Category.target_margin_pct,
            func.sum(SKUPerformanceDaily.gmv).label("gmv"),
            func.sum(SKUPerformanceDaily.gross_profit).label("gp"),
            func.sum(SKUPerformanceDaily.units_sold).label("units"),
            func.count(SKU.id.distinct()).label("sku_count"),
        )
        .join(SKU, SKUPerformanceDaily.sku_id == SKU.id)
        .join(Category, SKU.category_id == Category.id)
        .filter(SKUPerformanceDaily.date >= from_date)
        .group_by(Category.name, Category.target_margin_pct)
        .all()
    )

    return [
        {
            "category": r.name,
            "gmv": round(float(r.gmv or 0), 2),
            "gross_profit": round(float(r.gp or 0), 2),
            "units_sold": round(float(r.units or 0), 0),
            "margin_pct": round(float(r.gp or 0) / max(float(r.gmv or 1), 1) * 100, 2),
            "target_margin_pct": r.target_margin_pct,
            "sku_count": r.sku_count,
            "on_target": (float(r.gp or 0) / max(float(r.gmv or 1), 1) * 100) >= r.target_margin_pct,
        }
        for r in results
    ]
