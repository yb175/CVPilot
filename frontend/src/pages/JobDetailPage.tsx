import { MOCK_JOBS } from "../data/MockJobs";
import { JobMatchBadge } from "../components/Jobs/JobMatchBadge";
import { JobDescription } from "../components/Jobs/JobDescription";
import { JobActions } from "../components/Jobs/JobActions";

interface JobDetailPageProps {
  jobId: string;
  onBack: () => void;
}

const LOCATION_STYLES: Record<string, string> = {
  REMOTE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  HYBRID: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  ONSITE: "bg-sky-500/10 text-sky-400 border-sky-500/20",
};

const SENIORITY_STYLES: Record<string, string> = {
  INTERN: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  FULLTIME: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

export default function JobDetailPage({ jobId, onBack }: JobDetailPageProps) {
  const job = MOCK_JOBS.find((j) => j.jobId === jobId);

  if (!job) {
    return (
      <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-sm">Job not found.</p>
          <button onClick={onBack} className="mt-4 text-indigo-400 text-sm hover:text-indigo-300 transition-colors">
            ← Back to matches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080b14] text-white">
      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Back nav */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-8 group"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="group-hover:-translate-x-0.5 transition-transform">
            <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to matches
        </button>

        {/* Hero card */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6 mb-4">
          <p className="text-[10px] tracking-[0.35em] text-gray-500 font-medium mb-4">
            CVPILOT — JOB DETAIL
          </p>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1
                className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight text-[#e8e8e8]"
                style={{ fontFamily: "'Georgia', serif" }}
              >
                {job.title}
              </h1>
              <p className="text-base text-gray-400 mt-1 font-medium">{job.company}</p>
              <p className="text-sm text-gray-500 mt-0.5">{job.location}</p>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className={`inline-flex items-center text-[10px] font-semibold tracking-wide px-2.5 py-1 rounded-md border ${LOCATION_STYLES[job.locationType]}`}>
                  {job.locationType}
                </span>
                <span className={`inline-flex items-center text-[10px] font-semibold tracking-wide px-2.5 py-1 rounded-md border ${SENIORITY_STYLES[job.seniority]}`}>
                  {job.seniority}
                </span>
                {job.salary && (
                  <span className="inline-flex items-center text-[10px] font-semibold tracking-wide px-2.5 py-1 rounded-md border border-white/[0.08] bg-white/[0.04] text-gray-400">
                    {job.salary}
                  </span>
                )}
                <span className="inline-flex items-center text-[10px] font-medium tracking-wide px-2.5 py-1 rounded-md text-gray-600">
                  {job.postedAt}
                </span>
              </div>
            </div>

            {/* Score ring */}
            <div className="flex-shrink-0">
              <JobMatchBadge score={job.score} size="lg" />
            </div>
          </div>

          {/* Reason */}
          <div className="mt-5 pt-5 border-t border-white/[0.06]">
            <p className="text-[10px] tracking-[0.2em] text-gray-600 uppercase font-medium mb-2">
              Why you match
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">{job.reason}</p>
          </div>
        </div>

        {/* Description + Skills */}
        <div className="mb-4">
          <JobDescription description={job.description} skills={job.skills} />
        </div>

        {/* Actions */}
        <JobActions jobId={job.jobId} />
      </div>
    </div>
  );
}