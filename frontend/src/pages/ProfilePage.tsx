import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { ResumeUpdateSection } from "../components/Profile/ResumeUpdateSection";
import { PreferencesForm } from "../components/Profile/PreferencesForm";
import { PreferencesSummary } from "../components/Profile/PreferencesSummary";
import type { Seniority, LocationType } from "../components/Profile/PreferencesForm";
import {
  fetchPreferences,
  savePreferences,
  fetchResume,
  uploadResume,
} from "../lib/api";
 
export default function ProfilePage() {
  const { getToken } = useAuth();
  const [savedSeniority, setSavedSeniority] = useState<Seniority>("INTERN");
  const [savedLocations, setSavedLocations] = useState<LocationType[]>(["REMOTE"]);
  const [resumeFileName, setResumeFileName] = useState<string | undefined>(undefined);
  const [resumeFileUrl, setResumeFileUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveError, setSaveError] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");

  // Load existing preferences and resume on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        if (!token || cancelled) return;

        const [prefs, resume] = await Promise.all([
          fetchPreferences(token),
          fetchResume(token),
        ]);

        if (!cancelled) {
          if (prefs) {
            setSavedSeniority(prefs.seniority);
            setSavedLocations(prefs.locationPreferences);
          }
          if (resume) {
            const parsedUrl = new URL(resume.fileUrl);
            const filename = parsedUrl.pathname.split("/").pop();
            setResumeFileName(filename ?? resume.fileUrl);
            setResumeFileUrl(resume.fileUrl);
          }
        }
      } catch (err) {
        console.error("[ProfilePage] failed to load data:", err);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [getToken]);
 
  const handlePreferencesSubmit = async (seniority: Seniority, locations: LocationType[]) => {
    setIsSaving(true);
    setSaveError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const saved = await savePreferences(token, {
        seniority,
        locationPreferences: locations,
      });
      setSavedSeniority(saved.seniority);
      setSavedLocations(saved.locationPreferences);
    } catch (err) {
      console.error("[ProfilePage] failed to save preferences:", err);
      setSaveError(
        err instanceof Error ? err.message : "Failed to save preferences."
      );
    } finally {
      setIsSaving(false);
    }
  };
 
  const handleResumeReplace = async (file: File) => {
    setIsUploading(true);
    setUploadError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const result = await uploadResume(token, file);
      setResumeFileName(file.name);
      if (result.fileUrl) setResumeFileUrl(result.fileUrl);
    } catch (err) {
      console.error("[ProfilePage] failed to upload resume:", err);
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload resume."
      );
    } finally {
      setIsUploading(false);
    }
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
            currentFileUrl={resumeFileUrl}
            onReplace={handleResumeReplace}
            isUploading={isUploading}
          />

          {uploadError && (
            <p className="text-red-400 text-xs px-1">{uploadError}</p>
          )}

          <PreferencesForm
            initialSeniority={savedSeniority}
            initialLocations={savedLocations}
            onSubmit={handlePreferencesSubmit}
            isSaving={isSaving}
          />

          {saveError && (
            <p className="text-red-400 text-xs px-1">{saveError}</p>
          )}

          <PreferencesSummary
            seniority={savedSeniority}
            locations={savedLocations}
          />
        </div>
      </div>
    </div>
  );
}
 