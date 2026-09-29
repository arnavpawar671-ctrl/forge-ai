from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass, field
from typing import Any, Literal


ChatRole = Literal["system", "user", "assistant", "tool"]


@dataclass(slots=True, frozen=True)
class AIMessage:
    """
    A single message sent to or returned by an AI model.

    The database layer can later map its message records
    into this provider-independent structure.
    """

    role: ChatRole
    content: str

    name: str | None = None
    tool_call_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True, frozen=True)
class AIRequest:
    """
    Provider-independent request passed to the AI layer.
    """

    messages: Sequence[AIMessage]

    model: str
    temperature: float = 0.2
    max_tokens: int = 4096

    mode: str = "explain"
    personality: str = "senior_engineer"

    stream: bool = True

    # Future tool system
    tools: Sequence[dict[str, Any]] = field(default_factory=tuple)

    # Context retrieved from database/memory/search.
    context: Sequence[str] = field(default_factory=tuple)

    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True, frozen=True)
class AIResponse:
    """
    Normalized non-streaming response.
    """

    content: str
    model: str

    finish_reason: str | None = None
    usage: dict[str, int] = field(default_factory=dict)

    tool_calls: Sequence[dict[str, Any]] = field(default_factory=tuple)

    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True, frozen=True)
class AIStreamChunk:
    """
    Normalized streaming chunk.

    Keeping this provider-independent means ForgeAI can eventually
    support multiple AI providers without rewriting the chat system.
    """

    content: str = ""

    finish_reason: str | None = None

    tool_calls: Sequence[dict[str, Any]] = field(default_factory=tuple)

    metadata: dict[str, Any] = field(default_factory=dict)


class AIProviderError(Exception):
    """Base exception for AI provider failures."""


class AIProviderConfigurationError(AIProviderError):
    """Raised when an AI provider is incorrectly configured."""


class AIProviderRateLimitError(AIProviderError):
    """Raised when the provider rate-limits ForgeAI."""


class AIProvider:
    """
    Provider interface used by ForgeAI's AI orchestration layer.

    Groq will implement this interface initially.

    Later we can add:
        - GroqProvider
        - OpenAIProvider
        - AnthropicProvider
        - LocalProvider
        - etc.

    The rest of ForgeAI should depend on this interface rather
    than directly depending on the Groq SDK.
    """

    name: str = "unknown"

    async def generate(
        self,
        request: AIRequest,
    ) -> AIResponse:
        """
        Generate a complete AI response.
        """
        raise NotImplementedError

    async def stream(
        self,
        request: AIRequest,
    ) -> AsyncIterator[AIStreamChunk]:
        """
        Stream an AI response chunk-by-chunk.
        """
        raise NotImplementedError

    async def health_check(self) -> bool:
        """
        Check whether the provider is available.
        """
        return True


class AIModelRouter(ABC):
    """
    Routes an AI request to an appropriate model/provider.

    This becomes useful when ForgeAI eventually has different
    models for different workloads.
    """

    @abstractmethod
    async def generate(
        self,
        request: AIRequest,
    ) -> AIResponse:
        """Generate a complete response."""

    @abstractmethod
    async def stream(
        self,
        request: AIRequest,
    ) -> AsyncIterator[AIStreamChunk]:
        """Stream a response."""


class AIContextProvider(ABC):
    """
    Supplies additional context to the AI.

    This is where database memory, conversation history,
    project context, documentation, and web-search results
    can eventually plug into ForgeAI.
    """

    @abstractmethod
    async def get_context(
        self,
        *,
        user_id: str | None,
        conversation_id: str | None,
        query: str,
    ) -> Sequence[str]:
        """
        Retrieve relevant context for an AI request.
        """


class AITool(ABC):
    """
    Base interface for ForgeAI tools.

    Examples:

        WebSearchTool
        URLReaderTool
        GitHubTool
        CalculatorTool
        DocumentationTool

    Tools should be registered with a tool registry rather
    than being hard-coded into the chat endpoint.
    """

    name: str = "unknown"
    description: str = ""

    @abstractmethod
    async def execute(
        self,
        arguments: dict[str, Any],
    ) -> Any:
        """
        Execute the tool.
        """

    def schema(self) -> dict[str, Any]:
        """
        Return the tool schema that can be provided to an AI model.
        """
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
            },
        }