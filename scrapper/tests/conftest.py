import pytest
import json
import httpx
from unittest.mock import AsyncMock, Mock
from sources.greenhouse import GreenhouseSource


@pytest.fixture(autouse=True)
def clear_greenhouse_cache():
    """Ensure Greenhouse cache does not leak between tests."""
    GreenhouseSource.clear_cache()
    yield
    GreenhouseSource.clear_cache()

@pytest.fixture
def mock_greenhouse_response():
    """Mock Greenhouse API response."""
    return {
        "jobs": [
            {
                "id": 1,
                "title": "Senior Software Engineer",
                "company": {"name": "Stripe"},
                "location": {"name": "San Francisco, CA"},
                "remote": False,
                "content": "We are looking for a senior software engineer...",
                "absolute_url": "https://boards.greenhouse.io/stripe/jobs/1",
            },
            {
                "id": 2,
                "title": "Product Manager",
                "company": {"name": "Stripe"},
                "location": "New York, NY",
                "remote": True,
                "content": "Looking for a product manager to lead...",
                "absolute_url": "https://boards.greenhouse.io/stripe/jobs/2",
            },
            {
                "id": 3,
                "title": "Backend Engineer",
                "company": {"name": "Stripe"},
                "location": {"name": "London, UK"},
                "remote": False,
                "content": "<p>Build scalable systems</p><script>alert('xss')</script>",
                "absolute_url": "https://boards.greenhouse.io/stripe/jobs/3",
            },
        ]
    }

@pytest.fixture
def mock_http_client(mock_greenhouse_response):
    """Mock HTTP client."""
    client = AsyncMock()
    
    async def mock_get(url, *args, **kwargs):
        response = Mock()
        response.raise_for_status.return_value = None
        response.elapsed.total_seconds.return_value = 0.5

        path_parts = url.rstrip("/").split("/")
        is_detail_url = path_parts[-1].isdigit()

        if is_detail_url:
            job_id = int(path_parts[-1])
            job = next((j for j in mock_greenhouse_response["jobs"] if j["id"] == job_id), None)
            response.json.return_value = job if job else {}
        else:
            response.json.return_value = mock_greenhouse_response
            
        return response
    
    client.get = mock_get
    return client

@pytest.fixture
def companies_config():
    """Mock companies configuration."""
    return {
        "greenhouse": [
            "stripe",
            "notion",
            "figma",
            "airbnb",
        ]
    }

@pytest.fixture
async def temp_companies_json(tmp_path, companies_config):
    """Create temporary companies.json file."""
    config_file = tmp_path / "companies.json"
    with open(config_file, "w") as f:
        json.dump(companies_config, f)
    return config_file
