from collections.abc import AsyncGenerator
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from groq import Groq
from pydantic import BaseModel, Field

from app.core.config import settings


router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)
    mode: str = "explain"


def build_system_prompt(mode: str) -> str:
    """Build ForgeAI's engineering-focused system prompt."""

    mode_instructions = {
        "explain": "Explain concepts clearly and technically.",
        "debug": "Analyze bugs systematically. Identify the cause, evidence, and fix.",
        "architect": "Design robust, scalable software architectures and explain trade-offs.",
        "review": "Review code for correctness, maintainability, security, and performance.",
        "implement": "Write production-quality implementation code with clear reasoning.",
        "test": "Design comprehensive unit, integration, and end-to-end tests.",
        "security": "Analyze software security risks and recommend defensive fixes.",
        "devops": "Help with CI/CD, containers, deployment, infrastructure, and observability.",
    }

    instruction = mode_instructions.get(
        mode.lower(),
        mode_instructions["explain"],
    )

    return f"""
You are ForgeAI, an advanced AI software engineer.

You help developers with:
- software engineering
- debugging
- architecture
- code review
- implementation
- testing
- security
- DevOps
- performance
- technical problem solving

Current engineering mode:
{mode}

Mode instruction:
{instruction}

Rules:
- Give technically accurate answers.
- Prefer practical solutions.
- Explain important trade-offs.
- When writing code, make it production-oriented.
- Never expose secrets or API keys.
- If information is uncertain, say so.
- Do not pretend to have executed code you have not executed.
- Keep responses structured and readable.
""".strip()


def stream_groq(
    messages: list[ChatMessage],
    mode: str,
) -> AsyncGenerator[str, None]:
    """
    Stream tokens from Groq to the browser using SSE.
    """

    client = Groq(api_key=settings.groq_api_key)

    groq_messages = [
        {
            "role": "system",
            "content": build_system_prompt(mode),
        }
    ]

    groq_messages.extend(
        {
            "role": message.role,
            "content": message.content,
        }
        for message in messages
    )

    try:
        stream = client.chat.completions.create(
            model=settings.groq_model,
            messages=groq_messages,
            temperature=0.2,
            max_completion_tokens=4096,
            stream=True,
        )

        for chunk in stream:
            content = chunk.choices[0].delta.content

            if content:
                payload = json.dumps(
                    {
                        "type": "token",
                        "content": content,
                    }
                )

                yield f"data: {payload}\n\n"

        yield 'data: {"type":"done"}\n\n'

    except Exception as exc:
        error = json.dumps(
            {
                "type": "error",
                "message": str(exc),
            }
        )

        yield f"data: {error}\n\n"


@router.post("")
async def chat(request: ChatRequest):
    if not settings.groq_api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not configured.",
        )

    return StreamingResponse(
        stream_groq(
            request.messages,
            request.mode,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )