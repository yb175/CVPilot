import { useState } from "react";
import { ResumeUpdateSection } from "../components/Profile/ResumeUpdateSection";
import { PreferencesForm } from "../components/Profile/PreferencesForm";
import { PreferencesSummary } from "../components/Profile/PreferencesSummary";
import type { Seniority, LocationType } from "../components/Profile/PreferencesForm";
 
export default function ProfilePage() {
  const [savedSeniority, setSavedSeniority] = useState<Seniority>("INTERN");
  const [savedLocations, setSavedLocations] = useState<LocationType[]>(["REMOTE"]);
  const [resumeFileName, setResumeFileName] = useState<string>("resume_v1.pdf");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
 
  const handlePreferencesSubmit = (seniority: Seniority, locations: LocationType[]) => {
    setIsSaving(true);
    setTimeout(() => {
      setSavedSeniority(seniority);
      setSavedLocations(locations);
      setIsSaving(false);
    }, 800);
  };
 
  const handleResumeReplace = (file: File) => {
    setIsUploading(true);
    setTimeout(() => {
      setResumeFileName(file.name);
      setIsUploading(false);
    }, 1000);
  };
 
  return (
    <div className="min-h-screen bg-[#080b14] text-white">
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
 
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[10px] tracking-[0.35em] text-gray-500 font-medium mb-4">
            CVPILOT — PROFILE SETTINGS
          </p>
          <h1
            className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-[#e8e8e8]"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            Your{" "}
            <em
              className="not-italic"
              style={{
                background:
                  "linear-gradient(135deg, #a5b4fc 0%, #818cf8 60%, #6366f1 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              profile.
            </em>
          </h1>
          <p className="mt-3 text-gray-400 text-sm sm:text-base leading-relaxed max-w-md">
            Manage your resume and job preferences to get matched with the right
            opportunities.
          </p>
        </div>
 
        {/* Sections */}
        <div className="space-y-4">
          <ResumeUpdateSection
            currentFileName={resumeFileName}
            onReplace={handleResumeReplace}
            isUploading={isUploading}
          />
 
          <PreferencesForm
            initialSeniority={savedSeniority}
            initialLocations={savedLocations}
            onSubmit={handlePreferencesSubmit}
            isSaving={isSaving}
          />
 
          <PreferencesSummary
            seniority={savedSeniority}
            locations={savedLocations}
          />
        </div>
      </div>
    </div>
  );
}
 