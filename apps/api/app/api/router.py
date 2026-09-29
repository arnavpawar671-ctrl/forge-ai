"""
Central API router.

All versioned API routers are registered here.
"""

from fastapi import APIRouter

from app.api.v1.health import router as health_router


# Create the main API router.
api_router = APIRouter()


# ============================================
# API V1
# ============================================

# Health endpoints.
api_router.include_router(
    health_router,
    prefix="/v1",
)