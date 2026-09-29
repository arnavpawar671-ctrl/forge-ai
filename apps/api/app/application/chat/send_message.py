from __future__ import annotations

from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass

from app.infrastructure.ai.base import (
    AIMessage,
    AIRequest,
    AIStreamChunk,
)
from app.infrastructure.ai.prompts.system import build_system_prompt
from app.infrastructure.ai.router import ai_router


@dataclass(slots=True, frozen=True)
class SendMessageCommand:
    """Input required to send a message to ForgeAI."""

    messages: Sequence[AIMessage]
    mode: str = "explain"
    personality: str = "senior_engineer"
    model: str | None = None
    temperature: float = 0.2
    max_tokens: int = 4096

    # These will be used by the memory/database layer.
    user_id: str | None = None
    conversation_id: str | None = None


@dataclass(slots=True, frozen=True)
class SendMessageResult:
    """Metadata returned when a message request is created."""

    mode: str
    personality: str
    model: str
    conversation_id: str | None = None


class SendMessageService:
    """
    Application service responsible for orchestrating a ForgeAI message.

    Flow:

        API request
            ↓
        SendMessageService
            ↓
        Prompt Engine
            ↓
        AIRequest
            ↓
        AI Model Router
            ↓
        Groq
            ↓
        streamed AI chunks
    """

    async def stream(
        self,
        command: SendMessageCommand,
    ) -> AsyncIterator[AIStreamChunk]:
        """Stream ForgeAI's response."""

        system_prompt = build_system_prompt(
            mode=command.mode,
            personality=command.personality,
            memory=(),
            context=(),
            available_tools=(),
        )

        ai_messages = [
            AIMessage(
                role="system",
                content=system_prompt,
            ),
            *command.messages,
        ]

        request = AIRequest(
            messages=ai_messages,
            model=command.model or "",
            temperature=command.temperature,
            max_tokens=command.max_tokens,
            mode=command.mode,
            personality=command.personality,
            stream=True,
            metadata={
                "user_id": command.user_id,
                "conversation_id": command.conversation_id,
            },
        )

        async for chunk in ai_router.stream(request):
            yield chunk

    async def execute(
        self,
        command: SendMessageCommand,
    ) -> SendMessageResult:
        """
        Execute a non-streaming request.

        Useful for internal services, testing, title generation,
        summaries, and background jobs.
        """

        system_prompt = build_system_prompt(
            mode=command.mode,
            personality=command.personality,
            memory=(),
            context=(),
            available_tools=(),
        )

        ai_messages = [
            AIMessage(
                role="system",
                content=system_prompt,
            ),
            *command.messages,
        ]

        request = AIRequest(
            messages=ai_messages,
            model=command.model or "",
            temperature=command.temperature,
            max_tokens=command.max_tokens,
            mode=command.mode,
            personality=command.personality,
            stream=False,
            metadata={
                "user_id": command.user_id,
                "conversation_id": command.conversation_id,
            },
        )

        response = await ai_router.generate(request)

        return SendMessageResult(
            mode=command.mode,
            personality=command.personality,
            model=response.model,
            conversation_id=command.conversation_id,
        )


send_message_service = SendMessageService()