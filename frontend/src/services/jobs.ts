import type { Job } from "../data/MockJobs";

export interface MatchJobsResponse {
  method: "sync" | "async";
  source: "active_jobs_db" | "db_fallback";
  jobsFetched: number;
  matchedJobs: number;
  results: Array<{
    jobId: string;
    title: string;
    company: string;
    location: string;
    description: string;
    skills: string[];
    jobUrl?: string;
    score: number | string;
    confidence: number;
    reason: string;
  }>;
  duration: number;
}

/**
 * Fetch matched jobs from the backend
 * Returns ranked jobs with match scores based on user's resume
 */
export const fetchMatchedJobs = async (
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>
): Promise<Job[]> => {
  try {
    const res = await fetchWithAuth("/jobs/match", {
      method: "POST",
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to fetch matched jobs (${res.status})`
      );
    }

    const data: MatchJobsResponse = await res.json();

    // Transform backend response to Job interface using real values
    const jobs: Job[] = data.results.map((result) => ({
      jobId: result.jobId,
      title: result.title,
      company: result.company,
      location: result.location,
      locationType: "REMOTE",
      seniority: "FULLTIME",
      score: String(result.score),
      reason: result.reason,
      description: result.description,
      skills: result.skills,
      postedAt: "Recently",
      jobUrl: result.jobUrl,
    }));

    return jobs;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to fetch matched jobs:", message);
    throw new Error(message);
  }
};
