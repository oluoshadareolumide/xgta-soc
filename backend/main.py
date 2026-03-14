"""
XGTA-SOC — FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.session import engine, SessionLocal
from app.models.models import Base
from app.api import auth, alerts, threat_actors, iocs
from app.services.auth_service import seed_admin_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — create tables and seed default admin
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_admin_if_empty(db)
    finally:
        db.close()
    print(f"✓ XGTA-SOC API started [{settings.APP_ENV}]")
    print(f"✓ Docs: http://localhost:8000/docs")
    yield
    # Shutdown
    print("XGTA-SOC API shutting down")


app = FastAPI(
    title=settings.APP_TITLE,
    version="1.0.0",
    description="Explainable Graph-Driven Threat Attribution & SOC Automation API",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,          prefix=settings.API_V1_PREFIX)
app.include_router(alerts.router,        prefix=settings.API_V1_PREFIX)
app.include_router(threat_actors.router, prefix=settings.API_V1_PREFIX)
app.include_router(iocs.router,          prefix=settings.API_V1_PREFIX)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    return JSONResponse({"status": "ok", "version": "1.0.0", "env": settings.APP_ENV})


@app.get("/", tags=["Root"])
def root():
    return {"message": "XGTA-SOC API", "docs": "/docs"}
