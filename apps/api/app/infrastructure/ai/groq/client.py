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
    """Groq implementation of ForgeAI's provider-independent AI interface."""

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
    def _build_messages(request: AIRequest) -> list[dict[str, object]]:
        """Convert ForgeAI messages into Groq-compatible message dictionaries."""

        messages: list[dict[str, object]] = []

        for message in request.messages:
            item: dict[str, object] = {
                "role": message.role,
                "content": message.content,
            }

            if message.name:
                item["name"] = message.name

            if message.tool_call_id:
                item["tool_call_id"] = message.tool_call_id

            if message.metadata.get("tool_calls"):
                item["tool_calls"] = message.metadata["tool_calls"]

            messages.append(item)

        return messages

    @staticmethod
    def _extract_usage(response: object) -> dict[str, int]:
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
    def _extract_tool_calls(choice: object) -> tuple[dict[str, object], ...]:
        message = getattr(choice, "message", None)
        calls = getattr(message, "tool_calls", None) if message else None

        if not calls:
            return tuple()

        result: list[dict[str, object]] = []

        for call in calls:
            function = getattr(call, "function", None)

            result.append(
                {
                    "id": getattr(call, "id", None),
                    "type": getattr(call, "type", "function"),
                    "function": {
                        "name": getattr(function, "name", ""),
                        "arguments": getattr(function, "arguments", ""),
                    },
                }
            )

        return tuple(result)

    @staticmethod
    def _handle_error(error: Exception) -> AIProviderError:
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

    def _request_options(self, request: AIRequest) -> dict[str, object]:
        options: dict[str, object] = {
            "model": request.model or self.model,
            "messages": self._build_messages(request),
            "temperature": request.temperature,
            "max_completion_tokens": request.max_tokens,
        }

        if request.tools:
            options["tools"] = list(request.tools)
            options["tool_choice"] = "auto"

        return options

    async def generate(
        self,
        request: AIRequest,
    ) -> AIResponse:
        """Generate a complete response from Groq."""

        options = self._request_options(request)
        options["stream"] = False

        try:
            response = await self.client.chat.completions.create(**options)
        except Exception as error:
            raise self._handle_error(error) from error

        if not response.choices:
            raise AIProviderError("Groq returned an empty response.")

        choice = response.choices[0]

        return AIResponse(
            content=choice.message.content or "",
            model=response.model,
            finish_reason=choice.finish_reason,
            usage=self._extract_usage(response),
            tool_calls=self._extract_tool_calls(choice),
            metadata={
                "provider": self.name,
                "mode": request.mode,
                "personality": request.personality,
            },
        )

    async def stream(
        self,
        request: AIRequest,
    ) -> AsyncIterator[AIStreamChunk]:
        """Stream a response from Groq chunk-by-chunk."""

        options = self._request_options(request)
        options["stream"] = True

        try:
            stream = await self.client.chat.completions.create(**options)

            async for chunk in stream:
                if not chunk.choices:
                    continue

                choice = chunk.choices[0]
                delta = choice.delta
                content = delta.content or ""

                tool_calls: list[dict[str, object]] = []

                for call in getattr(delta, "tool_calls", None) or []:
                    function = getattr(call, "function", None)

                    tool_calls.append(
                        {
                            "index": getattr(call, "index", None),
                            "id": getattr(call, "id", None),
                            "type": getattr(call, "type", "function"),
                            "function": {
                                "name": getattr(function, "name", ""),
                                "arguments": getattr(
                                    function,
                                    "arguments",
                                    "",
                                ),
                            },
                        }
                    )

                yield AIStreamChunk(
                    content=content,
                    finish_reason=choice.finish_reason,
                    tool_calls=tuple(tool_calls),
                    metadata={
                        "provider": self.name,
                        "model": request.model or self.model,
                    },
                )

        except Exception as error:
            raise self._handle_error(error) from error

    async def health_check(self) -> bool:
        """Verify that the configured Groq provider can be reached."""

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
