import { useNavigate } from "react-router-dom";
import { JobList } from "../components/Jobs/JobList";
import { PageContainer, GridBackground, Container, Button, PageTransition, useBookmarks } from "../components/ui";
import { MOCK_JOBS } from "../data/MockJobs";

interface SavedPageProps {
  onNavigateToJob?: (jobId: string) => void;
}

export default function SavedPage({ onNavigateToJob }: SavedPageProps) {
  const navigate = useNavigate();
  const { bookmarks } = useBookmarks();

  // Filter jobs to only show bookmarked ones
  const savedJobs = MOCK_JOBS.filter(job => bookmarks.has(job.jobId));
  const savedCount = savedJobs.length;

  const handleNavigateToJob = (jobId: string) => {
    onNavigateToJob?.(jobId);
  };

  return (
    <PageTransition>
      <PageContainer background="secondary">
        <GridBackground />

        <Container size="lg" className="py-10 sm:py-16">
          {/* Page Header */}
          <div className="mb-10">
            <p className="text-xs tracking-widest text-text-tertiary font-medium mb-4 uppercase">
              CVpilot — Saved Opportunities
            </p>
            <h1
              className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-text-primary mb-3 font-display"
            >
              Your <em
                className="not-italic"
                style={{
                  background: "linear-gradient(135deg, #a5b4fc 0%, #818cf8 60%, #6366f1 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                saved
              </em>{" "}
              opportunities.
            </h1>
            <p className="text-text-secondary text-sm sm:text-base leading-relaxed max-w-md">
              {savedCount === 0
                ? "Start saving jobs to build your collection of opportunities."
                : `${savedCount} ${savedCount === 1 ? 'opportunity' : 'opportunities'} saved and ready for review.`}
            </p>
          </div>

          {/* Content */}
          {savedCount === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
              <div className="mb-6 p-4 rounded-full bg-accent-primary/10">
                <svg className="w-12 h-12 text-accent-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h6a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">No Saved Jobs Yet</h2>
              <p className="text-text-secondary mb-8">
                Browse through opportunities and save the ones that interest you most. Your saved jobs will appear here.
              </p>
              <Button
                onClick={() => navigate("/jobs")}
                variant="primary"
                size="lg"
              >
                Explore Jobs →
              </Button>
            </div>
          ) : (
            /* Show saved jobs */
            <>
              {/* Stats Card */}
              <div className="bg-bg-surface border border-border-light rounded-xl py-4 px-4 sm:px-6 mb-8">
                <p className="text-xs text-text-tertiary font-semibold uppercase tracking-wide mb-2">Saved Positions</p>
                <p className="text-3xl font-bold text-text-primary">{savedCount}</p>
              </div>

              {/* Job List */}
              <JobList jobs={savedJobs} onJobClick={handleNavigateToJob} />

              {/* Back Button */}
              <div className="mt-8 flex justify-center">
                <Button
                  onClick={() => navigate("/jobs")}
                  variant="secondary"
                  size="lg"
                >
                  ← Back to All Jobs
                </Button>
              </div>
            </>
          )}
        </Container>
      </PageContainer>
    </PageTransition>
  );
}
