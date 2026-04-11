interface JobDescriptionProps {
  description: string;
  skills: string[];
}

export function JobDescription({ description, skills }: JobDescriptionProps) {
  const paragraphs = description.split("\n\n").filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 3h9M2 6.5h9M2 10h5" stroke="#818cf8" strokeWidth="1.1" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#e8e8e8]">About the role</p>
        </div>
        <div className="space-y-3">
          {paragraphs.map((para, i) => (
            <p key={i} className="text-sm text-gray-400 leading-relaxed">
              {para}
            </p>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 10l3-7 2.5 5L9 6l2 4" stroke="#a78bfa" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#e8e8e8]">Required skills</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center text-xs font-medium px-3 py-1 rounded-lg border border-white/[0.09] bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}