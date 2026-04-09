import { CTAButton } from "./CTAButton";
import { AnalyticsPreview } from "./AnalyicsPreview";

export function Hero() {
  return (
    <section className="w-full max-w-5xl mx-auto text-center pt-16 pb-10 px-4">
      {/* Top tagline */}
      <p className="text-[10px] sm:text-xs tracking-[0.35em] text-gray-500 mb-8 font-medium">
        CVPILOT — AI JOB INTELLIGENCE
      </p>
 
      {/* Heading */}
      <h1
        className="
          text-5xl sm:text-6xl md:text-7xl lg:text-8xl
          font-extrabold leading-[1.08] tracking-tight
          text-[#e8e8e8]
        "
        style={{ fontFamily: "'Georgia', serif" }}
      >
        Match your resume
        <br />
        to the{" "}
        <em
          className="not-italic"
          style={{
            background: "linear-gradient(135deg, #a5b4fc 0%, #818cf8 60%, #6366f1 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontStyle: "italic",
          }}
        >
          right
        </em>{" "}
        jobs.
      </h1>
 
      {/* Subtext */}
      <p className="mt-6 text-gray-400 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
        A precision tool for ambitious people. Use neural-matching to bypass
        the noise and land high-stakes opportunities.
      </p>
 
      {/* CTA */}
      <div className="flex justify-center">
        <CTAButton />
      </div>
 
      {/* Stats */}
      <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-[#0d111c]/80 border border-gray-800/70 rounded-xl py-4 px-3">
          <p className="text-base sm:text-xl font-bold text-white tracking-tight">
            2,400+
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1 tracking-widest">
            JOBS INDEXED
          </p>
        </div>
 
        <div className="bg-[#0d111c]/80 border border-gray-800/70 rounded-xl py-4 px-3">
          <p className="text-base sm:text-xl font-bold text-orange-400 tracking-wide">
            OPTIMIZED
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1 tracking-widest">
            ATS PROMPTS
          </p>
        </div>
 
        <div className="bg-[#0d111c]/80 border border-gray-800/70 rounded-xl py-4 px-3">
          <p className="text-base sm:text-xl font-bold text-white tracking-tight flex items-center justify-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            0.8s
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1 tracking-widest">
            MATCH SPEED
          </p>
        </div>
      </div>
 
      {/* Dashboard Preview */}
      <div className="mt-14 w-full">
        <AnalyticsPreview />
      </div>
    </section>
  );
}
