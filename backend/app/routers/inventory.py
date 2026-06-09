# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from sqlalchemy import func, desc
from datetime import date, timedelta
from typing import List, Optional
from app.database import get_db
from app.models.models import (
    SKU, Inventory, SKUPerformanceDaily, SKUPricing,
    PurchaseOrder, POLineItem, DemandForecast, AIInsight, Hub
)
from app.services.replenishment import get_inventory_alerts, generate_demand_forecast, calculate_eoq, calculate_safety_stock
from app.ai.groq_client import generate_po_recommendation
# pyrefly: ignore [missing-import]
from pydantic import BaseModel

router = APIRouter(prefix="/inventory", tags=["Inventory & Replenishment"])


@router.get("/alerts")
def inventory_alerts(db: Session = Depends(get_db)):
    """Get all inventory alerts sorted by priority."""
    return get_inventory_alerts(db)


@router.get("/summary")
def inventory_summary(db: Session = Depends(get_db)):
    """High-level inventory KPIs for the cockpit."""
    from app.models.models import Hub
    total_skus = db.query(SKU).filter(SKU.is_active == True).count()
    
    stockout_count = (
        db.query(Inventory)
        .filter(Inventory.qty_on_hand <= 0)
        .count()
    )
    low_stock = (
        db.query(func.count(Inventory.id))
        .filter(Inventory.qty_on_hand < Inventory.reorder_point, Inventory.qty_on_hand > 0)
        .scalar()
    ) or 0
    
    total_value = (
        db.query(func.sum(Inventory.qty_on_hand * SKUPricing.landed_cost))
        .join(SKUPricing, Inventory.sku_id == SKUPricing.sku_id)
        .filter(SKUPricing.is_current == True)
        .scalar()
    ) or 0

    fill_rate = round((1 - stockout_count / max(total_skus, 1)) * 100, 1)

    return {
        "total_active_skus": total_skus,
        "stockout_count": stockout_count,
        "low_stock_count": low_stock,
        "healthy_count": total_skus - stockout_count - low_stock,
        "fill_rate_pct": fill_rate,
        "total_inventory_value": round(total_value, 2),
        "as_of": date.today().isoformat(),
    }


@router.get("/stock-levels")
def stock_levels(hub_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Get stock levels for all SKUs with cover days."""
    query = (
        db.query(Inventory, SKU, Hub)
        .join(SKU, Inventory.sku_id == SKU.id)
        .join(Hub, Inventory.hub_id == Hub.id)
        .filter(SKU.is_active == True)
    )
    if hub_id:
        query = query.filter(Inventory.hub_id == hub_id)

    records = query.order_by(Inventory.qty_on_hand).all()
    result = []
    for inv, sku, hub in records:
        result.append({
            "sku_id": sku.id,
            "sku_code": sku.sku_code,
            "product_name": sku.product_name,
            "brand": sku.brand,
            "hub": hub.name,
            "city": hub.city,
            "qty_on_hand": inv.qty_on_hand,
            "qty_reserved": inv.qty_reserved,
            "qty_in_transit": inv.qty_in_transit,
            "available": inv.qty_on_hand - inv.qty_reserved,
            "reorder_point": inv.reorder_point,
            "safety_stock": inv.safety_stock,
            "max_stock": inv.max_stock,
            "last_updated": inv.last_updated.isoformat() if inv.last_updated else None,
        })
    return result


@router.get("/forecast/{sku_id}/{hub_id}")
def get_forecast(sku_id: str, hub_id: str, horizon: int = 14, db: Session = Depends(get_db)):
    """Generate demand forecast for a SKU at a hub."""
    return generate_demand_forecast(db, sku_id, hub_id, horizon)


@router.get("/po-recommendation/{sku_id}/{hub_id}")
def po_recommendation(sku_id: str, hub_id: str, db: Session = Depends(get_db)):
    """Generate AI-powered PO recommendation for a specific SKU+hub."""
    sku = db.query(SKU).filter(SKU.id == sku_id).first()
    if not sku:
        raise HTTPException(404, "SKU not found")

    inv = db.query(Inventory).filter(
        Inventory.sku_id == sku_id, Inventory.hub_id == hub_id
    ).first()

    pricing = db.query(SKUPricing).filter(
        SKUPricing.sku_id == sku_id, SKUPricing.is_current == True
    ).first()

    forecast = generate_demand_forecast(db, sku_id, hub_id, 14)

    # Find vendor for this SKU (use first active vendor as proxy)
    from app.models.models import Vendor
    vendor = db.query(Vendor).filter(Vendor.is_active == True).first()
    vendor_name = vendor.vendor_name if vendor else "Default Vendor"
    lead_time = vendor.lead_time_days if vendor else 7

    return generate_po_recommendation(
        sku_name=sku.product_name,
        vendor=vendor_name,
        current_stock=inv.qty_on_hand if inv else 0,
        reorder_point=inv.reorder_point if inv else 10,
        forecast_qty=forecast["predicted_qty"],
        lead_time_days=lead_time,
        landed_cost=pricing.landed_cost if pricing else (sku.mrp or 100) * 0.75,
    )


@router.get("/hubs")
def list_hubs(db: Session = Depends(get_db)):
    """List all hubs."""
    hubs = db.query(Hub).filter(Hub.is_active == True).all()
    return [{"id": h.id, "name": h.name, "city": h.city} for h in hubs]


@router.get("/velocity-trend/{sku_id}")
def velocity_trend(sku_id: str, days: int = 30, db: Session = Depends(get_db)):
    """Get daily sales trend for a SKU across all hubs."""
    from_date = date.today() - timedelta(days=days)
    records = (
        db.query(
            SKUPerformanceDaily.date,
            func.sum(SKUPerformanceDaily.units_sold).label("total_units"),
            func.sum(SKUPerformanceDaily.gmv).label("total_gmv"),
        )
        .filter(
            SKUPerformanceDaily.sku_id == sku_id,
            SKUPerformanceDaily.date >= from_date,
        )
        .group_by(SKUPerformanceDaily.date)
        .order_by(SKUPerformanceDaily.date)
        .all()
    )
    return [
        {"date": str(r.date), "units": float(r.total_units or 0), "gmv": float(r.total_gmv or 0)}
        for r in records
    ]
