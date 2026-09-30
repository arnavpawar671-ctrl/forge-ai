from app.infrastructure.database.client import database


response = (
    database.client
    .table("profiles")
    .select("*")
    .limit(1)
    .execute()
)

print("Supabase connection: OK")
print("Rows returned:", len(response.data))