"""
Fixxly Seed Data — Realistic building materials & hardware data for demo.
Run: python seed_data.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import date, datetime, timedelta
import random
import math

from app.database import SessionLocal, engine, Base
from app.models.models import (
    Category, Hub, User, SKU, Inventory, Vendor, VendorScorecard,
    PurchaseOrder, POLineItem, SKUPricing, SKUPerformanceDaily,
    ApprovalRequest, AIInsight, AuditLog
)
import uuid

def gen_id():
    return str(uuid.uuid4())

# ─── SEED ─────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("🌱 Seeding Fixxly CLOS database...")

# 1. CATEGORIES
categories_data = [
    ("Cement & Concrete", 16.0),
    ("Pipes & Plumbing", 22.0),
    ("Electrical", 25.0),
    ("Tiles & Flooring", 20.0),
    ("Paint & Waterproofing", 28.0),
    ("Steel & Iron", 12.0),
    ("Power Tools", 30.0),
    ("Adhesives & Sealants", 32.0),
]
cats = {}
for name, margin in categories_data:
    cat = Category(id=gen_id(), name=name, target_margin_pct=margin)
    db.add(cat)
    cats[name] = cat

db.flush()

# 2. HUBS
hubs_data = [
    ("Koramangala Hub", "Bengaluru"),
    ("Whitefield Hub", "Bengaluru"),
    ("Andheri Hub", "Mumbai"),
    ("Banjara Hills Hub", "Hyderabad"),
    ("T Nagar Hub", "Chennai"),
]
hubs = []
for name, city in hubs_data:
    h = Hub(id=gen_id(), name=name, city=city, is_active=True)
    db.add(h)
    hubs.append(h)

db.flush()

# 3. USERS
users_data = [
    ("Priya Sharma", "priya.sharma@fixxly.in", "CATEGORY_HEAD"),
    ("Arjun Mehta", "arjun.mehta@fixxly.in", "CATEGORY_LEADER"),
    ("Kavita Nair", "kavita.nair@fixxly.in", "CATEGORY_LEADER"),
    ("Rohit Das", "rohit.das@fixxly.in", "ANALYST"),
    ("Sneha Kapoor", "sneha.kapoor@fixxly.in", "CATEGORY_LEADER"),
]
users = []
for name, email, role in users_data:
    u = User(id=gen_id(), name=name, email=email, role=role, is_active=True)
    db.add(u)
    users.append(u)

db.flush()

# 4. SKUS — realistic building materials
skus_raw = [
    # Cement & Concrete
    ("FX-CEM-001", "UltraTech Cement OPC 43 Grade 50kg", "UltraTech", "Cement & Concrete", "BAG", 50, 400, 340, "2523", 18.0, 85,
     "OPC 43 Grade cement for general construction", {"strength": "43 MPa", "setting_time": "30 min", "type": "OPC"}),
    ("FX-CEM-002", "ACC Cement PPC 50kg Bag", "ACC", "Cement & Concrete", "BAG", 50, 380, 320, "2523", 18.0, 78,
     "Portland Pozzolana Cement for plastering and masonry", {"strength": "33 MPa", "type": "PPC"}),
    ("FX-CEM-003", "Shree Cement Roofon 50kg", "Shree Cement", "Cement & Concrete", "BAG", 50, 390, 330, "2523", 18.0, 72,
     "Specialized roofing cement with waterproofing additives", {"type": "Specialty"}),
    ("FX-CEM-004", "Ambuja Plus Cement 50kg", "Ambuja", "Cement & Concrete", "BAG", 50, 395, 335, "2523", 18.0, 80,
     "Premium OPC cement with strength enhancers", {}),

    # Pipes & Plumbing
    ("FX-PIP-001", "Finolex CPVC Hot & Cold Pipe 1 inch 3m", "Finolex", "Pipes & Plumbing", "PCS", 1, 850, 660, "3917", 18.0, 90,
     "CPVC pipe for hot and cold water applications, 3m length", {"dia": "1 inch", "length": "3m", "material": "CPVC", "pressure_rating": "1.5 MPa"}),
    ("FX-PIP-002", "Supreme UPVC Column Pipe 4 inch 3m", "Supreme", "Pipes & Plumbing", "PCS", 1, 1200, 930, "3917", 18.0, 88,
     "UPVC column pipe for borewell applications", {"dia": "4 inch", "length": "3m", "material": "UPVC"}),
    ("FX-PIP-003", "Astral CPVC Elbow 90° 1 inch", "Astral", "Pipes & Plumbing", "PCS", 10, 420, 320, "3917", 18.0, 75,
     "90-degree CPVC elbow fitting for plumbing joints", {"dia": "1 inch", "angle": "90°"}),
    ("FX-PIP-004", "Prince UPVC Ballvalve 0.75 inch", "Prince", "Pipes & Plumbing", "PCS", 5, 380, 280, "3917", 18.0, 82,
     "UPVC ball valve for water line isolation", {"size": "0.75 inch", "type": "Ball Valve"}),
    ("FX-PIP-005", "Jaquar CPVC Pipe 0.5 inch 3m", "Jaquar", "Pipes & Plumbing", "PCS", 1, 560, 420, "3917", 18.0, 91,
     "Premium CPVC pipe for bathroom and kitchen supply lines", {"dia": "0.5 inch", "length": "3m"}),

    # Electrical
    ("FX-ELE-001", "Havells 4sq mm Wire 90m Roll Red", "Havells", "Electrical", "ROLL", 1, 3200, 2400, "8544", 18.0, 92,
     "FR grade copper wire for electrical wiring", {"sq_mm": "4", "length": "90m", "colour": "Red", "grade": "FR"}),
    ("FX-ELE-002", "Finolex 2.5sq mm Wire 90m Yellow", "Finolex", "Electrical", "ROLL", 1, 2200, 1650, "8544", 18.0, 88,
     "FR copper electrical wire for light and fan wiring", {"sq_mm": "2.5", "length": "90m", "colour": "Yellow"}),
    ("FX-ELE-003", "Anchor 6A 3-Pin Modular Switch", "Anchor", "Electrical", "PCS", 10, 85, 62, "8536", 18.0, 70,
     "Modular 6A switch for light control", {"ampere": "6A", "pins": "3", "type": "Modular"}),
    ("FX-ELE-004", "Legrand 16A 2-Pin Socket with Shutter", "Legrand", "Electrical", "PCS", 5, 280, 210, "8536", 18.0, 85,
     "16A modular socket with child safety shutters", {"ampere": "16A", "pins": "2", "safety": "Shutter"}),
    ("FX-ELE-005", "Polycab 10sq mm Armoured Cable 100m", "Polycab", "Electrical", "ROLL", 1, 18500, 14000, "8544", 18.0, 94,
     "Armoured cable for underground and industrial wiring", {"sq_mm": "10", "length": "100m", "type": "Armoured"}),

    # Tiles & Flooring
    ("FX-TIL-001", "Johnson Tiles Ivory Matt 600x600mm (Box of 4)", "Johnson", "Tiles & Flooring", "BOX", 4, 1800, 1350, "6907", 18.0, 88,
     "Premium floor tiles, slip-resistant ivory finish", {"size": "600x600mm", "finish": "Matt", "pcs_per_box": 4, "sqft_per_box": "15.6"}),
    ("FX-TIL-002", "Kajaria Glazed Vitrified Tile 800x800mm Box", "Kajaria", "Tiles & Flooring", "BOX", 4, 2800, 2100, "6907", 18.0, 92,
     "GVT tiles for living room and commercial spaces", {"size": "800x800mm", "finish": "Glossy", "pcs_per_box": 4}),
    ("FX-TIL-003", "Somany Bathroom Wall Tile 300x600mm White", "Somany", "Tiles & Flooring", "BOX", 8, 1200, 890, "6907", 18.0, 80,
     "Ceramic wall tiles for bathrooms and kitchens", {"size": "300x600mm", "application": "Wall"}),

    # Paint & Waterproofing
    ("FX-PAI-001", "Asian Paints Apex Exterior Emulsion 20L", "Asian Paints", "Paint & Waterproofing", "BUCKET", 1, 5200, 3750, "3209", 18.0, 95,
     "Weather-resistant exterior wall paint with 7-year warranty", {"volume": "20L", "finish": "Sheen", "coverage": "130-160 sqft/coat"}),
    ("FX-PAI-002", "Berger WeatherCoat Anti Dust 10L", "Berger", "Paint & Waterproofing", "BUCKET", 1, 3200, 2300, "3209", 18.0, 87,
     "Dust-repellent exterior paint for tough climates", {"volume": "10L", "finish": "Matt"}),
    ("FX-PAI-003", "Dr. Fixit Roofseal Waterproofing 20L", "Dr. Fixit", "Paint & Waterproofing", "BUCKET", 1, 4800, 3500, "3214", 18.0, 90,
     "Elastomeric waterproofing compound for roofs and terraces", {"volume": "20L", "coverage": "100 sqft/coat"}),
    ("FX-PAI-004", "Dulux Weathershield Power Reserve 10L", "Dulux", "Paint & Waterproofing", "BUCKET", 1, 3600, 2600, "3209", 18.0, 91,
     "High-performance exterior paint with crack bridge technology", {"volume": "10L"}),

    # Steel & Iron
    ("FX-STL-001", "TATA Tiscon 500D TMT Bar 12mm 12m", "TATA Steel", "Steel & Iron", "PCS", 1, 8200, 7400, "7214", 18.0, 78,
     "High-strength TMT bar for RCC construction", {"dia": "12mm", "length": "12m", "grade": "Fe500D"}),
    ("FX-STL-002", "Jindal Stainless Steel Sheet 2mm 1x2m", "Jindal", "Steel & Iron", "PCS", 1, 4800, 4200, "7219", 18.0, 72,
     "304 grade stainless steel sheet for fabrication", {"thickness": "2mm", "size": "1x2m", "grade": "SS304"}),
    ("FX-STL-003", "SAIL MS Flat Bar 25x6mm 6m", "SAIL", "Steel & Iron", "PCS", 1, 1800, 1600, "7216", 18.0, 65,
     "Mild steel flat bar for general fabrication", {"size": "25x6mm", "length": "6m"}),

    # Power Tools
    ("FX-TOL-001", "Bosch GSB 13 RE Impact Drill 600W", "Bosch", "Power Tools", "PCS", 1, 3200, 2300, "8467", 18.0, 93,
     "13mm impact drill for concrete, wood and metal drilling", {"power": "600W", "speed": "3000 RPM", "chuck": "13mm", "type": "Impact"}),
    ("FX-TOL-002", "Makita GA4030 Angle Grinder 4 inch 720W", "Makita", "Power Tools", "PCS", 1, 2800, 2000, "8467", 18.0, 90,
     "Heavy-duty angle grinder for metal cutting and grinding", {"disc_size": "4 inch", "power": "720W"}),
    ("FX-TOL-003", "Stanley Hand Saw 550mm 10TPI", "Stanley", "Power Tools", "PCS", 5, 680, 490, "8202", 18.0, 82,
     "Induction-hardened hand saw for wood cutting", {"length": "550mm", "tpi": "10"}),
    ("FX-TOL-004", "Dewalt Cordless Drill Driver 18V", "Dewalt", "Power Tools", "PCS", 1, 8500, 6200, "8467", 18.0, 95,
     "Brushless cordless drill with 2 speed settings and lithium battery", {"voltage": "18V", "torque": "60 Nm", "type": "Brushless"}),

    # Adhesives & Sealants
    ("FX-ADH-001", "Fevicol SH White Carpenter Adhesive 5kg", "Fevicol", "Adhesives & Sealants", "TIN", 1, 850, 600, "3506", 18.0, 88,
     "Synthetic resin adhesive for wood joinery", {"weight": "5kg", "application": "Wood"}),
    ("FX-ADH-002", "MYK Laticrete Tile Adhesive C1 20kg", "MYK Laticrete", "Adhesives & Sealants", "BAG", 1, 980, 720, "3214", 18.0, 85,
     "Cement-based tile adhesive for floor and wall tiles", {"weight": "20kg", "class": "C1", "coverage": "4-5 sqm/bag"}),
    ("FX-ADH-003", "Sika SikaBond Construction Silicone 300ml", "Sika", "Adhesives & Sealants", "PCS", 12, 380, 275, "3214", 18.0, 90,
     "Neutral cure silicone for construction joints and glazing", {"volume": "300ml", "cure": "Neutral"}),
]

skus = []
for row in skus_raw:
    code, name, brand, cat_name, uom, pack_size, mrp, floor_p, hsn, gst, content, desc, specs = row
    sku = SKU(
        id=gen_id(), sku_code=code, product_name=name, brand=brand,
        category_id=cats[cat_name].id, uom=uom, pack_size=pack_size,
        mrp=mrp, floor_price=floor_p, hsn_code=hsn, gst_rate=gst,
        content_score=content, description=desc, specifications=specs,
        is_active=True,
    )
    db.add(sku)
    skus.append(sku)

db.flush()

# 5. VENDORS
vendors_raw = [
    ("VND-001", "UltraTech Building Products Ltd", "Suresh Rajan", "suresh@ultratech.in", "9876543210", "27AAACL0369M1Z3", 30, 5, 50000, 88.0, 90.0, 92.0, 1.5, 95.0, "GREEN"),
    ("VND-002", "Supreme Industries Hardware", "Anita Verma", "anita@supreme.in", "9876543211", "29AAACD1234M1Z1", 45, 7, 25000, 72.0, 78.0, 82.0, 3.2, 91.0, "YELLOW"),
    ("VND-003", "Havells India Limited", "Rajesh Kumar", "rajesh@havells.in", "9876543212", "07AAACH1234M1Z2", 21, 4, 75000, 91.0, 94.0, 96.0, 0.8, 98.0, "GREEN"),
    ("VND-004", "Johnson Tiles Distributors", "Preethi Nair", "preethi@johnson.in", "9876543213", "33AAABJ1234M1Z4", 30, 10, 30000, 55.0, 62.0, 70.0, 5.1, 88.0, "RED"),
    ("VND-005", "Asian Paints Trade Channel", "Karthik Patel", "karthik@asianpaints.in", "9876543214", "27AAACA1234M1Z5", 21, 3, 20000, 93.0, 95.0, 97.0, 0.5, 99.0, "GREEN"),
    ("VND-006", "TATA Steel Retail Distributors", "Sanjay Singh", "sanjay@tata.in", "9876543215", "27AAACT1234M1Z6", 60, 14, 100000, 78.0, 85.0, 88.0, 2.3, 94.0, "YELLOW"),
    ("VND-007", "Bosch Power Tools India", "Meena Sharma", "meena@bosch.in", "9876543216", "29AAACB1234M1Z7", 30, 7, 50000, 89.0, 91.0, 93.0, 1.1, 97.0, "GREEN"),
    ("VND-008", "MYK Arment Adhesives", "Vikram Reddy", "vikram@myk.in", "9876543217", "36AAAVM1234M1Z8", 30, 5, 15000, 66.0, 72.0, 76.0, 4.5, 90.0, "YELLOW"),
]

vendors = []
for row in vendors_raw:
    code, name, contact, email, phone, gstin, pay_terms, lead_t, mov, score, otif, fill, rej, price_comp, flag = row
    v = Vendor(
        id=gen_id(), vendor_code=code, vendor_name=name, contact_name=contact,
        contact_email=email, contact_phone=phone, gstin=gstin,
        payment_terms_days=pay_terms, lead_time_days=lead_t,
        min_order_value=mov, composite_score=score, otif_pct=otif,
        fill_rate_pct=fill, rejection_pct=rej, price_compliance_pct=price_comp,
        flag=flag, is_active=True,
    )
    db.add(v)
    vendors.append(v)

db.flush()

# 6. INVENTORY (all SKUs × all hubs with varied stock levels)
random.seed(42)
inv_records = []
for sku in skus:
    for hub in hubs:
        is_stocked_out = random.random() < 0.08  # 8% stockout rate
        is_low = random.random() < 0.15
        qty = 0 if is_stocked_out else (
            random.randint(2, 12) if is_low else random.randint(20, 150)
        )
        reorder_pt = random.randint(8, 20)
        safety = round(reorder_pt * 0.4, 0)
        inv = Inventory(
            id=gen_id(), sku_id=sku.id, hub_id=hub.id,
            qty_on_hand=qty,
            qty_reserved=random.randint(0, min(qty, 5)),
            qty_in_transit=random.randint(0, 20) if is_stocked_out or is_low else 0,
            reorder_point=reorder_pt,
            safety_stock=safety,
            max_stock=reorder_pt * 10,
        )
        db.add(inv)
        inv_records.append(inv)

db.flush()

# 7. SKU PRICING (per SKU × hub, with competitor prices)
for sku in skus:
    for hub in hubs:
        landed_cost = sku.floor_price * random.uniform(0.95, 1.05)
        selling_price = landed_cost * random.uniform(1.18, 1.35)
        comp_price = selling_price * random.uniform(0.88, 1.12)
        gm_pct = round((selling_price - landed_cost) / selling_price * 100, 2)

        pricing = SKUPricing(
            id=gen_id(), sku_id=sku.id, hub_id=hub.id,
            selling_price=round(selling_price, 2),
            landed_cost=round(landed_cost, 2),
            gross_margin_pct=gm_pct,
            competitor_price=round(comp_price, 2),
            comp_source="Web Scrape - Urban Company / Buildmart",
            effective_from=date.today() - timedelta(days=30),
            is_current=True,
        )
        db.add(pricing)

db.flush()

# 8. SKU PERFORMANCE DAILY (last 45 days)
today = date.today()
print("  Seeding 45 days of performance data...")
for day_offset in range(45, 0, -1):
    perf_date = today - timedelta(days=day_offset)
    for sku in skus:
        for hub in hubs:
            # Simulate demand patterns
            base_demand = random.uniform(1, 15)
            day_factor = 1.2 if perf_date.weekday() in [4, 5] else 1.0  # weekend boost
            seasonal_noise = random.uniform(0.7, 1.3)
            units = max(0, round(base_demand * day_factor * seasonal_noise, 1))

            # Get selling price
            sell_price = sku.mrp * 0.85  # approximation
            landed = sku.floor_price * 1.0
            gmv = units * sell_price
            gp = units * (sell_price - landed)
            returns_qty = units * random.uniform(0, 0.05)
            avail = 100 if units > 0 else random.uniform(60, 95)

            perf = SKUPerformanceDaily(
                id=gen_id(), sku_id=sku.id, hub_id=hub.id,
                date=perf_date,
                units_sold=units,
                gmv=round(gmv, 2),
                gross_profit=round(gp, 2),
                returns_qty=round(returns_qty, 2),
                availability_pct=round(avail, 1),
                sku_health_score=random.uniform(40, 95),
            )
            db.add(perf)

db.flush()

# 9. VENDOR SCORECARDS (last 12 weeks)
print("  Seeding vendor scorecards...")
for vendor in vendors:
    for week_offset in range(12):
        week_start = date.today() - timedelta(weeks=week_offset + 1)
        noise = lambda: random.uniform(-5, 5)
        otif = min(100, max(40, vendor.otif_pct + noise()))
        fill = min(100, max(50, vendor.fill_rate_pct + noise()))
        rej = min(15, max(0, vendor.rejection_pct + random.uniform(-1, 1)))
        pc = min(100, max(70, vendor.price_compliance_pct + noise()))
        score = (otif * 0.4 + fill * 0.3 + (100 - rej * 10) * 0.2 + pc * 0.1)
        flag = "GREEN" if score >= 80 else ("YELLOW" if score >= 60 else "RED")

        sc = VendorScorecard(
            id=gen_id(), vendor_id=vendor.id, week_start=week_start,
            otif_pct=round(otif, 1), fill_rate_pct=round(fill, 1),
            rejection_pct=round(rej, 2), price_compliance_pct=round(pc, 1),
            composite_score=round(score, 1), flag=flag,
        )
        db.add(sc)

db.flush()

# 10. PURCHASE ORDERS
print("  Seeding purchase orders...")
po_statuses = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "RECEIVED"]
for i, vendor in enumerate(vendors[:5]):
    for j in range(3):
        po_num = f"PO-2024-{str(i*10+j+1).zfill(4)}"
        status = random.choice(po_statuses)
        sku_sample = random.sample(skus, random.randint(2, 5))
        total = sum(s.floor_price * random.randint(10, 50) for s in sku_sample)

        po = PurchaseOrder(
            id=gen_id(), po_number=po_num, vendor_id=vendor.id,
            hub_id=random.choice(hubs).id,
            status=status, total_value=round(total, 2),
            created_by=users[1].id,
            approved_by=users[0].id if status in ["APPROVED", "RECEIVED"] else None,
            approved_at=datetime.utcnow() - timedelta(hours=random.randint(1, 48)) if status in ["APPROVED", "RECEIVED"] else None,
            expected_delivery=date.today() + timedelta(days=random.randint(3, 14)),
            ai_generated=random.random() > 0.5,
            notes="Auto-generated by AI Replenishment Engine" if random.random() > 0.5 else None,
        )
        db.add(po)
        db.flush()

        for sku in sku_sample:
            li = POLineItem(
                id=gen_id(), po_id=po.id, sku_id=sku.id,
                ordered_qty=random.randint(10, 100),
                unit_cost=round(sku.floor_price * random.uniform(0.9, 1.0), 2),
                received_qty=random.randint(0, 100) if status == "RECEIVED" else 0,
            )
            db.add(li)

db.flush()

# 11. APPROVAL REQUESTS
print("  Seeding approval requests...")
approval_data = [
    ("PO", "PO-2024-0015", "Auto-PO: UltraTech Cement 200 bags for Koramangala Hub — ₹80,000", 45, "LOW risk PO within standard parameters. Recommend APPROVE."),
    ("PRICE_CHANGE", "FX-PAI-001", "Asian Paints 20L: ₹5,200 → ₹5,500 (+5.8% change) — margin impact +2.1pp", 60, "Price change above threshold. Competitor price is ₹5,350. Recommend APPROVE_WITH_CONDITIONS."),
    ("PO", "PO-2024-0021", "Emergency PO: Havells Wire rolls for Andheri Hub (stockout) — ₹1,45,000", 75, "HIGH risk — large PO value AND vendor at ₹1.45L. Escalate to Category Head."),
    ("SKU_DELIST", "FX-STL-003", "Delist SAIL MS Flat Bar — health score 28/100, 12-day velocity < 0.3 units/day", 30, "Delist candidate with low velocity. Ensure no customer orders before deactivating."),
    ("PRICE_CHANGE", "FX-CEM-002", "ACC Cement: ₹380 → ₹355 (−6.6% reduction) to match competitor ₹360 price", 55, "Competitive response pricing. Margin remains above floor. Recommend APPROVE."),
    ("VENDOR_ADD", "VND-009", "New vendor: QuickBuild Plumbing Supplies — Hyderabad — evaluate for Pipes category", 40, "New vendor evaluation pending documentation verification. Recommend APPROVE_WITH_CONDITIONS."),
]
for req_type, ref_id, label, risk, rec in approval_data:
    a = ApprovalRequest(
        id=gen_id(), request_type=req_type, reference_id=ref_id,
        reference_label=label, requested_by=users[1].id, assigned_to=users[0].id,
        status="PENDING", ai_risk_score=risk, ai_recommendation=rec,
        expires_at=datetime.utcnow() + timedelta(hours=random.randint(2, 24)),
    )
    db.add(a)

db.flush()

# 12. AI INSIGHTS
print("  Seeding AI insights...")
insights_data = [
    ("INVENTORY", "CRITICAL_STOCKOUT", skus[0].id, None, hubs[0].id,
     "UltraTech Cement stocked out at Koramangala Hub. ₹24,000 GMV at risk over next 3 days. Vendor PO recommended immediately.",
     "CRITICAL", 0.96),
    ("PRICING", "COMPETITOR_UNDERCUT", skus[13].id, None, hubs[2].id,
     "Kajaria Tiles priced ₹2,800 vs competitor Urban Tiles at ₹2,450 (-12.5%). Consider ₹2,600 to balance margin and volume.",
     "WARNING", 0.88),
    ("VENDOR", "LOW_SCORECARD", None, vendors[3].id, None,
     "Johnson Tiles Distributors scored 55/100 this week (OTIF 62%, Fill Rate 70%). Recommend scheduling performance review call.",
     "WARNING", 0.92),
    ("ASSORTMENT", "DELIST_CANDIDATE", skus[21].id, None, None,
     "SAIL MS Flat Bar (FX-STL-003) has 28/100 health score. 30-day velocity: 0.3 units/day, margin 11%. Consider delist or substitution.",
     "INFO", 0.85),
    ("INVENTORY", "OVERSTOCK", skus[6].id, None, hubs[1].id,
     "Astral CPVC Elbows — 84-day cover at Whitefield Hub. ₹32,000 tied up in slow inventory. Consider return-to-vendor or hub transfer.",
     "WARNING", 0.90),
    ("PRICING", "MARGIN_EROSION", skus[19].id, None, None,
     "TATA Tiscon TMT Bar margin fell to 9.8% (target: 12%). Recent steel price hike not passed to selling price. Recommend ₹8,500 → ₹8,700.",
     "CRITICAL", 0.94),
]
for module, itype, sku_id, vendor_id, hub_id, text, sev, conf in insights_data:
    ins = AIInsight(
        id=gen_id(), module=module, insight_type=itype,
        sku_id=sku_id, vendor_id=vendor_id, hub_id=hub_id,
        insight_text=text, severity=sev, confidence=conf, status="ACTIVE",
    )
    db.add(ins)

# Commit everything
db.commit()
db.close()
print("✅ Seed complete! Database has:")
print(f"   {len(cats)} categories")
print(f"   {len(hubs)} hubs")
print(f"   {len(users)} users")
print(f"   {len(skus)} SKUs")
print(f"   {len(vendors)} vendors")
print(f"   45 days × {len(skus)} SKUs × {len(hubs)} hubs of performance data")
print(f"   6 pending approval requests")
print(f"   6 active AI insights")
print("\n🚀 Ready! Start the backend: uvicorn app.main:app --reload")
