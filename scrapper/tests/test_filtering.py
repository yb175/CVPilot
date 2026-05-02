"""Tests for job filtering and ranking service."""

import pytest
from models.job_schema import JobData
from service.scoring import (
    ScoringConfig,
    extract_keywords,
    cheap_filter_jobs,
    score_job,
    filter_jobs_by_threshold,
    count_keyword_matches
)
from service.job_filter import JobFilteringService, get_filtering_service


class TestExtractKeywords:
    """Test keyword extraction."""
    
    def test_extract_keywords_simple(self):
        """Test extracting keywords from simple text."""
        keywords = extract_keywords("Python JavaScript Go")
        assert keywords == {"python", "javascript", "go"}
    
    def test_extract_keywords_case_insensitive(self):
        """Test case-insensitive extraction."""
        keywords = extract_keywords("PYTHON javascript Go")
        assert keywords == {"python", "javascript", "go"}
    
    def test_extract_keywords_empty(self):
        """Test with empty text."""
        assert extract_keywords("") == set()
        assert extract_keywords(None) == set()
    
    def test_extract_keywords_with_special_chars(self):
        """Test extraction with special characters."""
        keywords = extract_keywords("Hello, World! C++ C#")
        assert "hello" in keywords
        assert "world" in keywords
        # C++ and C# might be split
        assert "c" in keywords


class TestCountKeywordMatches:
    """Test keyword counting and matching."""
    
    def test_count_matches_basic(self):
        """Test counting keyword matches."""
        count, matched = count_keyword_matches(
            "Python and JavaScript are great",
            {"python", "javascript", "go"}
        )
        assert count == 2
        assert matched == {"python", "javascript"}
    
    def test_count_matches_case_insensitive(self):
        """Test case-insensitive matching."""
        count, matched = count_keyword_matches(
            "PYTHON and Javascript",
            {"python", "javascript"}
        )
        assert count == 2
    
    def test_count_matches_no_match(self):
        """Test with no matches."""
        count, matched = count_keyword_matches(
            "Ruby and Java",
            {"python", "go"}
        )
        assert count == 0
        assert matched == set()
    
    def test_count_matches_empty_keywords(self):
        """Test with empty keywords."""
        count, matched = count_keyword_matches("Hello World", set())
        assert count == 0
        assert matched == set()


class TestCheapFilter:
    """Test Stage 1: Cheap filtering."""
    
    @pytest.fixture
    def sample_jobs(self):
        """Create sample jobs for testing."""
        return [
            JobData(
                title="Senior Backend Engineer",
                company="Stripe",
                location="San Francisco, CA",
                remote=True,
                description="Python and Go backend engineer",
                apply_url="https://example.com/1",
                source="greenhouse"
            ),
            JobData(
                title="Sales Manager",
                company="Acme",
                location="New York, NY",
                remote=False,
                description="Sales management role",
                apply_url="https://example.com/2",
                source="greenhouse"
            ),
            JobData(
                title="DevOps Engineer",
                company="Google",
                location="Mountain View, CA",
                remote=True,
                description="Kubernetes and cloud infrastructure",
                apply_url="https://example.com/3",
                source="greenhouse"
            ),
            JobData(
                title="Marketing Manager",
                company="Meta",
                location="Menlo Park, CA",
                remote=False,
                description="Product marketing",
                apply_url="https://example.com/4",
                source="greenhouse"
            )
        ]
    
    def test_cheap_filter_no_context(self, sample_jobs):
        """Test filtering without user context (tech roles only)."""
        result = cheap_filter_jobs(sample_jobs)
        
        # Should only keep engineering roles
        assert result.count_before == 4
        assert result.count_after == 2  # Backend + DevOps
        assert "Engineer" in result.jobs[0].title
        assert "Engineer" in result.jobs[1].title
    
    def test_cheap_filter_with_user_context_role(self, sample_jobs):
        """Test filtering with user context (role preference)."""
        user_context = {
            "preferred_roles": ["backend", "devops"],
            "skills": None
        }
        result = cheap_filter_jobs(sample_jobs, user_context)
        
        assert result.count_before == 4
        assert result.count_after >= 2  # Should include backend and devops
    
    def test_cheap_filter_with_user_context_skills(self, sample_jobs):
        """Test filtering with user skills."""
        user_context = {
            "preferred_roles": [],
            "skills": ["python", "kubernetes"]
        }
        result = cheap_filter_jobs(sample_jobs, user_context)
        
        # Should keep jobs with skills mention
        assert result.count_after > 0
    
    def test_cheap_filter_remote_only(self, sample_jobs):
        """Test filtering with remote-only preference."""
        user_context = {
            "remote_only": True,
            "preferred_roles": ["engineer"]
        }
        result = cheap_filter_jobs(sample_jobs, user_context)
        
        # All returned jobs should be remote
        assert all(job.remote for job in result.jobs)


