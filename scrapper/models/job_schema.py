"""Pydantic models for job data and API responses."""

from pydantic import BaseModel, Field
from typing import Optional, List


class JobData(BaseModel):
    """Normalized job data schema.
    
    All jobs from different sources are normalized to this schema.
    """
    title: str = Field(..., description="Job title")
    company: str = Field(..., description="Company name")
    location: str = Field(..., description="Job location (city, country)")
    remote: bool = Field(default=False, description="Whether job is remote")
    description: str = Field(..., description="Job description text")
    apply_url: str = Field(..., description="URL to apply for the job")
    source: str = Field(..., description="Source of the job (e.g., 'greenhouse')")
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Senior Software Engineer",
                "company": "Stripe",
                "location": "San Francisco, CA",
                "remote": True,
                "description": "We are looking for a senior software engineer to join our team...",
                "apply_url": "https://boards.greenhouse.io/stripe/jobs/1234567",
                "source": "greenhouse"
            }
        }


class UserContext(BaseModel):
    """User preferences for job filtering and ranking."""
    skills: Optional[List[str]] = Field(
        default=None,
        description="User's technical skills (e.g., ['python', 'javascript', 'go'])"
    )
    preferred_roles: Optional[List[str]] = Field(
        default=None,
        description="Preferred job roles (e.g., ['backend', 'devops', 'data-engineer'])"
    )
    preferred_location: Optional[str] = Field(
        default=None,
        description="Preferred job location (e.g., 'San Francisco', 'New York')"
    )
    remote_only: Optional[bool] = Field(
        default=False,
        description="Whether to only show remote jobs"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "skills": ["python", "javascript"],
                "preferred_roles": ["backend", "devops"],
                "preferred_location": "San Francisco",
                "remote_only": False
            }
        }


class IngestionRequest(BaseModel):
    """Request body for job ingestion endpoint."""
    sources: Optional[List[str]] = Field(
        default=None, 
        description="List of sources to ingest from (if None, uses all configured sources)"
    )
    companies: Optional[List[str]] = Field(
        default=None,
        description="List of company slugs to ingest from (if None, uses all configured companies)"
    )
    limit_per_company: Optional[int] = Field(
        default=None,
        description="Limit jobs per company (default: 10, max: 12). Applied AFTER relevance-based filtering for clean UI."
    )
    user_context: Optional[UserContext] = Field(
        default=None,
        description="User preferences for relevance-based filtering and ranking"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "sources": ["greenhouse"],
                "companies": ["stripe", "notion"],
                "limit_per_company": 50,
                "user_context": {
                    "skills": ["python", "javascript"],
                    "preferred_roles": ["backend"],
                    "preferred_location": "San Francisco",
                    "remote_only": False
                }
            }
        }


class IngestionResponse(BaseModel):
    """Response body for job ingestion endpoint."""
    total: int = Field(..., description="Total number of jobs fetched")
    jobs: List[JobData] = Field(default_factory=list, description="List of normalized jobs")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total": 2,
                "jobs": [
                    {
                        "title": "Senior Software Engineer",
                        "company": "Stripe",
                        "location": "San Francisco, CA",
                        "remote": True,
                        "description": "...",
                        "apply_url": "https://boards.greenhouse.io/stripe/jobs/1234567",
                        "source": "greenhouse"
                    }
                ]
            }
        }


class ErrorResponse(BaseModel):
    """Response body for error cases."""
    error: str = Field(..., description="Error message")
    details: Optional[str] = Field(default=None, description="Additional error details")
    partial: Optional[IngestionResponse] = Field(
        default=None,
        description="Partial results if some sources/companies succeeded"
    )
