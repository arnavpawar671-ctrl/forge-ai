from __future__ import annotations

from collections.abc import AsyncIterator

from app.infrastructure.ai.base import (
    AIModelRouter,
    AIProvider,
    AIProviderError,
    AIRequest,
    AIResponse,
    AIStreamChunk,
)
from app.infrastructure.ai.groq.client import GroqProvider


class DefaultAIModelRouter(AIModelRouter):
    """
    ForgeAI's default AI model router.

    Currently routes requests to Groq.

    Keeping this layer separate means we can later route different
    workloads to different models/providers without changing the
    chat API.
    """

    def __init__(
        self,
        *,
        groq_provider: AIProvider | None = None,
    ) -> None:
        self.groq = groq_provider or GroqProvider()

    def _select_provider(
        self,
        request: AIRequest,
    ) -> AIProvider:
        """
        Select the provider for a request.

        For now, every request uses Groq.

        Later this can route based on:
        - engineering mode
        - model
        - tool requirements
        - context size
        - latency
        - availability
        - user settings
        """

        provider = self.groq

        if provider is None:
            raise AIProviderError(
                "No AI provider is available."
            )

        return provider

    async def generate(
        self,
        request: AIRequest,
    ) -> AIResponse:
        """
        Generate a complete response using the selected provider.
        """

        provider = self._select_provider(request)

        return await provider.generate(request)

    async def stream(
        self,
        request: AIRequest,
    ) -> AsyncIterator[AIStreamChunk]:
        """
        Stream a response using the selected provider.
        """

        provider = self._select_provider(request)

        async for chunk in provider.stream(request):
            yield chunk

    async def health_check(self) -> dict[str, bool]:
        """
        Check availability of configured AI providers.
        """

        return {
            "groq": await self.groq.health_check(),
        }


# Singleton router used by the application layer.
#
# We will eventually replace this with dependency injection when
# authentication, configuration, and testing become more advanced.
ai_router = DefaultAIModelRouter()