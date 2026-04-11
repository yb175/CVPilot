import { useState, useRef, type ChangeEvent, type DragEvent } from "react";

interface ResumeUpdateSectionProps {
  currentFileName?: string;
  currentFileUrl?: string | null;
  onReplace?: (file: File) => void;
  isUploading?: boolean;
}

export function ResumeUpdateSection({
  currentFileName,
  currentFileUrl,
  onReplace,
  isUploading = false,
}: ResumeUpdateSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".pdf") || file.name.endsWith(".docx"))) {
      setSelectedFile(file);
    }
  };

  const handleReplace = () => {
    if (!selectedFile || !onReplace) return;
    onReplace(selectedFile);
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-5 sm:p-6">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2.5" y="0.5" width="9" height="13" rx="1.5" stroke="#818cf8" strokeWidth="1.1"/>
            <path d="M4.5 4.5h5M4.5 6.5h5M4.5 8.5h3" stroke="#818cf8" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#e8e8e8]">Resume</p>
          <p className="text-xs text-gray-500">PDF or DOCX · One file per account</p>
        </div>
      </div>

      {/* Current file */}
      {currentFileName && (
        <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
          <span className="text-sm text-gray-300 font-medium flex-1 truncate">
            {currentFileName}
          </span>
          {currentFileUrl && (
            <a
              href={currentFileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0"
            >
              View ↗
            </a>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`border border-dashed rounded-xl px-4 py-6 text-center cursor-pointer transition-all duration-150 mb-4 ${
          isDragging
            ? "border-indigo-500/60 bg-indigo-500/[0.06]"
            : "border-white/[0.10] hover:border-white/20 hover:bg-white/[0.02]"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <svg className="mx-auto mb-2 opacity-40" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 14V6M10 6l-3 3M10 6l3 3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        {selectedFile ? (
          <p className="text-sm text-indigo-300 font-medium">{selectedFile.name}</p>
        ) : (
          <>
            <p className="text-sm text-gray-400">
              Drop file here or <span className="text-indigo-400">browse</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">.pdf or .docx</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      <button
        type="button"
        disabled={!selectedFile || isUploading}
        onClick={handleReplace}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/[0.06] disabled:text-gray-600 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 transition-colors duration-150"
      >
        {isUploading ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 8" strokeLinecap="round"/>
            </svg>
            Uploading…
          </>
        ) : (
          "Replace resume"
        )}
      </button>
    </section>
  );
}