import { useCallback, useEffect, useRef, useState } from "react";
import { ResumeUpdateSection } from "../components/Profile/ResumeUpdateSection";
import { PreferencesForm } from "../components/Profile/PreferencesForm";
import { PreferencesSummary } from "../components/Profile/PreferencesSummary";
import type { Seniority, LocationType } from "../components/Profile/PreferencesForm";
import { useApi } from "../lib/fetcher";
import { uploadResume } from "../services/resume";
import { createPreferences, getPreferences, updatePreferences } from "../services/preferences";
import { useNavigate } from "react-router-dom";
 
export default function ProfilePage() {
  const navigate = useNavigate();
  const { fetchWithAuth } = useApi();
  // Keep a stable ref so the useEffect doesn't re-run on every render
  const fetchRef = useRef(fetchWithAuth);
  useEffect(() => { fetchRef.current = fetchWithAuth; }, [fetchWithAuth]);
 
  const [savedSeniority, setSavedSeniority] = useState<Seniority>("INTERN");
  const [savedLocations, setSavedLocations] = useState<LocationType[]>(["REMOTE"]);
 
  // null = no file on server yet, string = filename known
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
 
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
 
  // Track whether the user already has saved prefs so we know PATCH vs POST
  const [hasPreferences, setHasPreferences] = useState(false);
 
  // Separate feedback per section so they don't clobber each other
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeSuccess, setResumeSuccess] = useState<string | null>(null);
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [prefsSuccess, setPrefsSuccess] = useState<string | null>(null);
 
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const data = await getPreferences(fetchRef.current);
        if (!data) {
          // First-time user — keep defaults, hasPreferences stays false
          return;
        }
        setSavedSeniority(data.seniority);
        setSavedLocations(data.locationPreferences);
        setHasPreferences(true);
      } catch (err) {
        console.error("Failed to load preferences:", err);
      } finally {
        setIsLoadingPrefs(false);
      }
    };
    fetchPrefs();
  }, []); // stable fetchRef means no dep needed
 
  // 📄 Resume Upload
  const handleResumeReplace = useCallback(async (file: File) => {
    setIsUploading(true);
    setResumeError(null);
    setResumeSuccess(null);
 
    try {
      const data = await uploadResume(file, fetchRef.current);
      if (data.changed) {
        setResumeFileName(file.name);
        setResumeSuccess("Resume uploaded successfully ✅");
      } else {
        setResumeSuccess("Same resume already on file ⚠️");
      }
    } catch (err: any) {
      setResumeError(err.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, []);
 
  // ⚙️ Preferences Save — PATCH if exists, POST if new
  const handlePreferencesSubmit = useCallback(async (
    seniority: Seniority,
    locations: LocationType[]
  ) => {
    setIsSaving(true);
    setPrefsError(null);
    setPrefsSuccess(null);
 
    const payload = { seniority, locationPreferences: locations };
 
    try {
      let data;
      if (hasPreferences) {
        data = await updatePreferences(payload, fetchRef.current);
      } else {
        data = await createPreferences(payload, fetchRef.current);
        setHasPreferences(true);
      }
      setSavedSeniority(data.seniority);
      setSavedLocations(data.locationPreferences);
      setPrefsSuccess(hasPreferences ? "Preferences updated ✅" : "Preferences saved ✅");
    } catch (err: any) {
      setPrefsError(err.message || "Failed to save preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [hasPreferences]);
 
  return (
    <div className="min-h-screen bg-[#080b14] text-white">
      {/* Background grid */}
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
          <h1
            className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-[#e8e8e8]"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            Your{" "}
            <em
              className="not-italic"
              style={{
                background: "linear-gradient(135deg, #a5b4fc 0%, #818cf8 60%, #6366f1 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              profile.
            </em>
          </h1>
          <p className="mt-3 text-gray-400 text-sm sm:text-base leading-relaxed max-w-md">
            Manage your resume and job preferences to get matched with the right opportunities.
          </p>
        </div>
 
        <div className="space-y-4">
          {/* Resume section with its own feedback */}
          <div className="space-y-2">
            {resumeError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {resumeError}
              </div>
            )}
            {resumeSuccess && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                {resumeSuccess}
              </div>
            )}
            <ResumeUpdateSection
              currentFileName={resumeFileName ?? undefined}
              onReplace={handleResumeReplace}
              isUploading={isUploading}
            />
          </div>
 
          {/* Preferences section with its own feedback */}
          <div className="space-y-2">
            {prefsError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {prefsError}
              </div>
            )}
            {prefsSuccess && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                {prefsSuccess}
              </div>
            )}
            {isLoadingPrefs ? (
              <div className="p-6 rounded-2xl border border-white/[0.07] bg-white/[0.03] text-gray-500 text-sm flex items-center gap-2">
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 8" strokeLinecap="round"/>
                </svg>
                Loading preferences…
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
               <button
    onClick={() => navigate("/jobs")}
    className="h-fit inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 transition-colors duration-150 shadow-lg shadow-indigo-500/10"
  >
    Find Jobs →
  </button>
        </div>
      </div>
    </div>
  );
}