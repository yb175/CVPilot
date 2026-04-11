import { JobCard } from "./JobCard";
import type { Job } from "../../data/MockJobs";

interface JobListProps {
  jobs: Job[];
  onJobClick: (jobId: string) => void;
}

export function JobList({ jobs, onJobClick }: JobListProps) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600 text-sm">No matched jobs found.</p>
        <p className="text-gray-700 text-xs mt-1">Upload a resume and set your preferences to see matches.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {jobs.slice(0, 10).map((job, index) => (
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
          index={index}
          onClick={onJobClick}
        />
      ))}
    </div>
  );
}