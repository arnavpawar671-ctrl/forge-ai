from fastapi import APIRouter

from app.api.v1.chat import router as chat_router
from app.api.v1.health import router as health_router


api_router = APIRouter()

api_router.include_router(
    health_router,
    prefix="/v1",
)

api_router.include_router(
    chat_router,
    prefix="/v1",
)