from __future__ import annotations

import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.application.chat.send_message import (
    SendMessageCommand,
    send_message_service,
)
from app.core.security import get_current_user
from app.infrastructure.ai.base import AIMessage

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)
    mode: str = "explain"
    personality: str = "senior_engineer"
    model: str | None = None
    conversation_id: str | None = None


async def generate_stream(
    request: ChatRequest,
    user_id: str,
) -> AsyncIterator[str]:
    command = SendMessageCommand(
        messages=[
            AIMessage(
                role=message.role,
                content=message.content,
            )
            for message in request.messages
        ],
        mode=request.mode,
        personality=request.personality,
        model=request.model,
        user_id=user_id,
        conversation_id=request.conversation_id,
    )

    try:
        async for chunk in send_message_service.stream(command):
            if chunk.content:
                payload = json.dumps(
                    {
                        "type": "token",
                        "content": chunk.content,
                    }
                )
                yield f"data: {payload}\n\n"

        yield 'data: {"type":"done"}\n\n'

    except Exception as exc:
        payload = json.dumps(
            {
                "type": "error",
                "message": str(exc),
            }
        )
        yield f"data: {payload}\n\n"


@router.post("")
async def chat(
    request: ChatRequest,
    current_user=Depends(get_current_user),
):
    if not request.messages:
        raise HTTPException(
            status_code=400,
            detail="At least one message is required.",
        )

    return StreamingResponse(
        generate_stream(request, str(current_user.id)),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
