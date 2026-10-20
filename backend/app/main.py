from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import query_one
from app.api import (
    auth, patients, visits, prescriptions, safety, vitals,
    tests_treatments, emergency, admin, audit
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify Oracle Database connection at startup
    try:
        row = query_one("SELECT sysdate, 'Oracle Connected' as msg FROM dual")
        print(f"[STARTUP SUCCESS] Connected to Oracle DB: {row}")
    except Exception as e:
        print(f"[STARTUP WARNING] Oracle connection check: {e}")
    yield
    print("[SHUTDOWN] MediVault backend shutting down cleanly.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "MediVault: Centralized Patient Medical Records and Medication Safety System. "
        "A secure, normalized, multi-hospital healthcare platform powered by Oracle Database and FastAPI."
    ),
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow frontend during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(patients.router, prefix=settings.API_V1_STR)
app.include_router(visits.router, prefix=settings.API_V1_STR)
app.include_router(prescriptions.router, prefix=settings.API_V1_STR)
app.include_router(safety.router, prefix=settings.API_V1_STR)
app.include_router(vitals.router, prefix=settings.API_V1_STR)
app.include_router(tests_treatments.router, prefix=settings.API_V1_STR)
app.include_router(emergency.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    db_status = "HEALTHY"
    try:
        query_one("SELECT 1 FROM dual")
    except Exception:
        db_status = "DEGRADED"
    return {
        "status": "ONLINE",
        "service": settings.PROJECT_NAME,
        "database": db_status
    }

@app.get("/")
def root():
    return {
        "message": "Welcome to MediVault API",
        "docs": "/docs",
        "version": settings.VERSION
    }
