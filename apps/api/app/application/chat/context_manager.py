from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from app.infrastructure.ai.base import AIMessage


@dataclass(frozen=True)
class ContextConfig:
    max_messages: int = 24
    max_message_chars: int = 12000


def _normalize_content(content: str, max_chars: int) -> str:
    cleaned = content.strip()
    if len(cleaned) <= max_chars:
        return cleaned
    return cleaned[:max_chars] + "\n[Message truncated for context]"


def build_context(
    messages: Sequence[AIMessage],
    *,
    config: ContextConfig | None = None,
) -> list[AIMessage]:
    """Build a bounded model context while preserving the newest messages."""
    config = config or ContextConfig()

    normalized: list[AIMessage] = []

    for message in messages:
        content = _normalize_content(
            message.content,
            config.max_message_chars,
        )
        if not content:
            continue

        normalized.append(
            AIMessage(
                role=message.role,
                content=content,
            )
        )

    if len(normalized) <= config.max_messages:
        return normalized

    # Keep the newest context window. The prompt/system instructions are
    # supplied separately by the model service.
    return normalized[-config.max_messages:]


def build_chat_context(
    messages: Sequence[AIMessage],
    *,
    max_messages: int = 24,
    max_message_chars: int = 12000,
) -> list[AIMessage]:
    return build_context(
        messages,
        config=ContextConfig(
            max_messages=max_messages,
            max_message_chars=max_message_chars,
        ),
    )
