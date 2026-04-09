import { SignUp } from '@clerk/react';

export function SignUpPage() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-[#0b0f1a] px-4">
      <div className="w-full max-w-5xl mx-auto text-center">

        {/* Tagline */}
        <p className="text-[10px] sm:text-xs tracking-[0.35em] text-gray-500 mb-6 font-medium">
          CVPILOT — GET STARTED
        </p>

        {/* Heading */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-[#e8e8e8]"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          Create your{" "}
          <em
            className="not-italic"
            style={{
              background:
                "linear-gradient(135deg, #a5b4fc 0%, #818cf8 60%, #6366f1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontStyle: "italic",
            }}
          >
            future
          </em>
        </h1>

        {/* Subtext */}
        <p className="mt-4 text-gray-400 max-w-md mx-auto text-sm sm:text-base">
          Join CVPilot and unlock AI-powered job intelligence in seconds.
        </p>

        {/* Clerk Component */}
        <div className="mt-10 flex justify-center">
          <div className="bg-[#0d111c]/80 border border-gray-800/70 rounded-2xl p-6 shadow-xl">
            <SignUp />
          </div>
        </div>

      </div>
    </section>
  );
}