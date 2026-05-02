"""Job filtering and ranking service orchestrator.

Implements the complete 5-stage filtering pipeline:
- Stage 1: Cheap filtering (role keywords, skill overlap)
- Stage 2: Relevance scoring (weighted heuristics)
- Stage 3: Dynamic threshold filtering
- Stage 4: Sorting (by score descending)
- Stage 5: Top-K selection (apply limit)
"""

from typing import List, Dict, Optional
from models.job_schema import JobData
from utils.logger import get_logger
from .scoring import (
    ScoringConfig,
    JobScore,
    cheap_filter_jobs,
    score_job,
    filter_jobs_by_threshold,
)


logger = get_logger(__name__)


class JobFilteringService:
    """Service for filtering and ranking jobs by relevance.
    
    This is a PRE-RANKING stage before embeddings and LLM.
    Uses only string matching, regex, and heuristic scoring.
    """
    
    def __init__(self, config: Optional[ScoringConfig] = None):
        """Initialize filtering service.
        
        Args:
            config: Optional ScoringConfig for customization
        """
        self.config = config or ScoringConfig()
    
    def filter_and_rank_jobs(
        self,
        jobs: List[JobData],
        user_context: Optional[Dict] = None,
        limit: Optional[int] = None
    ) -> Dict:
        """Execute complete 5-stage filtering pipeline.
        
        Pipeline:
        1. Cheap Filtering: Role keywords, skill overlap, remote preference
        2. Relevance Scoring: Weighted heuristics
        3. Dynamic Threshold: Remove low-quality jobs
        4. Sorting: Sort by score DESC
        5. Top-K Selection: Apply limit
        
        Args:
            jobs: List of normalized JobData objects
            user_context: Optional dict with user preferences:
                {
                    "skills": ["python", "javascript"],
                    "preferred_roles": ["backend", "devops"],
                    "preferred_location": "San Francisco",
                    "remote_only": False
                }
            limit: Maximum jobs to return
        
        Returns:
            Dict with pipeline statistics and results:
            {
                "total_initial": int,
                "total_after_stage1": int,
                "total_after_stage2": int,
                "total_after_stage3": int,
                "total_returned": int,
                "jobs": List[JobData],
                "pipeline_summary": str,
                "user_context_applied": bool
            }
        """
        if not jobs:
            return {
                "total_initial": 0,
                "total_after_stage1": 0,
                "total_after_stage2": 0,
                "total_after_stage3": 0,
                "total_returned": 0,
                "jobs": [],
                "pipeline_summary": "No jobs provided",
                "user_context_applied": False,
                "threshold_applied": self._get_threshold(user_context is not None),
                "score_breakdown": []
            }
        
        total_initial = len(jobs)
        user_context_applied = user_context is not None
        
        logger.info(
            "Starting job filtering pipeline",
            extra={
                "total_jobs": total_initial,
                "has_user_context": user_context_applied,
                "limit": limit
            }
        )
        
        # Stage 1: Cheap Filtering
        filter_result = cheap_filter_jobs(jobs, user_context, self.config)
        filtered_jobs = filter_result.jobs
        total_after_stage1 = len(filtered_jobs)
        
        # Stage 2: Relevance Scoring
        job_scores: List[JobScore] = []
        for job in filtered_jobs:
            job_dict = job.dict()
            scored_job = score_job(job_dict, user_context, self.config)
            job_scores.append(scored_job)
        
        total_after_stage2 = len(job_scores)
        
        # Stage 3: Dynamic Threshold Filtering
        threshold = self._get_threshold(user_context_applied)
        relevant_jobs = filter_jobs_by_threshold(job_scores, threshold)
        total_after_stage3 = len(relevant_jobs)
        
        # Stage 4: Sorting (by score DESC)
        sorted_jobs = sorted(relevant_jobs, key=lambda js: js.score, reverse=True)
        
        logger.info(
            "Stage 4: Sorting completed",
            extra={
                "count": len(sorted_jobs),
                "top_score": sorted_jobs[0].score if sorted_jobs else 0,
                "min_score": sorted_jobs[-1].score if sorted_jobs else 0
            }
        )
        
        # Stage 5: Top-K Selection (apply limit)
        if limit:
            top_jobs = sorted_jobs[:limit]
        else:
            top_jobs = sorted_jobs
        
        total_returned = len(top_jobs)
        
        logger.info(
            "Stage 5: Top-K selection completed",
            extra={
                "requested_limit": limit,
                "returned": total_returned
            }
        )
        
        # Convert JobScore objects back to JobData
        result_jobs = [JobData(**js.job) for js in top_jobs]
        
        # Generate pipeline summary
        pipeline_summary = (
            f"Pipeline: {total_initial} → {total_after_stage1} (cheap filter) → "
            f"{total_after_stage2} (scored) → {total_after_stage3} (threshold) → "
            f"{total_returned} (limited)"
        )
        
        logger.info(
            "Job filtering pipeline completed",
            extra={
                "initial": total_initial,
                "after_cheap_filter": total_after_stage1,
                "after_scoring": total_after_stage2,
                "after_threshold": total_after_stage3,
                "final": total_returned,
                "reduction_pct": round(100 * (total_initial - total_returned) / max(total_initial, 1)),
                "user_context": user_context_applied,
                "threshold": threshold
            }
        )
        
        return {
            "total_initial": total_initial,
            "total_after_stage1": total_after_stage1,
            "total_after_stage2": total_after_stage2,
            "total_after_stage3": total_after_stage3,
            "total_returned": total_returned,
            "jobs": result_jobs,
            "pipeline_summary": pipeline_summary,
            "user_context_applied": user_context_applied,
            "threshold_applied": threshold,
            "score_breakdown": [
                {
                    "title": js.job.get("title"),
                    "company": js.job.get("company"),
                    "score": js.score,
                    "breakdown": js.breakdown,
                    "matched_roles": list(js.matched_roles),
                    "matched_skills": list(js.matched_skills)
                }
                for js in top_jobs[:5]  # Top 5 with breakdown
            ]
        }
    
    def _get_threshold(self, has_user_context: bool) -> int:
        """Get dynamic threshold based on user context.
        
        Args:
            has_user_context: Whether user context was provided
        
        Returns:
            Minimum score threshold
        """
        if has_user_context:
            return self.config.threshold_with_user_context
        else:
            return self.config.threshold_without_user_context


def get_filtering_service(config: Optional[ScoringConfig] = None) -> JobFilteringService:
    """Get or create a JobFilteringService instance.
    
    Args:
        config: Optional ScoringConfig for customization
    
    Returns:
        JobFilteringService instance
    """
    return JobFilteringService(config=config)
