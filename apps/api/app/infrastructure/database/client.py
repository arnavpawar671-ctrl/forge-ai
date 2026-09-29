from __future__ import annotations

from typing import Any

from supabase import Client, create_client

from app.core.config import settings


class DatabaseConfigurationError(Exception):
    """Raised when database configuration is missing."""


class DatabaseClient:
    """Supabase database client used by ForgeAI's backend."""

    def __init__(self) -> None:
        if not settings.supabase_url:
            raise DatabaseConfigurationError(
                "SUPABASE_URL is not configured."
            )

        if not settings.supabase_service_role_key:
            raise DatabaseConfigurationError(
                "SUPABASE_SERVICE_ROLE_KEY is not configured."
            )

        self.client: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )

    def table(self, table_name: str) -> Any:
        """Return a Supabase table query interface."""
        return self.client.table(table_name)


database = DatabaseClient()