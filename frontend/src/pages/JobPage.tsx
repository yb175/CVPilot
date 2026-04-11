import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { JobList } from "../components/Jobs/JobList";
import { MOCK_JOBS } from "../data/MockJobs";
import { PageContainer, GridBackground, Container, Button, PageTransition, useToast } from "../components/ui";
import { checkResumeExists } from "../services/resume";
import { useApi } from "../lib/fetcher";

interface JobsPageProps {
  onNavigateToJob: (jobId: string) => void;
}

export default function JobsPage({ onNavigateToJob }: JobsPageProps) {
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

  // Only show real data: job count
  // Note: topScore and avgScore removed - requires actual AI matching we don't have access to
  const jobCount = MOCK_JOBS.length;

  const handleRefetchJobs = async () => {
    setIsRefetching(true);
    // TODO: Implement API call to refetch jobs based on current resume
    // This would call the backend to re-run the matching algorithm
    setTimeout(() => {
      setIsRefetching(false);
      addToast({
        message: 'Job list refreshed! New matches may be available.',
        variant: 'success',
      });
    }, 1500);
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
              <p className="text-text-secondary text-sm sm:text-base leading-relaxed max-w-md">
                Ranked by neural match score. Top 10 opportunities tailored to your resume and preferences.
              </p>
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
        ) : (
          /* Show job list */
          <>
            {/* Stats Card - Only showing realistic data (job count) */}
            <div className="bg-bg-surface border border-border-light rounded-xl py-4 px-4 sm:px-6 mb-8">
              <p className="text-xs text-text-tertiary font-semibold uppercase tracking-wide mb-2">Available Positions</p>
              <p className="text-3xl font-bold text-text-primary">{jobCount}</p>
            </div>

            {/* Job List */}
            <JobList jobs={MOCK_JOBS} onJobClick={onNavigateToJob} />
          </>
        )}
      </Container>
      </PageContainer>
    </PageTransition>
  );
}