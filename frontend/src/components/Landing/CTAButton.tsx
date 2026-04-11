import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
 
export function CTAButton() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
 
  return (
    <button
      onClick={() => navigate(isSignedIn ? "/profile" : "/sign-up")}
      className="
        mt-8 px-10 py-4
        bg-indigo-600 hover:bg-indigo-500
        text-white text-xs font-bold tracking-[0.2em]
        border border-indigo-500/60 hover:border-indigo-400
        rounded-md
        shadow-[0_0_32px_rgba(99,102,241,0.35)] hover:shadow-[0_0_48px_rgba(99,102,241,0.55)]
        flex items-center gap-3
        transition-all duration-300 ease-out
        active:scale-95
      "
    >
      GET STARTED
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
    </button>
  );
}