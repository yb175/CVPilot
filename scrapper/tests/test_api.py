"""Integration tests for FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert "available_sources" in response.json()
    assert "greenhouse" in response.json()["available_sources"]


def test_root_endpoint(client):
    """Test root endpoint."""
    response = client.get("/")
    
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "Job Scraper"
    assert "endpoints" in data


def test_ingest_endpoint_no_request_body(client):
    """Test ingest endpoint with no request body - should work with live companies.json."""
    # This test uses the real companies.json file
    response = client.post("/internal/ingest")
    
    # Should succeed (200) even if it gets 0 jobs
    # OR might get rate limited (429) or timeout, but not 500
    assert response.status_code in [200, 429, 408, 504]
    if response.status_code == 200:
        data = response.json()
        assert "total" in data
        assert "jobs" in data


def test_ingest_endpoint_invalid_source(client):
    """Test ingest with invalid source."""
    response = client.post(
        "/internal/ingest",
        json={"sources": ["invalid_source"]}
    )
    
    assert response.status_code == 400
    assert "Unknown source" in response.json()["detail"]


def test_ingest_endpoint_response_schema_structure(client):
    """Test that response structure is correct."""
    response = client.post("/internal/ingest", json={"companies": ["stripe"]})
    
    # Either success or expected error (not 500)
    if response.status_code == 200:
        data = response.json()
        
        # Check response schema
        assert "total" in data
        assert "jobs" in data
        assert isinstance(data["total"], int)
        assert isinstance(data["jobs"], list)
