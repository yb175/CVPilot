"""Base class for all job sources."""

from abc import ABC, abstractmethod
from typing import List
from models.job_schema import JobData


class JobSource(ABC):
    """Abstract base class for job sources.
    
    All job sources must implement this interface to be registered
    and used by the scraper.
    """
    
    @property
    @abstractmethod
    def source_name(self) -> str:
        """Return the source identifier (e.g., 'greenhouse').
        
        Returns:
            Source identifier string
        """
        pass
    
    @abstractmethod
    async def fetch_jobs(self, company: str, **kwargs) -> List[dict]:
        """Fetch raw job data from source for a company.
        
        Args:
            company: Company identifier/slug
            **kwargs: Additional parameters (limit, offset, etc.)
        
        Returns:
            List of raw job dictionaries from the API
        
        Raises:
            SourceException: If fetch fails
        """
        pass
    
    @abstractmethod
    def normalize_job(self, raw_job: dict, company: str = None) -> JobData:
        """Normalize raw job data to standard schema.
        
        Args:
            raw_job: Raw job dictionary from API
            company: Company slug/identifier (optional, for sources that need it)
        
        Returns:
            Normalized JobData object
        
        Raises:
            ValidationException: If normalization fails
        """
        pass
