import { useEffect, useState, type FormEvent } from "react";

const SENIORITY_OPTIONS = ["INTERN", "FULLTIME"] as const;
const LOCATION_OPTIONS = ["ONSITE", "HYBRID", "REMOTE"] as const;

export type Seniority = (typeof SENIORITY_OPTIONS)[number];
export type LocationType = (typeof LOCATION_OPTIONS)[number];

const SENIORITY_META: Record<Seniority, { label: string; desc: string }> = {
  INTERN: { label: "Intern", desc: "Entry-level & internship roles" },
  FULLTIME: { label: "Full-time", desc: "Permanent positions" },
};

const LOCATION_META: Record<LocationType, { label: string; icon: string }> = {
  ONSITE: { label: "On-site", icon: "🏢" },
  HYBRID: { label: "Hybrid", icon: "⚡" },
  REMOTE: { label: "Remote", icon: "🌐" },
};

interface PreferencesFormProps {
  initialSeniority?: Seniority;
  initialLocations?: LocationType[];
  onSubmit?: (seniority: Seniority, locations: LocationType[]) => void;
  isSaving?: boolean;
}

export function PreferencesForm({
  initialSeniority = "INTERN",
  initialLocations = ["REMOTE"],
  onSubmit,
  isSaving = false,
}: PreferencesFormProps) {
  const [seniority, setSeniority] = useState<Seniority>(initialSeniority);
  const [locations, setLocations] = useState<LocationType[]>(initialLocations);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setSeniority(initialSeniority); }, [initialSeniority]);
  useEffect(() => { setLocations(initialLocations); }, [initialLocations]);

  const toggleLocation = (loc: LocationType) => {
    setLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.(seniority, locations);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-5 sm:p-6">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2.5" stroke="#a78bfa" strokeWidth="1.1"/>
            <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.7 2.7l1.1 1.1M10.2 10.2l1.1 1.1M2.7 11.3l1.1-1.1M10.2 3.8l1.1-1.1" stroke="#a78bfa" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#e8e8e8]">Job preferences</p>
          <p className="text-xs text-gray-500">Select seniority and preferred work mode</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seniority */}
        <div>
          <p className="text-[10px] tracking-[0.2em] text-gray-500 font-medium uppercase mb-3">
            Seniority
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SENIORITY_OPTIONS.map((opt) => {
              const meta = SENIORITY_META[opt];
              const isSelected = seniority === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSeniority(opt)}
                  className={`flex flex-col items-start text-left rounded-xl px-4 py-3 border transition-all duration-150 ${
                    isSelected
                      ? "border-violet-500/50 bg-violet-500/10"
                      : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]"
                  }`}
                >
                  <span
                    className={`text-sm font-semibold ${
                      isSelected ? "text-violet-300" : "text-gray-300"
                    }`}
                  >
                    {meta.label}
                  </span>
                  <span className="text-xs text-gray-500 mt-0.5">{meta.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Location */}
        <div>
          <p className="text-[10px] tracking-[0.2em] text-gray-500 font-medium uppercase mb-3">
            Location Preferences
            <span className="text-gray-600 ml-2 normal-case tracking-normal">(multi-select)</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {LOCATION_OPTIONS.map((opt) => {
              const meta = LOCATION_META[opt];
              const isChecked = locations.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleLocation(opt)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all duration-150 ${
                    isChecked
                      ? "border-indigo-500/50 bg-indigo-500/10"
                      : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-all ${
                      isChecked
                        ? "bg-indigo-500 border-indigo-500"
                        : "border-white/20"
                    }`}
                  >
                    {isChecked && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5l2.5 2.5L8 1" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isChecked ? "text-indigo-300" : "text-gray-400"
                    }`}
                  >
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isSaving || locations.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/[0.06] disabled:text-gray-600 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 transition-colors duration-150"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 8" strokeLinecap="round"/>
                </svg>
                Saving…
              </>
            ) : (
              "Save preferences"
            )}
          </button>

          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 animate-fade-in">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="#34d399" strokeWidth="1.2"/>
                <path d="M3.5 6l2 2 3-3" stroke="#34d399" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Saved
            </span>
          )}

          {locations.length === 0 && (
            <span className="text-xs text-amber-500">Select at least one location</span>
          )}
        </div>
      </form>
    </section>
  );
}