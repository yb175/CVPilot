# Job Scraper Service

Production-ready job scraping microservice with modular, plugin-based architecture. Currently supports **Greenhouse**, easily extensible for Lever, Ashby, and other job sources.

## Features

✅ **Plugin-Based Architecture** - Add new job sources without modifying existing code  
✅ **Async Concurrency** - Fetch from multiple companies in parallel  
✅ **Resilient HTTP Client** - Automatic retry logic with exponential backoff  
✅ **Rate Limiting** - Built-in request throttling  
✅ **Comprehensive Logging** - Structured JSON logging with request tracking  
✅ **Type Safety** - Full Pydantic validation and type hints  
✅ **Fully Tested** - 21 unit and integration tests (100% passing)  

## Quick Start

### Installation

```bash
cd scrapper
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Running the Service

```bash
# Start server
python main.py

# Or use Uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Server runs on: `http://localhost:8000`

### API Documentation

Auto-generated docs available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## API Endpoints

### Health Check
```bash
GET /health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-23T10:00:00.000000",
  "available_sources": ["greenhouse"]
}
```

### Job Ingestion (Main Endpoint)
```bash
POST /internal/ingest
```

**Request Body** (optional):
```json
{
  "sources": ["greenhouse"],
  "companies": ["stripe", "notion"],
  "limit_per_company": 50
}
```

If not provided, uses all configured companies from `companies.json`.

**Response** (200 OK):
```json
{
  "total": 150,
  "jobs": [
    {
      "title": "Senior Software Engineer",
      "company": "Stripe",
      "location": "San Francisco, CA",
      "remote": true,
      "description": "We are looking for a senior software engineer...",
      "apply_url": "https://boards.greenhouse.io/stripe/jobs/1",
      "source": "greenhouse"
    }
  ]
}
```

## Configuration

### companies.json

Define which companies to scrape from:

```json
{
  "greenhouse": [
    "stripe",
    "notion",
    "figma",
    "airbnb",
    "coinbase",
    ...
  ]
}
```

Currently includes **~150 Greenhouse companies** (add more as needed).

### Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

**Configuration options**:
```
APP_ENV=development
DEBUG=false
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO
HTTP_TIMEOUT=10
MAX_RETRIES=3
RETRY_BACKOFF_FACTOR=1.5
REQUESTS_PER_SECOND=5
```

## Project Structure

```
scrapper/
├── main.py                              # FastAPI app entry point
├── companies.json                       # Company configuration
├── requirements.txt                     # Python dependencies
├── .env.example                         # Environment template
├── models/
│   ├── __init__.py
│   └── job_schema.py                    # Pydantic models (JobData, IngestionResponse)
├── sources/
│   ├── __init__.py                      # SourceRegistry (factory pattern)
│   ├── base.py                          # JobSource abstract base class
│   └── greenhouse.py                    # Greenhouse implementation
├── config/
│   ├── __init__.py
│   └── loader.py                        # Load companies.json and env config
├── utils/
│   ├── __init__.py
│   ├── logger.py                        # Structured JSON logging
│   ├── http_client.py                   # HTTP client with retry logic
│   └── exceptions.py                    # Custom exceptions
├── api/
│   ├── __init__.py
│   └── routes.py                        # API endpoints
└── tests/
    ├── conftest.py                      # Pytest fixtures
    ├── test_greenhouse.py               # Unit tests for Greenhouse
    ├── test_api.py                      # Integration tests for endpoints
    ├── test_sources.py                  # Source registry tests
    └── __init__.py
```

## Job Normalization Schema

All jobs are normalized to this schema:

```typescript
{
  title: string              // Job title
  company: string            // Company name
  location: string           // City, Country
  remote: boolean            // Is job remote?
  description: string        // Job description (HTML cleaned)
  apply_url: string          // URL to apply
  source: string             // "greenhouse", "lever", "ashby", etc.
}
```

## Adding a New Job Source

### Step 1: Create Source Class

Create `sources/lever.py`:

```python
from sources.base import JobSource
from models.job_schema import JobData
from typing import List

class LeverSource(JobSource):
    @property
    def source_name(self) -> str:
        return "lever"
    
    async def fetch_jobs(self, company: str, **kwargs) -> List[dict]:
        # Call Lever API
        # Return raw job list
        pass
    
    def normalize_job(self, raw_job: dict) -> JobData:
        # Map Lever fields to JobData schema
        pass
```

### Step 2: Register Source

In `sources/__init__.py`:

```python
from .lever import LeverSource

SourceRegistry.register("lever", LeverSource)
```

### Step 3: Add Companies

Update `companies.json`:

```json
{
  "greenhouse": [...],
  "lever": ["company1", "company2", ...]
}
```

### Step 4: Test

```bash
pytest tests/ -v
```

## Error Handling

### Partial Failures

If some companies fail, the service returns:
- Successfully fetched jobs from other companies
- Error details in logs
- HTTP 200 with partial results

### Rate Limiting

- Greenhouse API: No authentication required
- Built-in rate limiter: 5 requests/second (configurable)
- Automatic retry: 3 attempts with exponential backoff

## Testing

Run all tests:

```bash
pytest tests/ -v
```

Run specific test:

```bash
pytest tests/test_greenhouse.py -v
```

With coverage:

```bash
pytest tests/ --cov=sources --cov=api --cov=utils
```

**Current Status**: ✅ **21 tests passing**

## Logging

All requests are logged as structured JSON:

```json
{
  "timestamp": "2026-04-23T10:00:00.000000",
  "level": "INFO",
  "module": "api.routes",
  "message": "Fetched jobs from greenhouse/stripe",
  "source": "greenhouse",
  "company": "stripe",
  "status": "success",
  "job_count": 45,
  "duration_ms": 2150.5
}
```

View logs in terminal (default) or configure to file.

## Integration with Backend

When backend is ready:

```python
# Backend code
import httpx

async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://localhost:8000/internal/ingest",
        json={"sources": ["greenhouse"]}
    )
    jobs = response.json()["jobs"]
    
    # Now validate, normalize, store, match, etc.
```

The scraper returns normalized jobs—**backend handles database storage, embeddings, ranking, and LLM matching**.

## Performance

- **Throughput**: ~50 companies fetched in 20-30 seconds (concurrent)
- **Memory**: < 500MB for 500+ jobs
- **Timeouts**: 10s per request with retry
- **Rate Limit**: 5 requests/second (tunable)

## Troubleshooting

### 400 Bad Request
Check request format and `companies.json` syntax.

### 429 Too Many Requests
Rate limit hit. Adjust `REQUESTS_PER_SECOND` in `.env`.

### 500 Internal Server Error
Check logs for details. Likely network or parsing error.

### No jobs returned
- Verify company slug exists in Greenhouse
- Check network connectivity
- Review `companies.json` configuration

## Future Enhancements

- [ ] Add Lever integration
- [ ] Add Ashby integration
- [ ] Implement Redis caching layer
- [ ] Add database-backed job cache
- [ ] Implement webhook notifications
- [ ] Add batch job import from CSV/JSON

## License

Private project - CVPilot

## Support

For issues or questions, check:
1. Logs in stdout
2. API docs at `/docs`
3. Test suite for examples
