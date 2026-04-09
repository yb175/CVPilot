import { ResumeUpdateSection } from "../components/Profile/ResumeUpdateSection";
import { PreferencesForm } from "../components/Profile/PreferencesForm";
import { PreferencesSummary } from "../components/Profile/PreferencesSummary";

export default function ProfilePage() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Profile Settings</h1>

      <ResumeUpdateSection currentFileUrl="resume_v1.pdf" />

      <PreferencesForm
        initialSeniority="INTERN"
        initialLocations={["REMOTE"]}
      />

      <PreferencesSummary
        seniority="INTERN"
        locations={["REMOTE"]}
      />
    </div>
  );
}