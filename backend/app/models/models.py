import uuid
from datetime import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String, Float, Boolean, Integer, DateTime, Text, ForeignKey, Date, JSON
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.database import Base

def gen_id():
    return str(uuid.uuid4())

# ─────────────────────────────────────────────────────────────
# LOOKUP TABLES
# ─────────────────────────────────────────────────────────────
class Category(Base):
    __tablename__ = "categories"
    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String(100), unique=True)
    target_margin_pct = Column(Float, default=18.0)
    skus = relationship("SKU", back_populates="category")

class Hub(Base):
    __tablename__ = "hubs"
    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String(100))
    city = Column(String(50))
    is_active = Column(Boolean, default=True)

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String(100))
    email = Column(String(200), unique=True)
    role = Column(String(50))  # ADMIN, CATEGORY_HEAD, CATEGORY_LEADER, ANALYST
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# ─────────────────────────────────────────────────────────────
# SKU / PRODUCT
# ─────────────────────────────────────────────────────────────
class SKU(Base):
    __tablename__ = "skus"
    id = Column(String, primary_key=True, default=gen_id)
    sku_code = Column(String(50), unique=True)
    product_name = Column(Text)
    brand = Column(String(200))
    category_id = Column(String, ForeignKey("categories.id"))
    uom = Column(String(20))
    pack_size = Column(Float)
    mrp = Column(Float)
    floor_price = Column(Float)
    hsn_code = Column(String(10))
    gst_rate = Column(Float, default=18.0)
    is_active = Column(Boolean, default=True)
    content_score = Column(Integer, default=70)
    description = Column(Text)
    specifications = Column(JSON)
    image_url = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("Category", back_populates="skus")
    inventory = relationship("Inventory", back_populates="sku")
    pricing = relationship("SKUPricing", back_populates="sku")
    performance = relationship("SKUPerformanceDaily", back_populates="sku")

# ─────────────────────────────────────────────────────────────
# INVENTORY
# ─────────────────────────────────────────────────────────────
class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(String, primary_key=True, default=gen_id)
    sku_id = Column(String, ForeignKey("skus.id"), index=True)
    hub_id = Column(String, ForeignKey("hubs.id"), index=True)
    qty_on_hand = Column(Float, default=0)
    qty_reserved = Column(Float, default=0)
    qty_in_transit = Column(Float, default=0)
    reorder_point = Column(Float, default=10)
    safety_stock = Column(Float, default=5)
    max_stock = Column(Float, default=200)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sku = relationship("SKU", back_populates="inventory")
    hub = relationship("Hub")

class DemandForecast(Base):
    __tablename__ = "demand_forecasts"
    id = Column(String, primary_key=True, default=gen_id)
    sku_id = Column(String, ForeignKey("skus.id"))
    hub_id = Column(String, ForeignKey("hubs.id"))
    forecast_date = Column(Date)
    horizon_days = Column(Integer)
    predicted_qty = Column(Float)
    lower_bound = Column(Float)
    upper_bound = Column(Float)
    model_version = Column(String(50), default="v1.0")
    created_at = Column(DateTime, default=datetime.utcnow)

