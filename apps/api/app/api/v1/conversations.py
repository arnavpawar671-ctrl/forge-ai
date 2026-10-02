from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.infrastructure.database.client import database

router = APIRouter(prefix="/conversations", tags=["conversations"])


class CreateConversationRequest(BaseModel):
    title: str = Field(
        default="New conversation",
        min_length=1,
        max_length=200,
    )
    mode: str = "explain"
    personality: str = "senior_engineer"
    model: str | None = None


def _user_id(current_user) -> str:
    return str(current_user.id)


def _get_owned_conversation(
    conversation_id: str,
    user_id: str,
) -> dict:
    response = (
        database.table("conversations")
        .select(
            "id, title, mode, personality, model, created_at, updated_at"
        )
        .eq("id", conversation_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    return response.data[0]


def create_conversation(
    *,
    user_id: str,
    title: str,
    mode: str,
    personality: str,
    model: str | None,
) -> dict:
    response = (
        database.table("conversations")
        .insert(
            {
                "user_id": user_id,
                "title": title[:200],
                "mode": mode,
                "personality": personality,
                "model": model,
            }
        )
        .select(
            "id, title, mode, personality, model, created_at, updated_at"
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversation.",
        )

    return response.data[0]


def save_message(
    *,
    conversation_id: str,
    role: str,
    content: str,
    model: str | None = None,
    mode: str | None = None,
    personality: str | None = None,
) -> dict:
    response = (
        database.table("messages")
        .insert(
            {
                "conversation_id": conversation_id,
                "role": role,
                "content": content,
                "model": model,
                "mode": mode,
                "personality": personality,
            }
        )
        .select(
            "id, conversation_id, role, content, "
            "model, mode, personality, created_at"
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save message.",
        )

    return response.data[0]


def touch_conversation(
    *,
    conversation_id: str,
    user_id: str,
    title: str | None = None,
) -> None:
    payload = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    if title:
        payload["title"] = title[:200]

    (
        database.table("conversations")
        .update(payload)
        .eq("id", conversation_id)
        .eq("user_id", user_id)
        .execute()
    )


@router.get("")
async def list_conversations(
    current_user=Depends(get_current_user),
):
    response = (
        database.table("conversations")
        .select(
            "id, title, mode, personality, model, "
            "created_at, updated_at"
        )
        .eq("user_id", _user_id(current_user))
        .eq("is_archived", False)
        .order("updated_at", desc=True)
        .execute()
    )

    return {
        "conversations": response.data or [],
    }


@router.post("")
async def create_conversation_endpoint(
    request: CreateConversationRequest,
    current_user=Depends(get_current_user),
):
    conversation = create_conversation(
        user_id=_user_id(current_user),
        title=request.title,
        mode=request.mode,
        personality=request.personality,
        model=request.model,
    )

    return {
        "conversation": conversation,
    }


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user=Depends(get_current_user),
):
    user_id = _user_id(current_user)

    _get_owned_conversation(conversation_id, user_id)

    response = (
        database.table("conversations")
        .delete()
        .eq("id", conversation_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    return {"deleted": True, "conversation_id": conversation_id}


@router.get("/{conversation_id}/messages")
async def list_messages(
    conversation_id: str,
    current_user=Depends(get_current_user),
):
    user_id = _user_id(current_user)

    _get_owned_conversation(
        conversation_id,
        user_id,
    )

    response = (
        database.table("messages")
        .select(
            "id, conversation_id, role, content, "
            "model, mode, personality, created_at"
        )
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .execute()
    )

    return {
        "messages": response.data or [],
    }
