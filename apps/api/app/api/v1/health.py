"""
Health-check endpoints.

These endpoints are intentionally simple.

Later, the health system can check:

- Database
- Redis/cache
- AI provider
- Application dependencies
- Background workers
"""

from datetime import datetime, timezone

from fastapi import APIRouter


router = APIRouter(
    prefix="/health",
    tags=["Health"],
)


@router.get("")
async def health_check():
    """
    Basic application health check.

    GET /api/v1/health
    """

    return {
        "status": "healthy",

        "service": "forgeai-api",

        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),

        "version": "0.1.0",
    }