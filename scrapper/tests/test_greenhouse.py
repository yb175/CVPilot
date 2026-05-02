"""Tests for Greenhouse job source."""

import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from sources.greenhouse import GreenhouseSource
from models.job_schema import JobData
from utils.exceptions import SourceException, ValidationException


@pytest.mark.asyncio
async def test_greenhouse_fetch_jobs_success(mock_http_client, mock_greenhouse_response):
    """Test successful job fetching from Greenhouse."""
    source = GreenhouseSource()
    
    with patch.object(source, 'http_client', mock_http_client):
        jobs = await source.fetch_jobs("stripe")
    
    assert len(jobs) == 3
    assert jobs[0]["title"] == "Senior Software Engineer"
    assert jobs[1]["company"]["name"] == "Stripe"


@pytest.mark.asyncio
async def test_greenhouse_fetch_jobs_with_limit(mock_http_client, mock_greenhouse_response):
    """Test fetching jobs with limit."""
    source = GreenhouseSource()
    
    with patch.object(source, 'http_client', mock_http_client):
        jobs = await source.fetch_jobs("stripe", limit=2)
    
    assert len(jobs) <= 2


@pytest.mark.asyncio
async def test_greenhouse_fetch_jobs_network_error():
    """Test network error handling."""
    source = GreenhouseSource()
    mock_client = AsyncMock()
    mock_client.get.side_effect = Exception("Network error")
    
    with patch.object(source, 'http_client', mock_client):
        with pytest.raises(SourceException) as exc_info:
            await source.fetch_jobs("stripe")
        
        assert "greenhouse" in str(exc_info.value)
        assert "stripe" in str(exc_info.value)


def test_greenhouse_normalize_job_success(mock_greenhouse_response):
    """Test successful job normalization."""
    source = GreenhouseSource()
    raw_job = mock_greenhouse_response["jobs"][0]
    
    normalized = source.normalize_job(raw_job)
    
    assert isinstance(normalized, JobData)
    assert normalized.title == "Senior Software Engineer"
    assert normalized.company == "Stripe"
    assert normalized.location == "San Francisco, CA"
    assert normalized.remote is False
    assert "senior software engineer" in normalized.description.lower()
    assert normalized.apply_url == "https://boards.greenhouse.io/stripe/jobs/1"
    assert normalized.source == "greenhouse"


def test_greenhouse_normalize_job_remote():
    """Test normalization with remote job."""
    source = GreenhouseSource()
    raw_job = {
        "title": "Remote Developer",
        "company": {"name": "Tech Company"},
        "location": {"name": "Remote"},
        "remote": True,
        "content": "Work from anywhere",
        "absolute_url": "https://example.com/job/1",
    }
    
    normalized = source.normalize_job(raw_job)
    
    assert normalized.remote is True
    assert normalized.location == "Remote"


def test_greenhouse_normalize_job_missing_title():
    """Test normalization with missing required title."""
    source = GreenhouseSource()
    raw_job = {
        "title": None,
        "company": {"name": "Company"},
        "location": {"name": "City"},
        "remote": False,
        "content": "Description",
        "absolute_url": "https://example.com/job/1",
    }
    
    with pytest.raises(ValidationException):
        source.normalize_job(raw_job)


def test_greenhouse_normalize_job_html_cleaning():
    """Test HTML cleanup in job description."""
    source = GreenhouseSource()
    raw_job = {
        "title": "Engineer",
        "company": {"name": "Company"},
        "location": {"name": "City"},
        "remote": False,
        "content": "<p>Build <strong>amazing</strong> things</p><script>alert('xss')</script>",
        "absolute_url": "https://example.com/job/1",
    }
    
    normalized = source.normalize_job(raw_job)
    
    # Should not contain HTML tags
    assert "<" not in normalized.description
    assert "script" not in normalized.description.lower()
    assert "amazing" in normalized.description


def test_greenhouse_normalize_job_string_location():
    """Test normalization when location is a string."""
    source = GreenhouseSource()
    raw_job = {
        "title": "Engineer",
        "company": {"name": "Company"},
        "location": "San Francisco, CA",  # String instead of object
        "remote": False,
        "content": "Description",
        "absolute_url": "https://example.com/job/1",
    }
    
    normalized = source.normalize_job(raw_job)
    
    assert normalized.location == "San Francisco, CA"


def test_greenhouse_source_name():
    """Test source name property."""
    source = GreenhouseSource()
    assert source.source_name == "greenhouse"


def test_greenhouse_clean_html():
    """Test HTML cleaning utility function."""
    source = GreenhouseSource()
    
    # Test various HTML cases
    assert source._clean_html("<p>Hello</p>") == "Hello"
    assert source._clean_html("<script>alert('xss')</script>Hello") == "Hello"
    assert "<" not in source._clean_html("<div><span>Test</span></div>")
    
    # Test entity decoding
    result = source._clean_html("&nbsp;&amp;&lt;&gt;")
    assert "nbsp" not in result.lower()


def test_greenhouse_safe_get():
    """Test safe dictionary get utility function."""
    source = GreenhouseSource()
    
    obj = {"key": "value", "empty": None, "number": 123}
    
    assert source._safe_get(obj, "key") == "value"
    assert source._safe_get(obj, "missing", "default") == "default"
    assert source._safe_get(obj, "empty", "default") == "default"
    assert source._safe_get(obj, "number") == "123"
