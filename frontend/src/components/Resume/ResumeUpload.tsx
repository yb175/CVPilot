import { useState } from "react";
import { StatusBadge } from "./ParsingStatusBadge";
type ParsingStatus = "IDLE" | "PROCESSING" | "DONE" | "FAILED";

export function ResumeUpload({
  onExtract,
}: {
  onExtract: (file: File, text: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<ParsingStatus>("IDLE");
 
  const VALID_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];
  const VALID_EXT = [".pdf", ".docx", ".doc"];
 
  const validate = (f: File) => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!VALID_TYPES.includes(f.type) && !VALID_EXT.includes(ext)) {
      setError("Only PDF, DOCX, or DOC files are allowed.");
      return false;
    }
    setError("");
    return true;
  };
 
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (validate(f)) setFile(f);
  };
 
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (validate(f)) setFile(f);
  };
 
  const extractText = async (f: File): Promise<string> => {
    // For PDFs and DOCX we read as text (caller can swap in a real parser)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsText(f);
    });
  };
 
  const handleUpload = async () => {
    if (!file) return;
    setStatus("PROCESSING");
    try {
      const text = await extractText(file);
      setStatus("DONE");
      onExtract(file, text);
    } catch {
      setStatus("FAILED");
    }
  };
 
  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-5">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center gap-4
          border-2 border-dashed rounded-2xl
          px-6 py-14 cursor-pointer
          transition-all duration-300
          ${dragging
            ? "border-indigo-500 bg-indigo-500/5 shadow-[0_0_32px_rgba(99,102,241,0.15)]"
            : file
            ? "border-indigo-600/50 bg-indigo-900/10"
            : "border-gray-700/60 bg-[#0b0e18] hover:border-gray-600"
          }
        `}
        onClick={() => document.getElementById("resume-input")?.click()}
      >
        {/* Hidden input */}
        <input
          id="resume-input"
          type="file"
          accept=".pdf,.docx,.doc"
          onChange={handleChange}
          className="hidden"
        />
 
        {/* Icon */}
        <div
          className={`
            w-14 h-14 rounded-xl flex items-center justify-center
            transition-all duration-300
            ${file ? "bg-indigo-600/20 border border-indigo-500/30" : "bg-gray-800/60 border border-gray-700/40"}
          `}
        >
          {file ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2v6h6" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="17 8 12 3 7 8" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="3" x2="12" y2="15" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
 
        {/* Text */}
        {file ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-indigo-300">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {(file.size / 1024).toFixed(1)} KB · Click to change
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium text-gray-300">
              Drop your resume here
            </p>
            <p className="text-xs text-gray-600 mt-1">
              or click to browse — PDF, DOCX, DOC
            </p>
          </div>
        )}
 
        {/* Format pills */}
        {!file && (
          <div className="flex gap-2 mt-1">
            {["PDF", "DOCX", "DOC"].map((fmt) => (
              <span
                key={fmt}
                className="px-2.5 py-0.5 rounded-full bg-gray-800 border border-gray-700/60 text-[10px] text-gray-400 tracking-widest"
              >
                {fmt}
              </span>
            ))}
          </div>
        )}
      </div>
 
      {/* Error */}
      {error && (
        <p className="text-red-400 text-xs text-center -mt-2">{error}</p>
      )}
 
      {/* Upload button */}
      <button
        disabled={!file || status === "PROCESSING"}
        onClick={handleUpload}
        className="
          w-full py-3.5
          bg-indigo-600 hover:bg-indigo-500
          disabled:opacity-40 disabled:cursor-not-allowed
          text-white text-xs font-bold tracking-[0.2em]
          border border-indigo-500/60 hover:border-indigo-400
          rounded-xl
          shadow-[0_0_24px_rgba(99,102,241,0.3)] hover:shadow-[0_0_36px_rgba(99,102,241,0.5)]
          flex items-center justify-center gap-2
          transition-all duration-300 active:scale-[0.98]
        "
      >
        {status === "PROCESSING" ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
              <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            EXTRACTING TEXT...
          </>
        ) : (
          <>
            EXTRACT RESUME
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </>
        )}
      </button>
 
      {/* Status badge */}
      {status !== "IDLE" && (
        <div className="flex justify-center">
          <StatusBadge status={status} />
        </div>
      )}
    </div>
  );
}