const SENIORITY_OPTIONS = ['INTERN', 'FULLTIME'] as const;
const LOCATION_OPTIONS = ['ONSITE', 'HYBRID', 'REMOTE'] as const;

type Seniority = typeof SENIORITY_OPTIONS[number];
type LocationType = typeof LOCATION_OPTIONS[number];

interface PreferencesFormProps {
  initialSeniority?: Seniority;
  initialLocations?: LocationType[];
  onSubmit?: (seniority: Seniority, locations: LocationType[]) => void;
}

export function PreferencesForm({ initialSeniority, initialLocations, onSubmit }: PreferencesFormProps) {
  return (
    <form
      className="p-4 border rounded-2xl shadow-sm space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!onSubmit) return;

        const form = new FormData(e.currentTarget);
        const seniority = form.get('seniority') as Seniority;
        const locations = form.getAll('locationPreferences') as LocationType[];

        onSubmit(seniority, locations);
      }}
    >

<h2 className="text-lg font-semibold">Job Preferences</h2>

      <fieldset>
        <legend className="font-medium">Seniority</legend>
        <div className="flex gap-4 mt-2">
          {SENIORITY_OPTIONS.map(opt => (
            <label key={opt} className="flex items-center gap-2">
              <input
                type="radio"
                name="seniority"
                value={opt}
                defaultChecked={opt === initialSeniority}
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-medium">Location Preferences</legend>
        <div className="flex gap-4 mt-2">
          {LOCATION_OPTIONS.map(opt => (
            <label key={opt} className="flex items-center gap-2"> 
              
              
              <input
                type="checkbox"
                name="locationPreferences"
                value={opt}
                defaultChecked={initialLocations?.includes(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        className="px-4 py-2 rounded-xl bg-black text-white"
      >
        Save Preferences
      </button>
    </form>
  );
}