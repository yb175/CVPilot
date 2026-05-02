"""Custom exceptions for job scraper."""


class ScraperException(Exception):
    """Base exception for scraper errors."""
    pass


class SourceException(ScraperException):
    """Exception raised by job sources."""
    
    def __init__(self, source: str, message: str, original_error: Exception = None):
        self.source = source
        self.message = message
        self.original_error = original_error
        super().__init__(f"[{source}] {message}")


class ConfigException(ScraperException):
    """Exception raised by configuration loading."""
    pass


class NetworkException(ScraperException):
    """Exception raised during network operations."""
    
    def __init__(self, message: str, status_code: int = None, original_error: Exception = None):
        self.message = message
        self.status_code = status_code
        self.original_error = original_error
        super().__init__(message)


class ValidationException(ScraperException):
    """Exception raised during data validation."""
    pass
