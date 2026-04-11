import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/react";
import { useEffect, useState } from "react";
import { checkResumeExists } from "../../services/resume";
import { useApi } from "../../lib/fetcher";
import { Button } from "../ui/Button";

export function CTAButton() {
  const { isSignedIn } = useAuth();
  const { isLoaded } = useUser();
  const navigate = useNavigate();
  const { fetchWithAuth } = useApi();

  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check resume status only for signed-in users
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setIsLoading(false);
      return;
    }

    const checkResume = async () => {
      try {
        const exists = await checkResumeExists(fetchWithAuth);
        setHasResume(exists);
      } catch (err) {
        console.error("Failed to check resume:", err);
        setHasResume(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkResume();
  }, [isSignedIn, isLoaded, fetchWithAuth]);

  const handleClick = () => {
    if (!isSignedIn) {
      navigate("/sign-up");
      return;
    }

    // Signed in: route based on resume status
    if (hasResume) {
      navigate("/jobs");
    } else {
      navigate("/profile");
    }
  };

  const ArrowIcon = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="transition-transform duration-300 group-hover:translate-x-1"
    >
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <Button
      onClick={handleClick}
      isLoading={isLoading}
      size="lg"
      variant="primary"
      icon={<ArrowIcon />}
      iconPosition="right"
      className="mt-8"
    >
      {isLoading ? "LOADING" : "GET STARTED"}
    </Button>
  );
}