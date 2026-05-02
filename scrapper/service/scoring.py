"""Job scoring and relevance calculation.

This module implements Stages 1-3 of the filtering pipeline:
- Stage 1: Cheap filtering (role keywords, skill overlap, remote preference)
- Stage 2: Relevance scoring (weighted heuristics)
- Stage 3: Dynamic threshold filtering
"""

import re
from dataclasses import dataclass, field
from typing import List, Dict, Set, Optional, Tuple
from models.job_schema import JobData
from utils.logger import get_logger


logger = get_logger(__name__)


@dataclass
class ScoringConfig:
    """Configuration for job scoring and filtering weights."""
    
    # Stage 2: Scoring Weights
    title_role_match_weight: int = 3      # +3 highest priority
    description_role_match_weight: int = 2  # +2 supporting
    strong_skill_overlap_weight: int = 3  # +3 (2+ skills found)
    weak_skill_overlap_weight: int = 1    # +1 (1 skill found)
    location_match_weight: int = 1        # +1
    remote_match_weight: int = 1          # +1
    
    # Stage 3: Threshold for filtering
    threshold_with_user_context: int = 2   # Min score with user context
    threshold_without_user_context: int = 1  # Min score without context
    
    # Stage 1: Skill overlap thresholds
    min_skills_for_strong_overlap: int = 2
    min_skills_for_weak_overlap: int = 1
    
    # Stage 1: Role keywords (tech/engineering roles)
    role_keywords: Set[str] = field(default_factory=lambda: {
        "engineer", "developer", "backend", "frontend", "fullstack",
        "devops", "sre", "qa", "qa engineer", "data scientist",
        "data engineer", "ml engineer", "architect", "lead",
        "senior", "staff", "principal", "manager"
    })
    
    # Stage 1: Keywords to exclude (non-tech roles)
    exclude_keywords: Set[str] = field(default_factory=lambda: {
        "sales", "business development", "marketing", "hr", "human resources",
        "recruiter", "recruiting", "legal", "finance", "accounting", "accountant",
        "consultant", "support", "customer success", "account manager"
    })


@dataclass
class JobScore:
    """Represents a job with its relevance score and breakdown."""
    
    job: Dict  # JobData as dict
    score: int = 0
    title_role_match: bool = False
    description_role_match: bool = False
    strong_skill_match: bool = False
    weak_skill_match: bool = False
    location_match: bool = False
    remote_match: bool = False
    breakdown: Dict[str, int] = field(default_factory=dict)
    matched_skills: Set[str] = field(default_factory=set)
    matched_roles: Set[str] = field(default_factory=set)


@dataclass
class FilterResult:
    """Result from Stage 1 cheap filtering."""
    
    jobs: List[JobData]
    count_before: int
    count_after: int
    reason: str


def extract_keywords(text: str) -> Set[str]:
    """Extract lowercase keywords from text.
    
    Args:
        text: Text to extract keywords from
    
    Returns:
        Set of lowercase keywords
    """
    if not text:
        return set()
    
    # Convert to lowercase and split on word boundaries
    words = re.findall(r'\b[a-z0-9]+\b', text.lower())
    return set(words)


def has_keyword_match(text: str, keywords: Set[str]) -> bool:
    """Check if any keyword is present in text.
    
    Args:
        text: Text to search
        keywords: Set of keywords to look for
    
    Returns:
        True if any keyword found
    """
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in keywords)


def count_keyword_matches(text: str, keywords: Set[str]) -> Tuple[int, Set[str]]:
    """Count how many keywords are present in text.
    
    Args:
        text: Text to search
        keywords: Set of keywords to look for
    
    Returns:
        Tuple of (count, matched_keywords)
    """
    if not keywords or not text:
        return 0, set()
    
    text_lower = text.lower()
    matched = set()
    
    for keyword in keywords:
        if keyword in text_lower:
            matched.add(keyword)
    
    return len(matched), matched


def cheap_filter_jobs(
    jobs: List[JobData],
    user_context: Optional[Dict] = None,
    config: Optional[ScoringConfig] = None
) -> FilterResult:
    """Stage 1: Apply cheap filtering to reduce job set.
    
    Reduces ~80-90% of jobs through fast keyword matching.
    
    Args:
        jobs: List of normalized JobData objects
        user_context: Optional user preferences
        config: ScoringConfig instance
    
    Returns:
        FilterResult with filtered jobs and statistics
    """
    if config is None:
        config = ScoringConfig()
    
    count_before = len(jobs)
    filtered_jobs = []
    
    # If no user context: keep only generic tech/engineering roles
    if not user_context:
        for job in jobs:
            title_lower = job.title.lower()
            
            # Check for role keywords
            has_role = any(kw in title_lower for kw in config.role_keywords)
            
            # Check against exclude keywords
            has_exclude = any(kw in title_lower for kw in config.exclude_keywords)
            
            # Keep if has tech role and no exclusion
            if has_role and not has_exclude:
                filtered_jobs.append(job)
        
        reason = "Generic tech role filtering (no user context)"
    
    # If user context: filter by role + skill overlap
    else:
        user_skills = set(user_context.get("skills", []) or [])
        user_roles = set(user_context.get("preferred_roles", []) or [])
        user_remote_only = user_context.get("remote_only", False)
        
        # Use user roles or fall back to default tech roles
        role_keywords = user_roles if user_roles else config.role_keywords
        
        for job in jobs:
            title_lower = job.title.lower()
            description_lower = job.description.lower()
            text = f"{title_lower} {description_lower}"
            
            # Check role keyword match
            has_role_match = any(kw in title_lower for kw in role_keywords)
            
            # Check skill overlap (if user provided skills)
            skill_count = 0
            if user_skills:
                skill_count, _ = count_keyword_matches(text, user_skills)
            
            has_skill_match = skill_count >= config.min_skills_for_weak_overlap
            
            # Check remote preference
            matches_remote = not user_remote_only or job.remote
            
            # Keep if: (has role) OR (has skill match) AND (matches remote)
            if matches_remote and (has_role_match or has_skill_match):
                filtered_jobs.append(job)
        
        reason = f"User-context filtering (roles={user_roles}, skills={user_skills})"
    
    count_after = len(filtered_jobs)
    
    logger.info(
        "Stage 1: Cheap filtering completed",
        extra={
            "before": count_before,
            "after": count_after,
            "reduction_pct": round(100 * (count_before - count_after) / max(count_before, 1)),
            "reason": reason
        }
    )
    
    return FilterResult(
        jobs=filtered_jobs,
        count_before=count_before,
        count_after=count_after,
        reason=reason
    )


