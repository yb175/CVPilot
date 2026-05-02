"""Greenhouse job source implementation."""

import asyncio
import httpx
from typing import List, Optional, Dict, Tuple
from datetime import datetime, timedelta, timezone
from models.job_schema import JobData
from sources.base import JobSource
from utils.http_client import HttpClient
from utils.exceptions import SourceException, ValidationException
from utils.logger import get_logger


logger = get_logger(__name__)


class GreenhouseSource(JobSource):
    """Greenhouse.io job source.
    
    Fetches jobs from Greenhouse public boards API.
    API: https://boards-api.greenhouse.io/v1/boards/{company}/jobs
    
    No authentication required for public boards.
    """
    
    BASE_URL = "https://boards-api.greenhouse.io/v1/boards"
    DEFAULT_LIMIT = 100  # API default and max
    DEFAULT_DETAIL_LIMIT = 10
    MAX_DETAIL_LIMIT = 15
    CACHE_TTL_SECONDS = 3600  # 60 minutes
    DETAIL_REQUEST_TIMEOUT_SECONDS = 4
    MAX_CONCURRENT = 5

    # Shared across instances to avoid repeated list fetches.
    _job_list_cache: Dict[str, Tuple[datetime, List[dict]]] = {}
    _cache_lock = asyncio.Lock()

    @classmethod
    def clear_cache(cls) -> None:
        """Clear cached job lists (useful for tests and cache invalidation)."""
        cls._job_list_cache.clear()
    
    def __init__(self):
        """Initialize Greenhouse source."""
        self.http_client = HttpClient()
    
    @property
    def source_name(self) -> str:
        """Return source identifier."""
        return "greenhouse"
    
    async def fetch_jobs(self, company: str, limit: Optional[int] = None, **kwargs) -> List[dict]:
        """Fetch jobs from Greenhouse for a company.
        
        Optimized pipeline:
        1. Fetch job list once, with TTL cache
        2. Cheap score using title + location only
        3. Sort and keep only top K candidates
        4. Fetch details only for selected jobs in parallel
        
        Args:
            company: Company slug (e.g., 'stripe', 'notion')
            limit: Maximum jobs to fetch after filtering
            **kwargs: Additional parameters (ignored, for extensibility)
        
        Returns:
            List of raw job dictionaries from Greenhouse API with full descriptions
        
        Raises:
            SourceException: If fetch fails
        """
        url = f"{self.BASE_URL}/{company}/jobs"
        detail_limit = self._resolve_detail_limit(limit, kwargs.get("detail_limit"))
        
        try:
            jobs = await self._get_job_list(company, url)

            if not jobs:
                logger.info(
                    f"No jobs found for Greenhouse/{company}",
                    extra={"source": "greenhouse", "company": company}
                )
                return []

            scored_jobs = self._score_and_rank_candidates(jobs)
            selected_jobs = scored_jobs[:detail_limit]

            logger.info(
                f"Selected top {len(selected_jobs)} Greenhouse/{company} jobs for detail fetch",
                extra={
                    "source": "greenhouse",
                    "company": company,
                    "initial_count": len(jobs),
                    "selected_count": len(selected_jobs),
                    "detail_limit": detail_limit
                }
            )

            if not selected_jobs:
                return []

            detailed_jobs = await self._fetch_details_parallel(url, selected_jobs)

            if limit:
                detailed_jobs = detailed_jobs[:limit]

            logger.info(
                f"Successfully fetched {len(detailed_jobs)} jobs from Greenhouse/{company}",
                extra={
                    "source": "greenhouse",
                    "company": company,
                    "job_count": len(detailed_jobs)
                }
            )

            return detailed_jobs

        except httpx.HTTPError as e:
            raise SourceException(
                source="greenhouse",
                message=f"Failed to fetch jobs from {company}: {str(e)}",
                original_error=e
            )
        except Exception as e:
            raise SourceException(
                source="greenhouse",
                message=f"Unexpected error fetching jobs from {company}: {str(e)}",
                original_error=e
            )

    async def _get_job_list(self, company: str, url: str) -> List[dict]:
        """Get the Greenhouse job list with TTL caching."""
        cache_key = company.lower()
        now = datetime.now(timezone.utc)

        async with self._cache_lock:
            cached_entry = self._job_list_cache.get(cache_key)
            if cached_entry:
                cached_at, cached_jobs = cached_entry
                if now - cached_at < timedelta(seconds=self.CACHE_TTL_SECONDS):
                    logger.info(
                        f"Using cached Greenhouse job list for {company}",
                        extra={
                            "source": "greenhouse",
                            "company": company,
                            "cached_count": len(cached_jobs)
                        }
                    )
                    return cached_jobs

        logger.info(
            f"Fetching job list from Greenhouse/{company}",
            extra={"source": "greenhouse", "company": company}
        )

        response = await self.http_client.get(url)
        response.raise_for_status()

        data = response.json()
        jobs = data.get("jobs", [])

        async with self._cache_lock:
            self._job_list_cache[cache_key] = (now, jobs)

        return jobs

    def _resolve_detail_limit(self, limit: Optional[int], detail_limit: Optional[int]) -> int:
        """Resolve the number of jobs to fetch details for.

        Defaults to a small top-K window so we do not fetch details for the
        entire list. The cap is intentionally strict to keep network usage low.
        """
        if detail_limit is not None:
            resolved = detail_limit
        elif limit is not None:
            resolved = limit
        else:
            resolved = self.DEFAULT_DETAIL_LIMIT

        resolved = max(1, resolved)
        return min(resolved, self.MAX_DETAIL_LIMIT)

    def _score_and_rank_candidates(self, jobs: List[dict]) -> List[dict]:
        """Score jobs using only title and location, then sort by score."""
        scored_jobs = []

        for index, job in enumerate(jobs):
            title = self._safe_get(job, "title", "").lower()
            location = self._location_as_text(job).lower()
            score = self._score_title_location(title, location)

            if score <= 0:
                continue

            scored_jobs.append((score, index, job))

        scored_jobs.sort(key=lambda item: item[0], reverse=True)

        return [job for score, index, job in scored_jobs]

    def _score_title_location(self, title: str, location: str) -> int:
        """Best-match only relevance score based on title and location."""
        # Role keywords for matching
        role_keywords = {
            "engineer", "developer", "backend", "frontend", "full stack",
            "mobile", "platform", "data", "ml", "ai", "sre", "devops",
            "architect", "scientist", "software", "systems", "product", "cloud"
        }

        # Exclusion keywords
        exclude_keywords = {
            "sales", "marketing", "recruiter", "legal", "finance",
            "support", "account executive", "business development"
        }

        # If any exclude keyword is present, score is 0
        if any(keyword in title for keyword in exclude_keywords):
            return 0

        # Score is 1 if any role keyword matches, else 0
        score = 1 if any(keyword in title for keyword in role_keywords) else 0

        return score

    def _location_as_text(self, job: dict) -> str:
        """Return location as a lowercase string for scoring."""
        location = job.get("location", "")
        if isinstance(location, dict):
            return location.get("name", "") or ""
        return str(location or "")

    async def _fetch_details_parallel(self, base_url: str, jobs: List[dict]) -> List[dict]:
        """Fetch job details in parallel with concurrency control and fail-fast timeouts."""
        semaphore = asyncio.Semaphore(self.MAX_CONCURRENT)

        async def fetch_one_detail(job: dict) -> dict:
            job_id = job.get("id")
            if not job_id:
                return None

            async with semaphore:
                try:
                    detail_url = f"{base_url}/{job_id}"
                    response = await asyncio.wait_for(
                        self.http_client.get(detail_url),
                        timeout=self.DETAIL_REQUEST_TIMEOUT_SECONDS
                    )
                    response.raise_for_status()
                    return response.json()
                except Exception as e:
                    logger.warning(
                        f"Skipping Greenhouse job {job_id} after detail fetch failure",
                        extra={
                            "source": "greenhouse",
                            "job_id": job_id,
                            "error": str(e)
                        }
                    )
                    return None

        results = await asyncio.gather(*(fetch_one_detail(job) for job in jobs))
        return [job for job in results if job is not None]
    
    def normalize_job(self, raw_job: dict, company: str = None) -> JobData:
        """Normalize Greenhouse job to standard schema.
        
        Args:
            raw_job: Raw job dictionary from Greenhouse API
            company: Company slug (e.g., 'stripe'). If provided, will be formatted as title case.
        
        Returns:
            Normalized JobData object
        
        Raises:
            ValidationException: If normalization fails
        """
        try:
            # Extract fields from Greenhouse job object
            title = self._safe_get(raw_job, "title", "Untitled")
            # Use provided company slug, formatted nicely. Fall back to API data if not provided.
            company_name = company.title() if company else raw_job.get("company", {}).get("name", "Unknown Company")
            
            # Location handling - Greenhouse can have nested location object
            location = "Remote"
            if isinstance(raw_job.get("location"), dict):
                location = raw_job["location"].get("name", "Remote")
            elif isinstance(raw_job.get("location"), str):
                location = raw_job["location"]
            
            # Check for remote attribute
            remote = raw_job.get("remote", False) or raw_job.get("is_remote", False)
            if isinstance(remote, str):
                remote = remote.lower() in ("true", "yes", "remote")
            
            # Description from content field (full job details endpoint)
            # Greenhouse stores full content in the "content" field
            description = self._safe_get(raw_job, "content", "")
            
            # Fallback: try alternative field names if content is empty
            if not description:
                description = self._safe_get(raw_job, "description", "")
            if not description:
                description = self._safe_get(raw_job, "job_content", "")
            
            # Clean up HTML from description if present
            description = self._clean_html(description)
            
            # Apply URL
            apply_url = self._safe_get(raw_job, "absolute_url", "")
            
            # Validate required fields
            if not title or title == "Untitled":
                raise ValidationException("Job title is required")
            if not apply_url:
                raise ValidationException("Job apply URL is required")
            
            # Log if description is missing
            if not description:
                logger.warning(
                    f"Job description is empty: {title} at {company_name}",
                    extra={
                        "title": title,
                        "company": company_name,
                        "url": apply_url
                    }
                )
            
            return JobData(
                title=title.strip(),
                company=company_name.strip(),
                location=location.strip() or "Remote",
                remote=bool(remote),
                description=description.strip(),
                apply_url=apply_url.strip(),
                source=self.source_name
            )
        
        except ValidationException:
            raise
        except Exception as e:
            raise ValidationException(f"Failed to normalize job: {str(e)}")
    
    @staticmethod
    def _safe_get(obj: dict, key: str, default: str = "") -> str:
        """Safely get string value from dictionary.
        
        Args:
            obj: Dictionary to get value from
            key: Key to retrieve
            default: Default value if key missing or value is None
        
        Returns:
            String value or default
        """
        value = obj.get(key, default)
        if value is None:
            return default
        return str(value)
    
    @staticmethod
    def _clean_html(text: str) -> str:
        """Remove HTML tags from text.
        
        Args:
            text: Text possibly containing HTML
        
        Returns:
            Cleaned text without HTML tags
        """
        if not text:
            return ""
        
        # Simple HTML tag removal (good enough for job descriptions)
        import re
        
        # Remove script and style elements
        text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Decode HTML entities
        import html
        text = html.unescape(text)
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
