import type { Seniority, LocationType } from "./PreferencesForm";

interface PreferencesSummaryProps {
  seniority: Seniority;
  locations: LocationType[];
}

const LOCATION_COLORS: Record<LocationType, string> = {
  ONSITE: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  HYBRID: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  REMOTE: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
};

const SENIORITY_LABEL: Record<Seniority, string> = {
  INTERN: "Intern",
  FULLTIME: "Full-time",
};

export function PreferencesSummary({ seniority, locations }: PreferencesSummaryProps) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="#34d399" strokeWidth="1.1"/>
            <path d="M3.5 4.5h7M3.5 7h5M3.5 9.5h3" stroke="#34d399" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#e8e8e8]">Saved preferences</p>
          <p className="text-xs text-gray-500">Read-only — reflects last saved state</p>
        </div>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Seniority */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
          <p className="text-[10px] tracking-[0.18em] text-gray-600 uppercase font-medium mb-2">
            Seniority
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold px-3 py-1">
              {SENIORITY_LABEL[seniority]}
            </span>
            <span className="text-xs text-gray-600">{seniority}</span>
          </div>
        </div>

        {/* Locations */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
          <p className="text-[10px] tracking-[0.18em] text-gray-600 uppercase font-medium mb-2">
            Locations
          </p>
          {locations.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {locations.map((loc) => (
                <span
                  key={loc}
                  className={`inline-flex items-center rounded-lg border text-xs font-semibold px-3 py-1 ${LOCATION_COLORS[loc]}`}
                >
                  {loc}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-600 italic">None selected</p>
          )}
        </div>
      </div>
    </section>
  );
}