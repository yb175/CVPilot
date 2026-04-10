// frontend/src/pages/ResumePage.tsx
import { useState } from 'react'
import { ResumeUpload } from '../components/Resume/ResumeUpload'
import { StatusBadge } from '../components/Resume/ParsingStatusBadge'
import { useNavigate } from 'react-router-dom'
 
// ─── Types ────────────────────────────────────────────────────────────────────
type ParsingStatus = "IDLE" | "PROCESSING" | "DONE" | "FAILED";

export function ResumePage() {
 const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [status, setStatus] = useState<ParsingStatus>("IDLE");
 
  const handleExtract = (f: File, text: string) => {
    setFile(f);
    setExtractedText(text); // ← your extracted resume text lives here
    setStatus("DONE");
    // TODO: pass `text` to your LLM pipeline
    console.log("Extracted text:", text);
  };
 
  const reset = () => {
    setFile(null);
    setExtractedText("");
    setStatus("IDLE");
  };
 
  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-12 text-white"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -10%, #1e1b4b22, transparent), #07090f",
      }}
    >
      <div className="w-full max-w-5xl">
        {/* Header row */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-[10px] tracking-[0.35em] text-gray-500 mb-2 font-medium">
              CVPILOT — AI JOB INTELLIGENCE
            </p>
            <h1
              className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#e8e8e8]"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              Your Resume
            </h1>
          </div>
 
          {file && (
            <button
              onClick={reset}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 tracking-widest transition-colors duration-200"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              UPLOAD NEW
            </button>
          )}
        </div>
 
        {/* Main content */}
        {!file ? (
          // Upload state
          <div className="flex flex-col gap-6">
            <div className="text-center mb-4">
              <p className="text-gray-400 text-sm max-w-md mx-auto">
                Upload your resume and we'll extract the text for AI-powered job matching.
              </p>
            </div>
            <ResumeUpload onExtract={handleExtract} />
          </div>
        ) : (
          // Done state
          <div className="flex flex-col gap-6">
            {/* File info card */}
            <div className="bg-[#0d111c]/80 border border-gray-800/70 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-[0_0_40px_rgba(99,102,241,0.06)]">
              {/* File icon */}
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2v6h6" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="8" y1="13" x2="16" y2="13" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="8" y1="17" x2="13" y2="17" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
 
              {/* File meta */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-200 truncate">{file.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB ·{" "}
                  {file.name.split(".").pop()?.toUpperCase()}
                </p>
              </div>
 
              <StatusBadge status={status} />
            </div>
 
            {/* Extracted text preview */}
            {extractedText && (
              <div className="bg-[#0d111c]/80 border border-gray-800/70 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(99,102,241,0.04)]">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800/60">
                  <p className="text-[10px] tracking-[0.25em] text-gray-400 font-semibold">
                    EXTRACTED TEXT PREVIEW
                  </p>
                  <span className="text-[10px] text-gray-600 font-mono">
                    {extractedText.length.toLocaleString()} chars
                  </span>
                </div>
                <pre className="px-5 py-4 text-xs text-gray-400 font-mono leading-relaxed whitespace-pre-wrap overflow-auto max-h-64 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700">
                  {extractedText.slice(0, 800)}
                  {extractedText.length > 800 && (
                    <span className="text-gray-600">
                      {"\n\n"}...{" "}
                      {(extractedText.length - 800).toLocaleString()} more characters
                    </span>
                  )}
                </pre>
              </div>
            )}
 
            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <p className="text-xs text-gray-600">
                Text extracted and ready for AI matching.
              </p>
              <button
  onClick={() => navigate('/profile')}
  className="
    flex items-center gap-2
    px-6 py-2.5
    bg-indigo-600 hover:bg-indigo-500
    text-white text-xs font-bold tracking-[0.15em]
    border border-indigo-500/60
    rounded-lg
    shadow-[0_0_20px_rgba(99,102,241,0.25)]
    transition-all duration-200
  "
>
  UPDATE PREFERENCES
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}