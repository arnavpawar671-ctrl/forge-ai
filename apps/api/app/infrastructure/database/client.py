from __future__ import annotations

from supabase import Client, create_client

from app.core.config import settings


class DatabaseClient:
    def __init__(self) -> None:
        if not settings.supabase_url:
            raise RuntimeError("SUPABASE_URL is not configured.")

        if not settings.supabase_secret_key:
            raise RuntimeError(
                "SUPABASE_SECRET_KEY is not configured."
            )

        self.client: Client = create_client(
            settings.supabase_url,
            settings.supabase_secret_key,
        )

    def table(self, table_name: str):
        return self.client.table(table_name)


database = DatabaseClient()