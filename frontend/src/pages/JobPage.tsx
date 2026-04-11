import { useState } from "react";
import { JobList } from "../components/Jobs/JobList";
import { MOCK_JOBS } from "../data/MockJobs";
 
interface JobsPageProps {
  onNavigateToJob: (jobId: string) => void;
}
 
export default function JobsPage({ onNavigateToJob }: JobsPageProps) {
  const [isLoading] = useState(false);
 
  const topScore = MOCK_JOBS[0]?.score ?? "0";
  const avgScore = Math.round(
    MOCK_JOBS.reduce((acc, j) => acc + parseInt(j.score, 10), 0) / MOCK_JOBS.length
  );
 
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
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <p className="text-[10px] tracking-[0.35em] text-gray-500 font-medium mb-4">
            CVPILOT — JOB MATCHES
          </p>
          <h1
            className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-[#e8e8e8]"
            style={{ fontFamily: "'Georgia', serif" }}
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
          <p className="mt-3 text-gray-400 text-sm sm:text-base leading-relaxed max-w-md">
            Ranked by neural match score. Top 10 opportunities tailored to your resume and preferences.
          </p>
        </div>
 
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl py-3 px-3 sm:px-4">
            <p className="text-base sm:text-xl font-bold text-white tracking-tight">
              {MOCK_JOBS.length}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5 tracking-widest">MATCHES</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl py-3 px-3 sm:px-4">
            <p className="text-base sm:text-xl font-bold text-emerald-400 tracking-tight">
              {topScore}%
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5 tracking-widest">TOP SCORE</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl py-3 px-3 sm:px-4">
            <p className="text-base sm:text-xl font-bold text-indigo-400 tracking-tight flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              {avgScore}%
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5 tracking-widest">AVG SCORE</p>
          </div>
        </div>
 
        {/* Job list */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        ) : (
          <JobList jobs={MOCK_JOBS} onJobClick={onNavigateToJob} />
        )}
      </div>
    </div>
  );
}