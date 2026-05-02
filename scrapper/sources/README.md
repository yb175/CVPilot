# Adding a New Job Source

This guide explains how to add a new job source to CVPilot.

## Overview

Job sources in CVPilot follow a **plugin architecture**:

1. **Base Class**: All sources inherit from `JobSource` (defined in `base.py`)
2. **Registry Pattern**: Sources are auto-registered and managed by `SourceRegistry`
3. **Minimal Interface**: Only 3 methods need to be implemented

## Quick Start

### Step 1: Create a New Source File

Create a new file in the `sources/` directory named `{source_name}.py`:

```python
# sources/workable.py
from typing import List, Optional
from models.job_schema import JobData
from sources.base import JobSource
from utils.http_client import HttpClient
from utils.exceptions import SourceException, ValidationException
from utils.logger import get_logger

logger = get_logger(__name__)


class WorkableSource(JobSource):
    """Workable job source."""
    
    BASE_URL = "https://boards-api.workable.com/v1"
    
    def __init__(self):
        self.http_client = HttpClient()
    
    @property
    def source_name(self) -> str:
        """Return source identifier."""
        return "workable"
    
    async def fetch_jobs(self, company: str, **kwargs) -> List[dict]:
        """Fetch raw job data from Workable API."""
        url = f"{self.BASE_URL}/companies/{company}/jobs"
        
        try:
            response = await self.http_client.get(url)
            response.raise_for_status()
            return response.json().get("jobs", [])
        except Exception as e:
            raise SourceException(f"Failed to fetch from Workable: {e}")
    
    def normalize_job(self, raw_job: dict, company: str = None) -> JobData:
        """Convert raw API response to JobData schema."""
        try:
            return JobData(
                title=raw_job.get("title", ""),
                company=company or raw_job.get("company", ""),
                location=raw_job.get("location", ""),
                remote=raw_job.get("remote", False),
                description=raw_job.get("description", ""),
                apply_url=raw_job.get("url", ""),
                source="workable"
            )
        except Exception as e:
            raise ValidationException(f"Failed to normalize job: {e}")
```

### Step 2: Register the Source

Update `sources/__init__.py` to register your new source:

```python
from .greenhouse import GreenhouseSource
from .workable import WorkableSource  # Add this import

# ... existing code ...

# Register sources
SourceRegistry.register("greenhouse", GreenhouseSource)
SourceRegistry.register("workable", WorkableSource)  # Add this line
```

### Step 3: Update Configuration

Add your source to `companies.json`:

```json
{
    "greenhouse": ["stripe", "notion"],
    "workable": ["company1", "company2"]
}
```

### Step 4: Test (Optional)

Create a test file `tests/test_workable.py`:

```python
import pytest
from sources.workable import WorkableSource

@pytest.fixture
def source():
    return WorkableSource()

def test_source_name(source):
    assert source.source_name == "workable"

@pytest.mark.asyncio
async def test_fetch_jobs(source):
    jobs = await source.fetch_jobs("company1")
    assert isinstance(jobs, list)
    assert len(jobs) > 0

def test_normalize_job(source):
    raw = {
        "title": "Senior Engineer",
        "location": "NYC",
        "remote": True,
        "description": "...",
        "url": "https://..."
    }
    normalized = source.normalize_job(raw, "company1")
    assert normalized.title == "Senior Engineer"
```

## Required Implementation

### Abstract Methods (Must Implement)

#### 1. `source_name` (property)
Returns a string identifier for the source.

```python
@property
def source_name(self) -> str:
    return "workable"
```

#### 2. `fetch_jobs(company, **kwargs)` (async)
Fetches raw job data from the API.

**Parameters:**
- `company` (str): Company identifier/slug
- `**kwargs`: Additional parameters (for flexibility)

**Returns:** `List[dict]` - Raw job data from API

**Raises:** `SourceException` on failure

#### 3. `normalize_job(raw_job, company)` (sync)
Converts raw API response to standardized `JobData` object.

**Parameters:**
- `raw_job` (dict): Raw job data from API
- `company` (str, optional): Company identifier

**Returns:** `JobData` - Normalized job object

**Raises:** `ValidationException` on failure

## JobData Schema

All sources must map to this schema:

```python
class JobData(BaseModel):
    title: str              # Job title
    company: str            # Company name
    location: str           # Location
    remote: bool            # Remote status
    description: str        # Full job description
    apply_url: str          # URL to apply
    source: str             # Source name (your source_name)
```

## Best Practices

✅ **Do:**
- Use `HttpClient` for HTTP requests (includes retry logic, logging)
- Log important operations with `logger.info()` 
- Raise appropriate exceptions (`SourceException`, `ValidationException`)
- Handle missing/malformed data gracefully
- Document API details and rate limits in docstrings

❌ **Don't:**
- Make direct `requests` calls (use `HttpClient`)
- Return incomplete `JobData` objects
- Ignore exceptions silently
- Hardcode API keys in code (use environment variables)

## Existing Sources

Refer to `greenhouse.py` for a complete example with pagination and error handling.

## Testing Your Source

```bash
# Run all tests
pytest tests/ -v

# Run specific source tests
pytest tests/test_workable.py -v

# Test fetch functionality
python3 -c "
import asyncio
from sources.workable import WorkableSource

source = WorkableSource()
jobs = asyncio.run(source.fetch_jobs('company1'))
print(f'Fetched {len(jobs)} jobs')
"
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Source not found | Make sure it's registered in `__init__.py` |
| Fetch fails | Check API URL, authentication, rate limits |
| Normalization fails | Verify raw job data structure matches API docs |
| Tests fail | Add missing fields to `JobData` mapping |

---

**Questions?** Check the [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md) for architecture details.
