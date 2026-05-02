"""Production-ready job scraper microservice.

A modular, extensible job scraper with plugin-based architecture.
Supports multiple job sources (Greenhouse, Lever, Ashby, etc.) with
concurrent fetching, normalization, and error handling.

Example usage:
    POST /internal/ingest
    {
        "sources": ["greenhouse"],
        "companies": ["stripe", "notion"],
        "limit_per_company": 50
    }
"""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from api import router
from utils.logger import get_logger
from utils.http_client import get_http_client


logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager for startup/shutdown."""
    # Startup
    logger.info("Job scraper service starting")
    yield
    # Shutdown
    logger.info("Job scraper service shutting down")
    http_client = get_http_client()
    await http_client.close()


# Create FastAPI app
app = FastAPI(
    title="Job Scraper Service",
    description="Production-ready job scraping microservice with plugin-based architecture",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware (restrict to backend only in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict to backend domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


@app.get("/")
async def root():
    """Root endpoint with service info."""
    return {
        "service": "Job Scraper",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "GET /health",
            "ingest": "POST /internal/ingest",
            "docs": "GET /docs"
        }
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "details": str(exc)}
    )


if __name__ == "__main__":
    import uvicorn
    import os
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    
    logger.info(f"Starting server on {host}:{port}")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )
