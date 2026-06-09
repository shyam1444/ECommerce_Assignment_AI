# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import inventory, vendors, pricing, skus, approvals, reports

app = FastAPI(
    title="Fixxly Category Leader Operating System",
    description="AI-powered category management platform for quick commerce building materials",
    version="1.0.0",
)

# CORS — allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(inventory.router)
app.include_router(vendors.router)
app.include_router(pricing.router)
app.include_router(skus.router)
app.include_router(approvals.router)
app.include_router(reports.router)


@app.on_event("startup")
def startup():
    init_db()
    # Auto-seed if empty
    from app.database import SessionLocal
    from app.models.models import SKU
    db = SessionLocal()
    try:
        count = db.query(SKU).count()
        if count == 0:
            print("🌱 Database empty — running seed data...")
            import sys
            import subprocess
            subprocess.run([sys.executable, "seed_data.py"], check=True)
    except Exception as e:
        print(f"Seed check failed: {e}")
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "name": "Fixxly CLOS API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
