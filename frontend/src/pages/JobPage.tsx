import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { JobList } from "../components/Jobs/JobList";
import type { Job } from "../data/MockJobs";
import { PageContainer, GridBackground, Container, Button, PageTransition, useToast } from "../components/ui";
import { checkResumeExists } from "../services/resume";
import { fetchMatchedJobs } from "../services/jobs";
import { useApi } from "../lib/fetcher";

interface JobsPageProps {
  onNavigateToJob: (jobId: string) => void;
}

export default function JobsPage({ onNavigateToJob }: JobsPageProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const [isCheckingResume, setIsCheckingResume] = useState(true);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { fetchWithAuth } = useApi();

  // Stable ref to prevent effect rerun
  const fetchRef = useRef(fetchWithAuth);
  useEffect(() => {
    fetchRef.current = fetchWithAuth;
  }, [fetchWithAuth]);

  // Check if user has uploaded resume
  useEffect(() => {
    const checkResume = async () => {
      try {
        const exists = await checkResumeExists(fetchRef.current);
        setHasResume(exists);
      } catch (err) {
        console.error("Failed to check resume:", err);
        setHasResume(false);
      } finally {
        setIsCheckingResume(false);
      }
    };
    checkResume();
  }, []);

  // Fetch matched jobs from backend when user has resume
  useEffect(() => {
    if (!hasResume || isCheckingResume) {
      return;
    }

    const loadJobs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const matchedJobs = await fetchMatchedJobs(fetchRef.current);
        setJobs(matchedJobs);

        if (matchedJobs.length === 0) {
          addToast({
            message: "No matching jobs found. Try uploading a different resume.",
            variant: "info",
          });
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch jobs";
        setError(errorMessage);
        addToast({
          message: `Error: ${errorMessage}`,
          variant: "error",
        });
        console.error("Job fetching error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadJobs();
  }, [hasResume, isCheckingResume, addToast]);

  const jobCount = jobs.length;

  const handleRefetchJobs = async () => {
    setIsRefetching(true);
    setError(null);

    try {
      const matchedJobs = await fetchMatchedJobs(fetchRef.current);
      setJobs(matchedJobs);
      addToast({
        message:
          matchedJobs.length > 0
            ? `Found ${matchedJobs.length} matching jobs!`
            : "No new matching jobs found.",
        variant: "success",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to refresh jobs";
      setError(errorMessage);
      addToast({
        message: `Error: ${errorMessage}`,
        variant: "error",
      });
      console.error("Job refresh error:", err);
    } finally {
      setIsRefetching(false);
    }
  };

  // Handle job click - redirect to job URL
  const handleJobClick = (job: Job) => {
    if (job.jobUrl) {
      window.open(job.jobUrl, "_blank");
    } else {
      addToast({
        message: "Job URL not available",
        variant: "warning",
      });
    }
    onNavigateToJob(job.jobId);
  };

  return (
    <PageTransition>
      <PageContainer background="secondary">
        <GridBackground />

        <Container size="lg" className="py-10 sm:py-16">
        {/* Page Header - Only show when resume exists */}
        {!isCheckingResume && hasResume && (
          <div className="mb-10 flex flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex-1">
              <p className="text-xs tracking-widest text-text-tertiary font-medium mb-4 uppercase">
                CVpilot — Job Matches
              </p>
              <h1
                className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-text-primary mb-3 font-display"
              >
                Your{" "}
                <em
                  className="not-italic"
                  style={{
                    background: "linear-gradient(135deg, #a5b4fc 0%, #818cf8 60%, #6366f1 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  matches.
                </em>
              </h1>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 mt-4 sm:mt-0 sm:flex-shrink-0">
              <Button
                onClick={handleRefetchJobs}
                isLoading={isRefetching}
                variant="secondary"
                size="md"
              >
                ↻ Refresh Jobs
              </Button>
              <Button
                onClick={() => navigate("/profile")}
                variant="ghost"
                size="md"
              >
                ↺ Re-upload Resume
              </Button>
            </div>
          </div>
        )}

        {/* Content based on resume status */}
        {isCheckingResume ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin">
              <svg className="h-8 w-8 text-accent-bright" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          </div>
        ) : !hasResume ? (
          /* Show CTA to upload resume */
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
            <div className="mb-6 p-4 rounded-full bg-accent-primary/10">
              <svg className="w-12 h-12 text-accent-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Upload Your Resume</h2>
            <p className="text-text-secondary mb-8">We need your resume to match you with the perfect job opportunities. Let's get started!</p>
            <Button
              onClick={() => navigate("/profile")}
              variant="primary"
              size="lg"
            >
              Add Resume →
            </Button>
          </div>
        ) : isLoading ? (
          /* Show loading state */
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin">
              <svg className="h-8 w-8 text-accent-bright" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          </div>
        ) : error ? (
          /* Show error state */
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
            <div className="mb-6 p-4 rounded-full bg-red-500/10">
              <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Unable to Load Jobs</h2>
            <p className="text-text-secondary mb-6">{error}</p>
            <div className="flex gap-2">
              <Button
                onClick={handleRefetchJobs}
                variant="primary"
                size="md"
              >
                Try Again
              </Button>
              <Button
                onClick={() => navigate("/profile")}
                variant="secondary"
                size="md"
              >
                Update Resume
              </Button>
            </div>
          </div>
        ) : (
          /* Show job list */
          <>
            {/* Stats Card - Only showing realistic data (job count) */}
            <div className="bg-bg-surface border border-border-light rounded-xl py-4 px-4 sm:px-6 mb-8">
              <p className="text-xs text-text-tertiary font-semibold uppercase tracking-wide mb-2">Available Positions</p>
              <p className="text-3xl font-bold text-text-primary">{jobCount}</p>
            </div>

            {/* Job List */}
            <JobList jobs={jobs} onJobClick={handleJobClick} />
          </>
        )}
      </Container>
      </PageContainer>
    </PageTransition>
  );
}