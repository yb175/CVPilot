interface JobActionsProps {
  jobId: string;
}

export function JobActions({ jobId }: JobActionsProps) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v11M1 6.5h11" stroke="#34d399" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-[#e8e8e8]">Actions</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        {/* Primary CTA */}
        <a
          href={`/tailor?jobId=${jobId}`}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-semibold px-5 py-2.5 transition-all duration-150"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9.5 1.5L12.5 4.5L5 12H2V9L9.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M8 3L11 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Tailor resume for this role
        </a>

        {/* Secondary: save */}
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.03] hover:bg-white/[0.07] active:scale-[0.98] text-gray-300 text-sm font-medium px-4 py-2.5 transition-all duration-150"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1.5L8.8 5.2L13 5.8L10 8.7L10.7 13L7 11.1L3.3 13L4 8.7L1 5.8L5.2 5.2L7 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
          Save job
        </button>
      </div>

      <p className="text-xs text-gray-600 mt-3 leading-relaxed">
        Tailoring adjusts your resume's language and emphasis to better match this job's requirements and terminology.
      </p>
    </div>
  );
}