class TestScoring:
    """Test Stage 2: Relevance scoring."""
    
    @pytest.fixture
    def test_job(self):
        """Create test job."""
        return {
            "title": "Senior Backend Engineer",
            "company": "Stripe",
            "location": "San Francisco, CA",
            "remote": True,
            "description": "We are hiring a senior backend engineer with Python and Go experience",
            "apply_url": "https://example.com/job",
            "source": "greenhouse"
        }
    
    def test_score_title_role_match(self, test_job):
        """Test +3 for title role match."""
        user_context = {"preferred_roles": ["backend"]}
        scored = score_job(test_job, user_context)
        
        assert scored.title_role_match is True
        assert scored.breakdown.get("title_role") == 3
    
    def test_score_description_role_match(self, test_job):
        """Test +2 for description role match."""
        user_context = {"preferred_roles": ["senior"]}
        scored = score_job(test_job, user_context)
        
        # "Senior" appears in description
        assert scored.description_role_match is True
        assert scored.breakdown.get("description_role") == 2
    
    def test_score_strong_skill_match(self, test_job):
        """Test +3 for strong skill overlap (2+ skills)."""
        user_context = {"skills": ["python", "go"]}
        scored = score_job(test_job, user_context)
        
        assert scored.strong_skill_match is True
        assert scored.breakdown.get("strong_skills") == 3
    
    def test_score_weak_skill_match(self, test_job):
        """Test +1 for weak skill overlap (1 skill)."""
        user_context = {"skills": ["python"]}
        scored = score_job(test_job, user_context)
        
        assert scored.weak_skill_match is True
        assert scored.breakdown.get("weak_skills") == 1
    
    def test_score_location_match(self, test_job):
        """Test +1 for location match."""
        user_context = {"preferred_location": "San Francisco"}
        scored = score_job(test_job, user_context)
        
        assert scored.location_match is True
        assert scored.breakdown.get("location") == 1
    
    def test_score_remote_match(self, test_job):
        """Test +1 for remote preference match."""
        user_context = {"remote_only": True}
        scored = score_job(test_job, user_context)
        
        assert scored.remote_match is True
        assert scored.breakdown.get("remote") == 1
    
    def test_score_combined(self, test_job):
        """Test combined scoring."""
        user_context = {
            "preferred_roles": ["backend"],
            "skills": ["python", "go"],
            "preferred_location": "San Francisco",
            "remote_only": True
        }
        scored = score_job(test_job, user_context)
        
        # Should have: +3 (title) + +2 (desc) + +3 (skills) + +1 (location) + +1 (remote) = 10
        assert scored.score >= 10
        assert scored.title_role_match is True
        assert scored.strong_skill_match is True


class TestThresholdFilter:
    """Test Stage 3: Threshold filtering."""
    
    def test_filter_by_threshold(self):
        """Test threshold filtering."""
        from service.scoring import JobScore
        
        job_scores = [
            JobScore(job={"title": "Job1"}, score=5),
            JobScore(job={"title": "Job2"}, score=2),
            JobScore(job={"title": "Job3"}, score=1),
            JobScore(job={"title": "Job4"}, score=0),
        ]
        
        filtered = filter_jobs_by_threshold(job_scores, threshold=2)
        
        assert len(filtered) == 2
        assert all(js.score >= 2 for js in filtered)


