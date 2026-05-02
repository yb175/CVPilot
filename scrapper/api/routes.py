"""API routes for job scraper."""

import asyncio
from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
import time

from models.job_schema import JobData, IngestionRequest, IngestionResponse, ErrorResponse
from sources import SourceRegistry
from config.loader import load_companies
from service.job_filter import get_filtering_service
from utils.logger import get_logger
from utils.exceptions import ScraperException, SourceException, ValidationException


logger = get_logger(__name__)

router = APIRouter()

# UI Configuration
DEFAULT_RESULT_LIMIT = 10  # Default results for clean UI
MAX_RESULT_LIMIT = 12      # Maximum results allowed


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "available_sources": SourceRegistry.list_sources()
    }


@router.post("/internal/ingest", response_model=IngestionResponse)
async def ingest_jobs(request: IngestionRequest = None):
    """Trigger job ingestion with 5-stage relevance-based filtering.
    
    Pipeline:
    1. Cheap Filtering: Role keywords, skill overlap, remote preference
    2. Relevance Scoring: Weighted heuristics
    3. Dynamic Threshold: Remove low-quality jobs
    4. Sorting: Sort by score DESC
    5. Top-K Selection: Return top N results
    
    Request body (optional):
    {
        "sources": ["greenhouse"],
        "companies": ["stripe", "notion"],
        "limit_per_company": 50,
        "user_context": {
            "skills": ["python", "javascript"],
            "preferred_roles": ["backend"],
            "preferred_location": "San Francisco",
            "remote_only": false
        }
    }
    
    Response:
    {
        "total": 50,
        "jobs": [
            {
                "title": "Senior Backend Engineer",
                "company": "Stripe",
                "location": "San Francisco, CA",
                "remote": true,
                "description": "...",
                "apply_url": "...",
                "source": "greenhouse"
            }
        ]
    }
    """
    start_time = time.time()
    
    try:
        # Load configuration
        companies_config = load_companies()
        
        # Handle None request
        if request is None:
            request = IngestionRequest()
        
        # Determine which sources to use
        sources_to_use = request.sources if request.sources else list(companies_config.keys())
        
        # Validate sources exist
        for source in sources_to_use:
            if not SourceRegistry.is_registered(source):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown source: {source}. Available: {', '.join(SourceRegistry.list_sources())}"
                )
        
        # Collect all jobs
        all_jobs: List[JobData] = []
        errors: List[str] = []
        
        logger.info(
            "Starting job ingestion",
            extra={
                "sources": len(sources_to_use),
                "has_user_context": request.user_context is not None,
                "status": "started"
            }
        )
        
        # Process each source with concurrency
        for source_name in sources_to_use:
            # Determine companies for this source
            companies_for_source = request.companies if request.companies else companies_config.get(source_name, [])
            
            if not companies_for_source:
                logger.warning(
                    f"No companies configured for {source_name}",
                    extra={"source": source_name}
                )
                continue
            
            # Fetch jobs from all companies for this source (with concurrency)
            source_instance = SourceRegistry.get(source_name)
            
            # Create tasks for concurrent fetching
            fetch_tasks = [
                _fetch_and_normalize(
                    source_instance,
                    source_name,
                    company,
                    None,  # Don't limit at fetch stage; limit after filtering
                    errors
                )
                for company in companies_for_source
            ]
            
            # Execute all company fetches concurrently
            company_results = await asyncio.gather(*fetch_tasks, return_exceptions=False)
            
            # Collect results
            for result in company_results:
                if result:
                    all_jobs.extend(result)
        
        fetch_duration_ms = (time.time() - start_time) * 1000
        
        logger.info(
            "Fetch and normalization completed",
            extra={
                "total_jobs_fetched": len(all_jobs),
                "fetch_duration_ms": fetch_duration_ms
            }
        )
        
        # Stage: Apply relevance-based filtering and ranking
        filtering_service = get_filtering_service()
        
        # Convert user_context to dict if provided
        user_context_dict = None
        if request.user_context:
            user_context_dict = request.user_context.dict()
        
        # Execute 5-stage filtering pipeline
        # Cap results at MAX_RESULT_LIMIT for clean UI
        result_limit = request.limit_per_company
        if result_limit is None:
            result_limit = DEFAULT_RESULT_LIMIT
        elif result_limit > MAX_RESULT_LIMIT:
            result_limit = MAX_RESULT_LIMIT
            logger.info(
                f"Result limit capped at {MAX_RESULT_LIMIT} (requested: {request.limit_per_company})",
                extra={"requested": request.limit_per_company, "capped_at": MAX_RESULT_LIMIT}
            )
        
        filter_result = filtering_service.filter_and_rank_jobs(
            all_jobs,
            user_context=user_context_dict,
            limit=result_limit
        )
        
        total_duration_ms = (time.time() - start_time) * 1000
        
        logger.info(
            "Job ingestion and filtering completed",
            extra={
                "total_initial": filter_result["total_initial"],
                "after_stage1_cheap_filter": filter_result["total_after_stage1"],
                "after_stage2_scoring": filter_result["total_after_stage2"],
                "after_stage3_threshold": filter_result["total_after_stage3"],
                "final_returned": filter_result["total_returned"],
                "reduction_pct": round(100 * (filter_result["total_initial"] - filter_result["total_returned"]) / max(filter_result["total_initial"], 1)),
                "fetch_duration_ms": fetch_duration_ms,
                "filter_duration_ms": total_duration_ms - fetch_duration_ms,
                "total_duration_ms": total_duration_ms,
                "user_context": request.user_context is not None,
                "threshold": filter_result["threshold_applied"],
                "status": "completed"
            }
        )
        
        return IngestionResponse(
            total=len(filter_result["jobs"]),
            jobs=filter_result["jobs"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Job ingestion failed: {str(e)}",
            extra={"error": str(e)}
        )
        raise HTTPException(status_code=500, detail=f"Job ingestion failed: {str(e)}")  


async def _fetch_and_normalize(
    source_instance,
    source_name: str,
    company: str,
    limit: int = None,
    errors: List[str] = None
) -> List[JobData]:
    """Fetch and normalize jobs from a single company.
    
    Args:
        source_instance: JobSource instance
        source_name: Source identifier
        company: Company slug
        limit: Optional job limit
        errors: Shared error list
    
    Returns:
        List of normalized JobData objects
    """
    try:
        company_start = time.time()
        
        # Fetch raw jobs
        raw_jobs = await source_instance.fetch_jobs(company, limit=limit)
        
        # Normalize jobs
        normalized_jobs = []
        for raw_job in raw_jobs:
            try:
                # Pass company slug to normalize_job so sources can use it
                normalized_job = source_instance.normalize_job(raw_job, company=company)
                normalized_jobs.append(normalized_job)
            except ValidationException as e:
                logger.warning(
                    f"Failed to normalize job from {source_name}/{company}",
                    extra={
                        "source": source_name,
                        "company": company,
                        "error": str(e)
                    }
                )
                # Skip invalid job, continue with others
                continue
        
        company_duration_ms = (time.time() - company_start) * 1000
        
        logger.info(
            f"Fetched and normalized jobs from {source_name}/{company}",
            extra={
                "source": source_name,
                "company": company,
                "job_count": len(normalized_jobs),
                "duration_ms": company_duration_ms
            }
        )
        
        return normalized_jobs
    
    except SourceException as e:
        error_msg = f"{e.source}/{company}: {e.message}"
        logger.error(
            error_msg,
            extra={
                "source": source_name,
                "company": company,
                "error": str(e)
            }
        )
        if errors is not None:
            errors.append(error_msg)
        return []
    
    except Exception as e:
        error_msg = f"{source_name}/{company}: {str(e)}"
        logger.error(
            error_msg,
            extra={
                "source": source_name,
                "company": company,
                "error": str(e)
            }
        )
        if errors is not None:
            errors.append(error_msg)
        return []
