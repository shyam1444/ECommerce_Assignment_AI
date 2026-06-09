"""
Replenishment service — demand forecasting, EOQ, safety stock, reorder alerts.
Uses simple statistical models (no Prophet dependency required for demo).
"""
import math
import random
from datetime import date, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.models import Inventory, SKU, DemandForecast, SKUPerformanceDaily
from app.config import get_settings

settings = get_settings()


def calculate_eoq(annual_demand: float, order_cost: float = 500.0,
                  unit_cost: float = 100.0, holding_rate: float = 0.20) -> float:
    """Economic Order Quantity formula."""
    if unit_cost <= 0 or holding_rate <= 0:
        return annual_demand / 12
    holding_cost = unit_cost * holding_rate
    return math.sqrt((2 * annual_demand * order_cost) / holding_cost)


def calculate_safety_stock(avg_daily_demand: float, demand_std: float,
                            lead_time_days: int, service_level: float = 0.95) -> float:
    """Safety Stock = Z × σ(demand) × √(lead_time)"""
    # Z-scores for common service levels
    z_scores = {0.90: 1.28, 0.95: 1.65, 0.98: 2.05, 0.99: 2.33}
    z = z_scores.get(service_level, 1.65)
    return z * demand_std * math.sqrt(lead_time_days)


def calculate_reorder_point(avg_daily_demand: float, lead_time_days: int,
                             safety_stock: float) -> float:
    """Reorder Point = (ADU × LT) + Safety Stock"""
    return (avg_daily_demand * lead_time_days) + safety_stock


def get_inventory_alerts(db: Session) -> List[dict]:
    """
    Scan inventory table and generate alerts:
    CRITICAL = stock == 0
    WARNING  = stock < reorder_point
    WATCH    = stock < reorder_point * 1.5
    OVERSTOCK = cover > 60 days
    """
    from app.models.models import Hub
    
    inventory_records = (
        db.query(Inventory, SKU, Hub)
        .join(SKU, Inventory.sku_id == SKU.id)
        .join(Hub, Inventory.hub_id == Hub.id)
        .filter(SKU.is_active == True)
        .all()
    )

    alerts = []
    for inv, sku, hub in inventory_records:
        available = inv.qty_on_hand - inv.qty_reserved
        
        # Get 7-day average daily demand from performance table
        perf = (
            db.query(SKUPerformanceDaily)
            .filter(
                SKUPerformanceDaily.sku_id == sku.id,
                SKUPerformanceDaily.hub_id == hub.id,
            )
            .order_by(SKUPerformanceDaily.date.desc())
            .limit(7)
            .all()
        )
        avg_daily_demand = (
            sum(p.units_sold for p in perf) / len(perf) if perf else 1.0
        )
        
        cover_days = (available / avg_daily_demand) if avg_daily_demand > 0 else 999

        status = "OK"
        priority = 0
        if available <= 0:
            status = "CRITICAL"
            priority = 100
        elif available < inv.reorder_point:
            status = "WARNING"
            priority = 70
        elif available < inv.reorder_point * 1.5:
            status = "WATCH"
            priority = 40
        elif cover_days > settings.OVERSTOCK_COVER_DAYS:
            status = "OVERSTOCK"
            priority = 30

        gmv_at_risk = round(avg_daily_demand * 3 * getattr(sku, "mrp", 0), 2)

        alerts.append({
            "sku_id": sku.id,
            "sku_code": sku.sku_code,
            "product_name": sku.product_name,
            "hub_id": hub.id,
            "hub_name": hub.name,
            "city": hub.city,
            "qty_on_hand": inv.qty_on_hand,
            "qty_in_transit": inv.qty_in_transit,
            "reorder_point": inv.reorder_point,
            "safety_stock": inv.safety_stock,
            "cover_days": round(cover_days, 1),
            "avg_daily_demand": round(avg_daily_demand, 2),
            "status": status,
            "priority": priority,
            "gmv_at_risk": gmv_at_risk,
        })

    # Sort by priority descending
    return sorted(alerts, key=lambda x: x["priority"], reverse=True)


def generate_demand_forecast(db: Session, sku_id: str, hub_id: str,
                              horizon_days: int = 14) -> dict:
    """
    Simple demand forecast using exponential smoothing on last 30 days.
    In production, replace with Prophet/LightGBM from MLflow.
    """
    perf_records = (
        db.query(SKUPerformanceDaily)
        .filter(
            SKUPerformanceDaily.sku_id == sku_id,
            SKUPerformanceDaily.hub_id == hub_id,
        )
        .order_by(SKUPerformanceDaily.date.desc())
        .limit(30)
        .all()
    )

    if not perf_records:
        # No history → use a small default
        avg_daily = 2.0
        std_daily = 0.5
    else:
        sales = [p.units_sold for p in perf_records]
        avg_daily = sum(sales) / len(sales)
        variance = sum((s - avg_daily) ** 2 for s in sales) / len(sales)
        std_daily = math.sqrt(variance)

    # Simple exponential smoothing (alpha = 0.3)
    alpha = 0.3
    smoothed = avg_daily
    for p in reversed(perf_records):
        smoothed = alpha * p.units_sold + (1 - alpha) * smoothed

    predicted = round(smoothed * horizon_days, 2)
    lower = round(max(0, predicted - 1.65 * std_daily * math.sqrt(horizon_days)), 2)
    upper = round(predicted + 1.65 * std_daily * math.sqrt(horizon_days), 2)

    return {
        "sku_id": sku_id,
        "hub_id": hub_id,
        "horizon_days": horizon_days,
        "avg_daily_demand": round(smoothed, 3),
        "predicted_qty": predicted,
        "lower_bound": lower,
        "upper_bound": upper,
        "model": "exponential_smoothing_v1",
    }