# ─────────────────────────────────────────────────────────────
# VENDOR & PO
# ─────────────────────────────────────────────────────────────
class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(String, primary_key=True, default=gen_id)
    vendor_code = Column(String(50), unique=True)
    vendor_name = Column(String(200))
    contact_name = Column(String(100))
    contact_email = Column(String(200))
    contact_phone = Column(String(20))
    gstin = Column(String(15))
    payment_terms_days = Column(Integer, default=30)
    lead_time_days = Column(Integer, default=7)
    min_order_value = Column(Float, default=5000)
    composite_score = Column(Float, default=75.0)
    otif_pct = Column(Float, default=85.0)
    fill_rate_pct = Column(Float, default=90.0)
    rejection_pct = Column(Float, default=2.0)
    price_compliance_pct = Column(Float, default=95.0)
    flag = Column(String(10), default="GREEN")  # GREEN, YELLOW, RED
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    purchase_orders = relationship("PurchaseOrder", back_populates="vendor")

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(String, primary_key=True, default=gen_id)
    po_number = Column(String(50), unique=True)
    vendor_id = Column(String, ForeignKey("vendors.id"))
    hub_id = Column(String, ForeignKey("hubs.id"))
    status = Column(String(20), default="DRAFT")  # DRAFT, PENDING_APPROVAL, APPROVED, SENT, RECEIVED, CANCELLED
    total_value = Column(Float, default=0)
    created_by = Column(String, ForeignKey("users.id"))
    approved_by = Column(String, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    expected_delivery = Column(Date, nullable=True)
    ai_generated = Column(Boolean, default=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    vendor = relationship("Vendor", back_populates="purchase_orders")
    hub = relationship("Hub")
    line_items = relationship("POLineItem", back_populates="po")

class POLineItem(Base):
    __tablename__ = "po_line_items"
    id = Column(String, primary_key=True, default=gen_id)
    po_id = Column(String, ForeignKey("purchase_orders.id"))
    sku_id = Column(String, ForeignKey("skus.id"))
    ordered_qty = Column(Float)
    unit_cost = Column(Float)
    received_qty = Column(Float, default=0)

    po = relationship("PurchaseOrder", back_populates="line_items")
    sku = relationship("SKU")

# ─────────────────────────────────────────────────────────────
# PRICING
# ─────────────────────────────────────────────────────────────
class SKUPricing(Base):
    __tablename__ = "sku_pricing"
    id = Column(String, primary_key=True, default=gen_id)
    sku_id = Column(String, ForeignKey("skus.id"), index=True)
    hub_id = Column(String, ForeignKey("hubs.id"), index=True)
    selling_price = Column(Float)
    landed_cost = Column(Float)
    gross_margin_pct = Column(Float)
    competitor_price = Column(Float, nullable=True)
    comp_source = Column(String(100))
    price_change_approved_by = Column(String, nullable=True)
    effective_from = Column(Date)
    is_current = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    sku = relationship("SKU", back_populates="pricing")
    hub = relationship("Hub")

# ─────────────────────────────────────────────────────────────
# SKU PERFORMANCE (daily aggregates)
# ─────────────────────────────────────────────────────────────
class SKUPerformanceDaily(Base):
    __tablename__ = "sku_performance_daily"
    id = Column(String, primary_key=True, default=gen_id)
    sku_id = Column(String, ForeignKey("skus.id"), index=True)
    hub_id = Column(String, ForeignKey("hubs.id"), index=True)
    date = Column(Date, index=True)
    units_sold = Column(Float, default=0)
    gmv = Column(Float, default=0)
    gross_profit = Column(Float, default=0)
    returns_qty = Column(Float, default=0)
    availability_pct = Column(Float, default=100)
    sku_health_score = Column(Float, default=50)

    sku = relationship("SKU", back_populates="performance")
    hub = relationship("Hub")

# ─────────────────────────────────────────────────────────────
# APPROVAL WORKFLOW
# ─────────────────────────────────────────────────────────────
class ApprovalRequest(Base):
    __tablename__ = "approval_requests"
    id = Column(String, primary_key=True, default=gen_id)
    request_type = Column(String(50))   # PO, PRICE_CHANGE, SKU_DELIST, VENDOR_ADD, PROMO
    reference_id = Column(String)
    reference_label = Column(String(300))
    requested_by = Column(String, ForeignKey("users.id"))
    assigned_to = Column(String, ForeignKey("users.id"))
    status = Column(String(20), default="PENDING")  # PENDING, APPROVED, REJECTED, ESCALATED
    ai_risk_score = Column(Integer, default=50)
    ai_recommendation = Column(Text)
    action_comment = Column(Text)
    actioned_by = Column(String, nullable=True)
    actioned_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    requester = relationship("User", foreign_keys=[requested_by])
    assignee = relationship("User", foreign_keys=[assigned_to])

# ─────────────────────────────────────────────────────────────
# AI INSIGHTS
# ─────────────────────────────────────────────────────────────
class AIInsight(Base):
    __tablename__ = "ai_insights"
    id = Column(String, primary_key=True, default=gen_id)
    module = Column(String(50))
    insight_type = Column(String(100))
    sku_id = Column(String, nullable=True)
    vendor_id = Column(String, nullable=True)
    hub_id = Column(String, nullable=True)
    insight_text = Column(Text)
    severity = Column(String(20), default="INFO")  # CRITICAL, WARNING, INFO
    confidence = Column(Float, default=0.85)
    status = Column(String(20), default="ACTIVE")  # ACTIVE, ACTIONED, DISMISSED
    created_at = Column(DateTime, default=datetime.utcnow)

# ─────────────────────────────────────────────────────────────
# AUDIT LOG
# ─────────────────────────────────────────────────────────────
class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(String, primary_key=True, default=gen_id)
    table_name = Column(String(100))
    record_id = Column(String)
    action = Column(String(20))
    actor_id = Column(String)
    actor_name = Column(String(100))
    old_value = Column(JSON)
    new_value = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

# ─────────────────────────────────────────────────────────────
# VENDOR SCORECARD (weekly snapshot)
# ─────────────────────────────────────────────────────────────
class VendorScorecard(Base):
    __tablename__ = "vendor_scorecards"
    id = Column(String, primary_key=True, default=gen_id)
    vendor_id = Column(String, ForeignKey("vendors.id"), index=True)
    week_start = Column(Date)
    otif_pct = Column(Float)
    fill_rate_pct = Column(Float)
    rejection_pct = Column(Float)
    price_compliance_pct = Column(Float)
    composite_score = Column(Float)
    flag = Column(String(10))
    created_at = Column(DateTime, default=datetime.utcnow)

    vendor = relationship("Vendor")
