"""Structured logging for job scraper."""

import logging
import json
from typing import Any, Optional
from datetime import datetime


class JsonFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "module": record.name,
            "message": record.getMessage(),
        }
        
        # Add extra fields if present
        if hasattr(record, "source"):
            log_data["source"] = record.source
        if hasattr(record, "company"):
            log_data["company"] = record.company
        if hasattr(record, "status"):
            log_data["status"] = record.status
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms
        if hasattr(record, "job_count"):
            log_data["job_count"] = record.job_count
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data)


def get_logger(name: str) -> logging.Logger:
    """Get a logger with structured JSON formatting.
    
    Args:
        name: Logger name (typically __name__)
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    
    # Only configure if not already configured
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        
        handler = logging.StreamHandler()
        formatter = JsonFormatter()
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger


def log_ingest_start(logger: logging.Logger, sources: list, companies: list):
    """Log start of job ingestion."""
    logger.info(
        "Starting job ingestion",
        extra={
            "sources": len(sources),
            "companies": len(companies),
            "status": "started"
        }
    )


def log_source_fetch(
    logger: logging.Logger,
    source: str,
    company: str,
    status: str,
    job_count: int = 0,
    duration_ms: float = 0,
    error: str = None
):
    """Log source fetch result."""
    extra = {
        "source": source,
        "company": company,
        "status": status,
        "job_count": job_count,
        "duration_ms": duration_ms,
    }
    if error:
        extra["error"] = error
    
    logger.info(f"Fetched jobs from {source}/{company}", extra=extra)


def log_ingest_complete(
    logger: logging.Logger,
    total_jobs: int,
    duration_ms: float,
    errors: list = None
):
    """Log completion of job ingestion."""
    extra = {
        "total_jobs": total_jobs,
        "duration_ms": duration_ms,
        "status": "completed"
    }
    if errors:
        extra["errors"] = len(errors)
    
    logger.info("Job ingestion completed", extra=extra)
