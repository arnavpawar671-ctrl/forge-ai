from __future__ import annotations

from fastapi import Header, HTTPException, status
from supabase import create_client

from app.core.config import settings


def _get_auth_user(token: str):
    auth_client = create_client(
        settings.supabase_url,
        settings.supabase_secret_key,
    )

    return auth_client.auth.get_user(token)


async def get_current_user(
    authorization: str | None = Header(default=None),
):
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        response = _get_auth_user(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = getattr(response, "user", None)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user