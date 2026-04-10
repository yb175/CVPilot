interface ParsedResume {
  summary?: string
  skills?: string[]
  experience?: { role: string; company: string; duration: string }[]
  education?: { degree: string; institution: string }[]
  projects?: { name: string; description: string }[]
}

export function ParsedResumeView({ data }: { data: ParsedResume }) {
  console.log("Parsed Resume Data:", data) // Debug log to check the data structure
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
{/* 
      {data.summary && (
        <section className="bg-[#0b0e18] p-5 rounded-xl border border-gray-700/60">
          <h3 className="text-lg font-semibold text-white mb-2">Summary</h3>
          <p className="text-gray-300 text-sm">{data.summary}</p>
        </section>
      )}

      {/* Skills */}
      {/* {data.skills && (
        <section className="bg-[#0b0e18] p-5 rounded-xl border border-gray-700/60">
          <h3 className="text-lg font-semibold text-white mb-2">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {data.skills.map((skill, i) => (
              <span key={i} className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-full">
                {skill}
              </span>
            ))}
          </div>
        </section>
      )} */}

      {/* Experience */}
      {/* {data.experience && (
        <section className="bg-[#0b0e18] p-5 rounded-xl border border-gray-700/60">
          <h3 className="text-lg font-semibold text-white mb-2">Experience</h3>
          <div className="space-y-3">
            {data.experience.map((exp, i) => (
              <div key={i}>
                <p className="text-white text-sm font-medium">{exp.role}</p>
                <p className="text-gray-400 text-xs">{exp.company} • {exp.duration}</p>
              </div>
            ))}
          </div>
        </section>
      )} */}

      {/* Education */}
      {/* {data.education && (
        <section className="bg-[#0b0e18] p-5 rounded-xl border border-gray-700/60">
          <h3 className="text-lg font-semibold text-white mb-2">Education</h3>
          <div className="space-y-3">
            {data.education.map((edu, i) => (
              <div key={i}>
                <p className="text-white text-sm">{edu.degree}</p>
                <p className="text-gray-400 text-xs">{edu.institution}</p>
              </div>
            ))}
          </div>
        </section>
      )} */}

      {/* Projects */}
      {/* {data.projects && (
        <section className="bg-[#0b0e18] p-5 rounded-xl border border-gray-700/60">
          <h3 className="text-lg font-semibold text-white mb-2">Projects</h3>
          <div className="space-y-3">
            {data.projects.map((proj, i) => (
              <div key={i}>
                <p className="text-white text-sm font-medium">{proj.name}</p>
                <p className="text-gray-400 text-xs">{proj.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}  */} 
    </div>
  )
}