export function ResumeUpdateSection({ currentFileUrl }: { currentFileUrl?: string }) {
  return (
    <section className="p-4 border rounded-2xl shadow-sm space-y-3">
      <h2 className="text-lg font-semibold">Resume</h2>

      {currentFileUrl && (
        <p className="text-sm text-gray-600">Current resume: {currentFileUrl}</p>
      )}

      <input
        type="file"
        accept=".pdf,.docx"
        className="block w-full text-sm"
      />

      <button
        type="button"
        className="px-4 py-2 rounded-xl bg-black text-white"
      >
        Replace Resume
      </button>
    </section>
  );
}