def score_job(
    job: Dict,
    user_context: Optional[Dict] = None,
    config: Optional[ScoringConfig] = None
) -> JobScore:
    """Stage 2: Score a job based on relevance heuristics.
    
    Scoring breakdown:
    - +3 title role match (highest priority)
    - +2 description role match
    - +3 strong skill overlap (2+ skills)
    - +1 weak skill overlap (1 skill)
    - +1 location match
    - +1 remote match
    
    Args:
        job: Job data dictionary
        user_context: User preferences
        config: ScoringConfig instance
    
    Returns:
        JobScore with score and breakdown
    """
    if config is None:
        config = ScoringConfig()
    
    job_score = JobScore(job=job, breakdown={})
    score = 0
    
    # Extract searchable text
    title_lower = job.get("title", "").lower()
    description_lower = job.get("description", "").lower()
    location_lower = job.get("location", "").lower()
    job_remote = job.get("remote", False)
    
    # Default to tech roles if no user context
    if not user_context:
        role_keywords = config.role_keywords
        user_skills = None
        user_location = None
        user_remote_only = False
    else:
        user_skills = set(user_context.get("skills", []))
        user_roles = set(user_context.get("preferred_roles", []))
        role_keywords = user_roles if user_roles else config.role_keywords
        user_location = user_context.get("preferred_location")
        user_remote_only = user_context.get("remote_only", False)
    
    # 1. Title role matching (+3, highest priority)
    title_has_role, matched_roles_title = count_keyword_matches(title_lower, role_keywords)
    if title_has_role:
        score += config.title_role_match_weight
        job_score.breakdown["title_role"] = config.title_role_match_weight
        job_score.title_role_match = True
        job_score.matched_roles.update(matched_roles_title)
    
    # 2. Description role matching (+2)
    desc_has_role, matched_roles_desc = count_keyword_matches(description_lower, role_keywords)
    if desc_has_role:
        score += config.description_role_match_weight
        job_score.breakdown["description_role"] = config.description_role_match_weight
        job_score.description_role_match = True
        job_score.matched_roles.update(matched_roles_desc)
    
    # 3. Skill matching (+3 strong or +1 weak)
    if user_skills:
        combined_text = f"{title_lower} {description_lower}"
        skill_count, matched_skills = count_keyword_matches(combined_text, user_skills)
        job_score.matched_skills = matched_skills
        
        if skill_count >= config.min_skills_for_strong_overlap:
            # Strong skill overlap (2+ skills)
            score += config.strong_skill_overlap_weight
            job_score.breakdown["strong_skills"] = config.strong_skill_overlap_weight
            job_score.strong_skill_match = True
        elif skill_count >= config.min_skills_for_weak_overlap:
            # Weak skill overlap (1 skill)
            score += config.weak_skill_overlap_weight
            job_score.breakdown["weak_skills"] = config.weak_skill_overlap_weight
            job_score.weak_skill_match = True
    
    # 4. Location matching (+1)
    if user_location:
        user_location_lower = user_location.lower()
        if user_location_lower in location_lower:
            score += config.location_match_weight
            job_score.breakdown["location"] = config.location_match_weight
            job_score.location_match = True
    
    # 5. Remote preference matching (+1)
    if user_remote_only and job_remote:
        # User wants remote, job is remote
        score += config.remote_match_weight
        job_score.breakdown["remote"] = config.remote_match_weight
        job_score.remote_match = True
    elif not user_remote_only and not job_remote:
        # User doesn't require remote, job is on-site (neutral to slight boost)
        pass
    elif not user_remote_only and job_remote:
        # User flexible, job is remote (slight boost)
        score += config.remote_match_weight // 2
        job_score.breakdown["remote_flexible"] = config.remote_match_weight // 2
        job_score.remote_match = True
    
    job_score.score = score
    return job_score


def filter_jobs_by_threshold(
    job_scores: List[JobScore],
    threshold: int = 1
) -> List[JobScore]:
    """Stage 3: Filter jobs by minimum score threshold.
    
    Args:
        job_scores: List of JobScore objects
        threshold: Minimum score to include
    
    Returns:
        Filtered job scores above threshold
    """
    filtered = [js for js in job_scores if js.score >= threshold]
    
    logger.info(
        "Stage 3: Threshold filtering completed",
        extra={
            "before": len(job_scores),
            "after": len(filtered),
            "threshold": threshold,
            "filtered_out": len(job_scores) - len(filtered)
        }
    )
    
    return filtered
