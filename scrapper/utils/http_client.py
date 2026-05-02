"""HTTP client with retry logic, timeouts, and rate limiting."""

import httpx
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from utils.exceptions import NetworkException
from utils.logger import get_logger


logger = get_logger(__name__)


class HttpClient:
    """HTTP client with built-in retry logic, timeouts, and rate limiting.
    
    Features:
    - Exponential backoff with jitter
    - Configurable timeouts
    - Rate limiting (requests per second)
    - Async support for concurrent requests
    """
    
    def __init__(
        self,
        timeout: int = 10,
        max_retries: int = 3,
        retry_backoff_factor: float = 1.5,
        requests_per_second: int = 5
    ):
        """Initialize HTTP client.
        
        Args:
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
            retry_backoff_factor: Backoff multiplier (1s, 2s, 4s, etc.)
            requests_per_second: Rate limit for requests
        """
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_backoff_factor = retry_backoff_factor
        self.requests_per_second = requests_per_second
        
        # Rate limiting
        self.min_request_interval = 1.0 / requests_per_second
        self.last_request_time = None
        
        # HTTP client
        self.client = httpx.AsyncClient(timeout=timeout)
    
    async def get(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> httpx.Response:
        """Make GET request with retry logic.
        
        Args:
            url: Request URL
            headers: Optional request headers
            params: Optional query parameters
        
        Returns:
            HTTP response
        
        Raises:
            NetworkException: If request fails after all retries
        """
        return await self._request("GET", url, headers=headers, params=params)
    
    async def _request(
        self,
        method: str,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, Any]] = None,
        attempt: int = 0
    ) -> httpx.Response:
        """Internal method to handle requests with retry logic.
        
        Args:
            method: HTTP method
            url: Request URL
            headers: Optional request headers
            params: Optional query parameters
            attempt: Current attempt number (0-indexed)
        
        Returns:
            HTTP response
        
        Raises:
            NetworkException: If request fails after all retries
        """
        # Rate limiting: enforce minimum interval between requests
        await self._enforce_rate_limit()
        
        try:
            response = await self.client.request(
                method,
                url,
                headers=headers,
                params=params
            )
            
            # Log successful request
            logger.info(
                f"{method} {url}",
                extra={
                    "status": response.status_code,
                    "duration_ms": response.elapsed.total_seconds() * 1000,
                    "attempt": attempt + 1
                }
            )
            
            return response
        
        except (httpx.TimeoutException, httpx.ConnectError) as e:
            # Retry on timeout or connection errors
            if attempt < self.max_retries:
                backoff_seconds = (self.retry_backoff_factor ** attempt)
                logger.warning(
                    f"Request failed, retrying in {backoff_seconds}s",
                    extra={
                        "url": url,
                        "attempt": attempt + 1,
                        "max_retries": self.max_retries,
                        "error": str(e)
                    }
                )
                
                await asyncio.sleep(backoff_seconds)
                return await self._request(method, url, headers, params, attempt + 1)
            
            # All retries exhausted
            raise NetworkException(
                f"Request failed after {self.max_retries + 1} attempts: {str(e)}",
                original_error=e
            )
        
        except httpx.HTTPError as e:
            # Non-retriable HTTP errors
            raise NetworkException(
                f"HTTP error: {str(e)}",
                original_error=e
            )
    
    async def _enforce_rate_limit(self):
        """Enforce rate limiting by enforcing minimum interval between requests."""
        if self.last_request_time is not None:
            elapsed = (datetime.now() - self.last_request_time).total_seconds()
            if elapsed < self.min_request_interval:
                await asyncio.sleep(self.min_request_interval - elapsed)
        
        self.last_request_time = datetime.now()
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()


# Global client instance
_http_client: Optional[HttpClient] = None


def get_http_client(
    timeout: int = 10,
    max_retries: int = 3,
    retry_backoff_factor: float = 1.5,
    requests_per_second: int = 5
) -> HttpClient:
    """Get or create HTTP client instance.
    
    Args:
        timeout: Request timeout in seconds
        max_retries: Maximum number of retry attempts
        retry_backoff_factor: Backoff multiplier
        requests_per_second: Rate limit for requests
    
    Returns:
        HttpClient instance
    """
    global _http_client
    
    if _http_client is None:
        _http_client = HttpClient(
            timeout=timeout,
            max_retries=max_retries,
            retry_backoff_factor=retry_backoff_factor,
            requests_per_second=requests_per_second
        )
    
    return _http_client
