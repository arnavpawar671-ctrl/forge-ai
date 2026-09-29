"""
Tests for the ForgeAI health endpoint.
"""

from fastapi.testclient import TestClient

from app.main import app


# Create a test client around our FastAPI application.
client = TestClient(app)


def test_health_endpoint():
    """
    Verify that the health endpoint responds correctly.
    """

    response = client.get(
        "/api/v1/health"
    )

    # HTTP 200 means the endpoint succeeded.
    assert response.status_code == 200

    # Convert JSON response to a Python dictionary.
    data = response.json()

    # Verify important response fields.
    assert data["status"] == "healthy"
    assert data["service"] == "forgeai-api"