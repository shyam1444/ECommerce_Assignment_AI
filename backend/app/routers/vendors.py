# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import func
from typing import Optional, List
from datetime import date, timedelta
from app.database import get_db
from app.models.models import Vendor, VendorScorecard, PurchaseOrder, POLineItem
from app.ai.groq_client import generate_vendor_email
# pyrefly: ignore [missing-import]
from pydantic import BaseModel

router = APIRouter(prefix="/vendors", tags=["Vendor Management"])


@router.get("/")
def list_vendors(active_only: bool = True, db: Session = Depends(get_db)):
    """List all vendors with latest scorecard."""
    query = db.query(Vendor)
    if active_only:
        query = query.filter(Vendor.is_active == True)
    vendors = query.order_by(Vendor.composite_score.desc()).all()

    result = []
    for v in vendors:
        # Latest scorecard
        latest_sc = (
            db.query(VendorScorecard)
            .filter(VendorScorecard.vendor_id == v.id)
            .order_by(VendorScorecard.week_start.desc())
            .first()
        )
        # PO count
        po_count = db.query(func.count(PurchaseOrder.id)).filter(
            PurchaseOrder.vendor_id == v.id
        ).scalar() or 0

        result.append({
            "id": v.id,
            "vendor_code": v.vendor_code,
            "vendor_name": v.vendor_name,
            "contact_name": v.contact_name,
            "contact_email": v.contact_email,
            "payment_terms_days": v.payment_terms_days,
            "lead_time_days": v.lead_time_days,
            "min_order_value": v.min_order_value,
            "composite_score": v.composite_score,
            "otif_pct": v.otif_pct,
            "fill_rate_pct": v.fill_rate_pct,
            "rejection_pct": v.rejection_pct,
            "price_compliance_pct": v.price_compliance_pct,
            "flag": v.flag,
            "is_active": v.is_active,
            "total_pos": po_count,
            "latest_scorecard": {
                "week_start": str(latest_sc.week_start) if latest_sc else None,
                "composite_score": latest_sc.composite_score if latest_sc else v.composite_score,
                "flag": latest_sc.flag if latest_sc else v.flag,
            } if latest_sc else None,
        })
    return result


@router.get("/{vendor_id}")
def get_vendor(vendor_id: str, db: Session = Depends(get_db)):
    """Get vendor details with scorecard history."""
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(404, "Vendor not found")

    scorecards = (
        db.query(VendorScorecard)
        .filter(VendorScorecard.vendor_id == vendor_id)
        .order_by(VendorScorecard.week_start.desc())
        .limit(12)
        .all()
    )

    pos = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.vendor_id == vendor_id)
        .order_by(PurchaseOrder.created_at.desc())
        .limit(10)
        .all()
    )

    return {
        "vendor": {
            "id": vendor.id,
            "vendor_code": vendor.vendor_code,
            "vendor_name": vendor.vendor_name,
            "contact_name": vendor.contact_name,
            "contact_email": vendor.contact_email,
            "contact_phone": vendor.contact_phone,
            "gstin": vendor.gstin,
            "payment_terms_days": vendor.payment_terms_days,
            "lead_time_days": vendor.lead_time_days,
            "composite_score": vendor.composite_score,
            "flag": vendor.flag,
        },
        "scorecard_history": [
            {
                "week_start": str(sc.week_start),
                "otif_pct": sc.otif_pct,
                "fill_rate_pct": sc.fill_rate_pct,
                "rejection_pct": sc.rejection_pct,
                "price_compliance_pct": sc.price_compliance_pct,
                "composite_score": sc.composite_score,
                "flag": sc.flag,
            }
            for sc in scorecards
        ],
        "recent_pos": [
            {
                "po_number": po.po_number,
                "status": po.status,
                "total_value": po.total_value,
                "created_at": po.created_at.isoformat() if po.created_at else None,
            }
            for po in pos
        ],
    }


@router.get("/scorecards/summary")
def vendor_scorecard_summary(db: Session = Depends(get_db)):
    """Summary of vendor scorecard flags."""
    vendors = db.query(Vendor).filter(Vendor.is_active == True).all()
    green = sum(1 for v in vendors if v.flag == "GREEN")
    yellow = sum(1 for v in vendors if v.flag == "YELLOW")
    red = sum(1 for v in vendors if v.flag == "RED")
    avg_score = sum(v.composite_score for v in vendors) / max(len(vendors), 1)

    return {
        "total_vendors": len(vendors),
        "green": green,
        "yellow": yellow,
        "red": red,
        "average_score": round(avg_score, 1),
        "vendors_needing_attention": [
            {"id": v.id, "name": v.vendor_name, "score": v.composite_score, "flag": v.flag}
            for v in vendors if v.flag in ("YELLOW", "RED")
        ],
    }


class EmailRequest(BaseModel):
    vendor_id: str
    issue_type: str   # DELIVERY_DELAY, QUALITY_ISSUE, PRICE_MISMATCH, SHORTAGE, GENERAL
    details: str


@router.post("/draft-email")
def draft_vendor_email(req: EmailRequest, db: Session = Depends(get_db)):
    """AI-draft a vendor communication email."""
    vendor = db.query(Vendor).filter(Vendor.id == req.vendor_id).first()
    if not vendor:
        raise HTTPException(404, "Vendor not found")

    email_draft = generate_vendor_email(
        vendor_name=vendor.vendor_name,
        issue_type=req.issue_type,
        details=req.details,
    )
    return {"vendor_name": vendor.vendor_name, "email_draft": email_draft}


@router.get("/performance/trend/{vendor_id}")
def vendor_performance_trend(vendor_id: str, db: Session = Depends(get_db)):
    """12-week scorecard trend for charts."""
    scorecards = (
        db.query(VendorScorecard)
        .filter(VendorScorecard.vendor_id == vendor_id)
        .order_by(VendorScorecard.week_start)
        .limit(12)
        .all()
    )
    return [
        {
            "week": str(sc.week_start),
            "otif": sc.otif_pct,
            "fill_rate": sc.fill_rate_pct,
            "composite": sc.composite_score,
        }
        for sc in scorecards
    ]
