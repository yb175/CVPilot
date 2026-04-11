import { useState, useEffect } from "react";
import { JobCard } from "./JobCard";
import type { Job } from "../../data/MockJobs";

interface JobListProps {
  jobs: Job[];
  onJobClick: (jobId: string) => void;
}

const JOBS_PER_PAGE = 5;

export function JobList({ jobs, onJobClick }: JobListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset/clamp currentPage when jobs change
  useEffect(() => {
    const totalPages = jobs.length === 0 ? 1 : Math.ceil(jobs.length / JOBS_PER_PAGE);
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [jobs, currentPage]);

  if (jobs.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary text-sm">No matched jobs found.</p>
        <p className="text-text-tertiary text-xs mt-1">Upload a resume and set your preferences to see matches.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(jobs.length / JOBS_PER_PAGE);
  const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
  const endIndex = startIndex + JOBS_PER_PAGE;
  const paginatedJobs = jobs.slice(startIndex, endIndex);

  return (
    <div>
      {/* Job Cards */}
      <div className="space-y-2 mb-6">
        {paginatedJobs.map((job, index) => (
          <JobCard
            key={job.jobId}
            jobId={job.jobId}
            title={job.title}
            company={job.company}
            location={job.location}
            locationType={job.locationType}
            seniority={job.seniority}
            score={job.score}
            reason={job.reason}
            index={startIndex + index}
            onClick={onJobClick}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6 border-t border-border-light">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-lg border border-border-light text-text-secondary hover:text-text-primary hover:border-border-normal disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            ← Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === i + 1
                    ? 'bg-accent-primary text-white'
                    : 'border border-border-light text-text-secondary hover:text-text-primary hover:border-border-normal'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-lg border border-border-light text-text-secondary hover:text-text-primary hover:border-border-normal disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Next →
          </button>

          <span className="text-xs text-text-tertiary ml-4">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}