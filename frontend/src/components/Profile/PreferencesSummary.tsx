interface PreferencesSummaryProps {
  seniority: 'INTERN' | 'FULLTIME';
  locations: ('ONSITE' | 'HYBRID' | 'REMOTE')[];
}

export function PreferencesSummary({ seniority, locations }: PreferencesSummaryProps) {
  return (
    <section className="p-4 border rounded-2xl shadow-sm space-y-2">
      <h2 className="text-lg font-semibold">Current Preferences</h2>

      <p>
        <span className="font-medium">Seniority:</span> {seniority}
      </p>

      <p>
        <span className="font-medium">Locations:</span> {locations.join(', ')}
      </p>
    </section>
  );
}