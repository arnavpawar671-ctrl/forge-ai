"""
ForgeAI API entry point.

This file creates the FastAPI application and
connects all API routers.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router


# ============================================
# APPLICATION
# ============================================

app = FastAPI(
    title="ForgeAI API",
    description=(
        "Backend API for ForgeAI — "
        "an AI software engineer for developers."
    ),
    version="0.1.0",
)


# ============================================
# CORS
# ============================================

# During local development our React application
# runs on localhost:5173.
#
# Later, these origins should come from environment
# configuration rather than being hard-coded.

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
    ],

    allow_credentials=True,

    allow_methods=[
        "*",
    ],

    allow_headers=[
        "*",
    ],
)


# ============================================
# API ROUTERS
# ============================================

# All API endpoints are registered here.
app.include_router(
    api_router,
    prefix="/api",
)


# ============================================
# ROOT ENDPOINT
# ============================================

@app.get("/")
async def root():
    """
    Basic API information endpoint.

    Useful for quickly checking whether the
    backend server is alive.
    """

    return {
        "name": "ForgeAI API",
        "version": "0.1.0",
        "status": "online",
    }


# ============================================
# LOCAL DEVELOPMENT SERVER
# ============================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "app.main:app",

        host="127.0.0.1",

        port=8000,

        reload=True,
    )