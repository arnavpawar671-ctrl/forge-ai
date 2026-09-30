from __future__ import annotations

import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.api.v1.conversations import (
    _get_owned_conversation,
    create_conversation,
    save_message,
    touch_conversation,
)
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


def _conversation_title(message: str) -> str:
    cleaned = " ".join(message.strip().split())
    if not cleaned:
        return "New conversation"
    words = cleaned.split(" ")
    return cleaned if len(words) <= 7 else f"{' '.join(words[:7])}…"


async def generate_stream(
    request: ChatRequest,
    user_id: str,
) -> AsyncIterator[str]:
    last_user_message = next(
        (
            message.content.strip()
            for message in reversed(request.messages)
            if message.role == "user"
        ),
        "",
    )

    if not last_user_message:
        yield 'data: {"type":"error","message":"A user message is required."}\n\n'
        return

    conversation_id = request.conversation_id

    try:
        if conversation_id:
            _get_owned_conversation(conversation_id, user_id)
        else:
            conversation = create_conversation(
                user_id=user_id,
                title=_conversation_title(last_user_message),
                mode=request.mode,
                personality=request.personality,
                model=request.model,
            )
            conversation_id = str(conversation["id"])

            yield (
                "data: "
                + json.dumps(
                    {
                        "type": "conversation",
                        "conversation": conversation,
                    }
                )
                + "\n\n"
            )

        # Only persist the newest user message. The full message list is still
        # sent to the model so the current request retains conversation context.
        save_message(
            conversation_id=conversation_id,
            role="user",
            content=last_user_message,
            model=request.model,
            mode=request.mode,
            personality=request.personality,
        )

        command = SendMessageCommand(
            messages=[
                AIMessage(role=message.role, content=message.content)
                for message in request.messages
            ],
            mode=request.mode,
            personality=request.personality,
            model=request.model,
            user_id=user_id,
            conversation_id=conversation_id,
        )

        assistant_content: list[str] = []

        async for chunk in send_message_service.stream(command):
            if chunk.content:
                assistant_content.append(chunk.content)
                payload = json.dumps(
                    {"type": "token", "content": chunk.content}
                )
                yield f"data: {payload}\n\n"

        complete_assistant_message = "".join(assistant_content)

        if complete_assistant_message:
            save_message(
                conversation_id=conversation_id,
                role="assistant",
                content=complete_assistant_message,
                model=request.model,
                mode=request.mode,
                personality=request.personality,
            )

        touch_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            title=_conversation_title(first_user_message),
        )

        yield (
            "data: "
            + json.dumps(
                {
                    "type": "done",
                    "conversation_id": conversation_id,
                }
            )
            + "\n\n"
        )

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