class TestJobFilteringService:
    """Test complete filtering pipeline."""
    
    @pytest.fixture
    def filtering_service(self):
        """Create filtering service."""
        return get_filtering_service()
    
    @pytest.fixture
    def sample_jobs(self):
        """Create sample jobs."""
        return [
            JobData(
                title="Senior Backend Engineer",
                company="Stripe",
                location="San Francisco, CA",
                remote=True,
                description="Python backend engineer wanted",
                apply_url="https://example.com/1",
                source="greenhouse"
            ),
            JobData(
                title="Frontend React Developer",
                company="Netflix",
                location="Los Gatos, CA",
                remote=True,
                description="React and JavaScript experience required",
                apply_url="https://example.com/2",
                source="greenhouse"
            ),
            JobData(
                title="DevOps Engineer",
                company="Google",
                location="Mountain View, CA",
                remote=False,
                description="Kubernetes and Docker",
                apply_url="https://example.com/3",
                source="greenhouse"
            ),
        ]
    
    def test_filter_and_rank_no_context(self, filtering_service, sample_jobs):
        """Test filtering without user context."""
        result = filtering_service.filter_and_rank_jobs(sample_jobs)
        
        assert result["total_initial"] == 3
        assert result["total_after_stage1"] == 3  # All are engineer roles
        assert result["total_returned"] > 0
        assert "jobs" in result
    
    def test_filter_and_rank_with_context(self, filtering_service, sample_jobs):
        """Test filtering with user context."""
        user_context = {
            "skills": ["python", "backend"],
            "preferred_roles": ["backend"],
            "preferred_location": "San Francisco",
            "remote_only": False
        }
        result = filtering_service.filter_and_rank_jobs(sample_jobs, user_context)
        
        assert result["user_context_applied"] is True
        assert result["total_returned"] > 0
        # First job should rank highest (backend + python + San Francisco)
        if result["total_returned"] > 0:
            assert "Backend" in result["jobs"][0].title
    
    def test_filter_and_rank_with_limit(self, filtering_service, sample_jobs):
        """Test limiting results."""
        result = filtering_service.filter_and_rank_jobs(sample_jobs, limit=1)
        
        assert len(result["jobs"]) <= 1
    
    def test_filter_and_rank_empty(self, filtering_service):
        """Test with empty job list."""
        result = filtering_service.filter_and_rank_jobs([])
        
        assert result["total_initial"] == 0
        assert result["total_returned"] == 0
        assert result["jobs"] == []


class TestIntegration:
    """Integration tests for the filtering pipeline."""
    
    def test_pipeline_reduces_jobs(self):
        """Test that pipeline reduces jobs appropriately."""
        # Create many diverse jobs
        jobs = [
            JobData(
                title=f"Backend Engineer - Variant {i}",
                company=f"Company{i}",
                location="San Francisco, CA",
                remote=True if i % 2 == 0 else False,
                description="Python Go backend " + "x" * (i * 10),
                apply_url=f"https://example.com/{i}",
                source="greenhouse"
            )
            for i in range(20)
        ] + [
            JobData(
                title="Sales Manager",
                company=f"SalesCompany{i}",
                location="New York, NY",
                remote=False,
                description="Sales and business development",
                apply_url=f"https://example.com/sales/{i}",
                source="greenhouse"
            )
            for i in range(5)
        ]
        
        service = get_filtering_service()
        result = service.filter_and_rank_jobs(jobs)
        
        # Should filter out sales jobs
        assert result["total_initial"] == 25
        assert result["total_after_stage1"] == 20  # Only backend engineers
        assert result["total_returned"] <= result["total_after_stage1"]
