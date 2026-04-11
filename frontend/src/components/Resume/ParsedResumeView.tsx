interface ParsedResumeData {
  summary?: string
  skills?: string[]
  experience?: { role: string; company: string; duration: string }[]
  education?: { degree: string; institution: string }[]
  projects?: { name: string; description: string }[]
}

export function ParsedResumeView({ data }: { data: ParsedResumeData }) {
  const hasContent = data.summary || data.skills?.length || data.experience?.length || 
                     data.education?.length || data.projects?.length

  if (!hasContent) {
    return (
      <div className="bg-[#0d111c]/80 border border-gray-800/70 rounded-2xl p-8 text-center">
        <p className="text-gray-400">No structured data available from your resume yet.</p>
        <p className="text-gray-500 text-sm mt-2">Parsed information will appear here once processing is complete.</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {data.summary && (
        <section className="bg-[#0d111c]/80 p-5 rounded-xl border border-gray-800/70">
          <h3 className="text-lg font-semibold text-white mb-2">Professional Summary</h3>
          <p className="text-gray-300 text-sm leading-relaxed">{data.summary}</p>
        </section>
      )}

      {data.skills && data.skills.length > 0 && (
        <section className="bg-[#0d111c]/80 p-5 rounded-xl border border-gray-800/70">
          <h3 className="text-lg font-semibold text-white mb-2">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {data.skills.map((skill, i) => (
              <span key={i} className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-full">
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {data.experience && data.experience.length > 0 && (
        <section className="bg-[#0d111c]/80 p-5 rounded-xl border border-gray-800/70">
          <h3 className="text-lg font-semibold text-white mb-2">Experience</h3>
          <div className="space-y-4">
            {data.experience.map((exp, i) => (
              <div key={i} className="border-l-2 border-indigo-500/30 pl-4">
                <p className="text-white text-sm font-medium">{exp.role}</p>
                <p className="text-gray-400 text-xs mt-1">
                  {exp.company}
                  {exp.duration && ` • ${exp.duration}`}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.education && data.education.length > 0 && (
        <section className="bg-[#0d111c]/80 p-5 rounded-xl border border-gray-800/70">
          <h3 className="text-lg font-semibold text-white mb-2">Education</h3>
          <div className="space-y-3">
            {data.education.map((edu, i) => (
              <div key={i}>
                <p className="text-white text-sm font-medium">{edu.degree}</p>
                <p className="text-gray-400 text-xs">{edu.institution}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.projects && data.projects.length > 0 && (
        <section className="bg-[#0d111c]/80 p-5 rounded-xl border border-gray-800/70">
          <h3 className="text-lg font-semibold text-white mb-2">Projects</h3>
          <div className="space-y-3">
            {data.projects.map((proj, i) => (
              <div key={i}>
                <p className="text-white text-sm font-medium">{proj.name}</p>
                {proj.description && (
                  <p className="text-gray-400 text-xs mt-1">{proj.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}