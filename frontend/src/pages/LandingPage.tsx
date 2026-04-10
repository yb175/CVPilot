import { Hero } from "../components/Landing/Hero";
import { useUser } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate("/resume");
    }
  }, [isSignedIn, isLoaded, navigate]);

  return (
    <div
      className="min-h-screen text-white flex flex-col items-center px-4"
      style={{
        background: "radial-gradient(ellipse 80% 50% at 50% -10%, #1e1b4b22, transparent), #07090f",
      }}
    >
      <Hero />
    </div>
  );
}