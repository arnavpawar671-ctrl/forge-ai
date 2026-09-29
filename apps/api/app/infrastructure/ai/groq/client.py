from __future__ import annotations

from collections.abc import AsyncIterator

from groq import AsyncGroq

from app.core.config import settings
from app.infrastructure.ai.base import (
    AIProvider,
    AIProviderConfigurationError,
    AIProviderError,
    AIProviderRateLimitError,
    AIRequest,
    AIResponse,
    AIStreamChunk,
)


class GroqProvider(AIProvider):
    """
    Groq implementation of ForgeAI's provider-independent AI interface.

    The rest of ForgeAI should communicate with this class through
    AIProvider rather than directly using the Groq SDK.
    """

    name = "groq"

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
    ) -> None:
        self.api_key = api_key or settings.groq_api_key
        self.model = model or settings.groq_model

        if not self.api_key:
            raise AIProviderConfigurationError(
                "GROQ_API_KEY is not configured."
            )

        if not self.model:
            raise AIProviderConfigurationError(
                "GROQ_MODEL is not configured."
            )

        self.client = AsyncGroq(api_key=self.api_key)

    @staticmethod
    def _build_messages(request: AIRequest) -> list[dict[str, str]]:
        """
        Convert ForgeAI's internal AIMessage objects into
        the format expected by the Groq SDK.
        """

        messages: list[dict[str, str]] = []

        for message in request.messages:
            messages.append(
                {
                    "role": message.role,
                    "content": message.content,
                }
            )

        return messages

    @staticmethod
    def _extract_usage(response: object) -> dict[str, int]:
        """
        Safely extract token usage from a provider response.
        """

        usage = getattr(response, "usage", None)

        if usage is None:
            return {}

        result: dict[str, int] = {}

        for source_name, target_name in (
            ("prompt_tokens", "prompt_tokens"),
            ("completion_tokens", "completion_tokens"),
            ("total_tokens", "total_tokens"),
        ):
            value = getattr(usage, source_name, None)

            if value is not None:
                result[target_name] = int(value)

        return result

    @staticmethod
    def _handle_error(error: Exception) -> AIProviderError:
        """
        Convert Groq SDK errors into ForgeAI's provider-independent
        error types.
        """

        status_code = getattr(error, "status_code", None)

        if status_code == 429:
            return AIProviderRateLimitError(
                "Groq rate limit reached. Please try again later."
            )

        if status_code is not None and status_code >= 500:
            return AIProviderError(
                "Groq is temporarily unavailable."
            )

        return AIProviderError(str(error))

    async def generate(
        self,
        request: AIRequest,
    ) -> AIResponse:
        """
        Generate a complete response from Groq.
        """

        messages = self._build_messages(request)

        try:
            response = await self.client.chat.completions.create(
                model=request.model or self.model,
                messages=messages,
                temperature=request.temperature,
                max_completion_tokens=request.max_tokens,
                stream=False,
            )

        except Exception as error:
            raise self._handle_error(error) from error

        if not response.choices:
            raise AIProviderError(
                "Groq returned an empty response."
            )

        choice = response.choices[0]

        content = choice.message.content or ""

        return AIResponse(
            content=content,
            model=response.model,
            finish_reason=choice.finish_reason,
            usage=self._extract_usage(response),
            tool_calls=tuple(),
            metadata={
                "provider": self.name,
            },
        )

    async def stream(
        self,
        request: AIRequest,
    ) -> AsyncIterator[AIStreamChunk]:
        """
        Stream a response from Groq chunk-by-chunk.
        """

        messages = self._build_messages(request)

        try:
            stream = await self.client.chat.completions.create(
                model=request.model or self.model,
                messages=messages,
                temperature=request.temperature,
                max_completion_tokens=request.max_tokens,
                stream=True,
            )

            async for chunk in stream:
                if not chunk.choices:
                    continue

                choice = chunk.choices[0]

                content = choice.delta.content or ""

                yield AIStreamChunk(
                    content=content,
                    finish_reason=choice.finish_reason,
                    tool_calls=tuple(),
                    metadata={
                        "provider": self.name,
                        "model": request.model or self.model,
                    },
                )

        except Exception as error:
            raise self._handle_error(error) from error

    async def health_check(self) -> bool:
        """
        Verify that the configured Groq provider can be reached.

        This intentionally performs a tiny request rather than exposing
        the API key or relying only on configuration presence.
        """

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": "ping",
                    }
                ],
                max_completion_tokens=1,
                temperature=0,
                stream=False,
            )

            return bool(response.choices)

        except Exception:
            return False