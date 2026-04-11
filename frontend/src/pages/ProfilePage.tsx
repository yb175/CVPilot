import { useCallback, useEffect, useRef, useState } from "react";
import { ResumeUpdateSection } from "../components/Profile/ResumeUpdateSection";
import { PreferencesForm } from "../components/Profile/PreferencesForm";
import { PreferencesSummary } from "../components/Profile/PreferencesSummary";
import type { Seniority, LocationType } from "../components/Profile/PreferencesForm";
import { useApi } from "../lib/fetcher";
import { uploadResume, getResume } from "../services/resume";
import { createPreferences, getPreferences, updatePreferences } from "../services/preferences";
import { useNavigate } from "react-router-dom";
import { PageContainer, GridBackground, Container, Card, Button, PageHeader, useToast, PageTransition } from "../components/ui";
 
export default function ProfilePage() {
  const navigate = useNavigate();
  const { fetchWithAuth } = useApi();
  const { addToast } = useToast();
  // Keep a stable ref so the useEffect doesn't re-run on every render
  const fetchRef = useRef(fetchWithAuth);
  useEffect(() => { fetchRef.current = fetchWithAuth; }, [fetchWithAuth]);
 
  const [savedSeniority, setSavedSeniority] = useState<Seniority>("INTERN");
  const [savedLocations, setSavedLocations] = useState<LocationType[]>(["REMOTE"]);
 
  // null = no file on server yet, string = filename known
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [hasExistingResume, setHasExistingResume] = useState(false);
 
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
 
  // Track whether the user already has saved prefs so we know PATCH vs POST
  const [hasPreferences, setHasPreferences] = useState(false);
  const [showEditPrefs, setShowEditPrefs] = useState(false);
 
  // Separate feedback per section
  // Note: We now use toasts instead of alerts, no need to track individual state

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

  // 📄 Load existing resume on mount
  useEffect(() => {
    const fetchResume = async () => {
      try {
        const data = await getResume(fetchRef.current);
        if (data && data.fileUrl) {
          // Use the original filename if available, otherwise use a friendly formatted name
          const fileName = data.originalFileName || `Resume_${new Date(data.uploadedAt).toLocaleDateString().replace(/\//g, '-')}.pdf`;
          setResumeFileName(fileName);
          setHasExistingResume(true);
        } else {
          setResumeFileName(null);
          setHasExistingResume(false);
        }
      } catch (err) {
        console.error("Failed to load resume:", err);
        setResumeFileName(null);
        setHasExistingResume(false);
      }
    };
    fetchResume();
  }, []);

  // 📄 Resume Upload
  const handleResumeReplace = useCallback(async (file: File) => {
    setIsUploading(true);

    try {
      const data = await uploadResume(file, fetchRef.current);
      if (data.changed) {
        setResumeFileName(file.name);
        setHasExistingResume(true);
        addToast({
          message: 'Resume uploaded successfully! Ready to find jobs.',
          variant: 'success',
        });
      } else {
        // Duplicate file: Show as warning
        addToast({
          message: 'This resume was already uploaded.',
          variant: 'warning',
        });
      }
    } catch (err: any) {
      const errorMsg = err.message || "Upload failed. Please try again.";
      addToast({
        message: errorMsg,
        variant: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  }, [addToast]);

  // Auto-dismiss handled by toasts now, no need for extra effects
  // Keeping these state vars minimal for potential future use

  // ⚙️ Preferences Save — PATCH if exists, POST if new
  const handlePreferencesSubmit = useCallback(async (
    seniority: Seniority,
    locations: LocationType[]
  ) => {
    setIsSaving(true);

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
      const successMsg = hasPreferences ? "Preferences updated ✅" : "Preferences saved ✅";
      addToast({
        message: successMsg,
        variant: 'success',
      });
    } catch (err: any) {
      const errorMsg = err.message || "Failed to save preferences. Please try again.";
      addToast({
        message: errorMsg,
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }, [hasPreferences, addToast]);
 
  return (
    <PageTransition>
      <PageContainer background="secondary">
        <GridBackground />

        <Container size="lg" className="py-10 sm:py-16">
        {/* Page Header */}
        <PageHeader
          tagline="Profile Setup"
          title={<>Your <em style={{background: "linear-gradient(135deg, #a5b4fc 0%, #818cf8 60%, #6366f1 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontStyle: "italic", fontWeight: "inherit"}}>profile.</em></>}
          description="Manage your resume and job preferences to get matched with the right opportunities."
          className="mb-10"
        />

        <div className="space-y-6">
          {/* Resume Section */}
          <Card variant="elevated">
            <Card.Header>
              <h2 className="text-xl font-bold text-text-primary">Upload Your Resume</h2>
              <p className="text-sm text-text-secondary mt-1">Required to get job matches</p>
            </Card.Header>
            <Card.Body>
              <ResumeUpdateSection
                currentFileName={resumeFileName ?? undefined}
                hasExistingResume={hasExistingResume}
                onReplace={handleResumeReplace}
                isUploading={isUploading}
              />
            </Card.Body>
          </Card>

          {/* Preferences Section */}
          <Card variant="elevated">
            <Card.Header className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-text-primary">Job Preferences</h2>
                <p className="text-sm text-text-secondary mt-1">Tell us what you're looking for</p>
              </div>
              {hasPreferences && (
                <Button
                  onClick={() => setShowEditPrefs(!showEditPrefs)}
                  variant="secondary"
                  size="md"
                >
                  {showEditPrefs ? "Hide" : "Edit"} Preferences
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {isLoadingPrefs ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-10 bg-bg-surface rounded-lg" />
                  <div className="space-y-2">
                    <div className="h-8 bg-bg-surface rounded-lg w-3/4" />
                    <div className="h-20 bg-bg-surface rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-8 bg-bg-surface rounded-lg w-3/4" />
                    <div className="h-20 bg-bg-surface rounded-lg" />
                  </div>
                  <div className="h-10 bg-bg-surface rounded-lg w-1/3 mt-6" />
                </div>
              ) : (
                <>
                  {/* Show form only if no prefs saved OR edit mode is open */}
                  {(!hasPreferences || showEditPrefs) && (
                    <div className="mb-6">
                      <PreferencesForm
                        initialSeniority={savedSeniority}
                        initialLocations={savedLocations}
                        onSubmit={handlePreferencesSubmit}
                        isSaving={isSaving}
                      />
                    </div>
                  )}

                  {/* Show summary if prefs exist */}
                  {hasPreferences && (
                    <PreferencesSummary
                      seniority={savedSeniority}
                      locations={savedLocations}
                    />
                  )}
                </>
              )}
            </Card.Body>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => navigate("/jobs")}
              variant="primary"
              size="lg"
              className="flex-1"
            >
              Find Jobs →
            </Button>
          </div>
        </div>
      </Container>
      </PageContainer>
    </PageTransition>
  );

}