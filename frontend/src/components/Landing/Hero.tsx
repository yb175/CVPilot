import { CTAButton } from "./CTAButton";
import { AnalyticsPreview } from "./AnalyicsPreview";
import { Container } from "../ui";

export function Hero() {
  return (
    <Container size="lg" className="text-center pt-16 pb-10">
      {/* Tagline */}
      <p className="text-xs tracking-widest text-text-tertiary font-medium mb-8 uppercase">
        CVpilot — AI Job Intelligence
      </p>

      {/* Heading with gradient on "right" */}
      <h1
        className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[1.08] tracking-tight text-text-primary mb-6 font-display"
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
      <p className="mt-6 text-text-secondary max-w-xl mx-auto text-sm sm:text-base leading-relaxed mb-6">
        A precision tool for ambitious people. Use neural-matching to bypass the noise and land high-stakes opportunities.
      </p>

      {/* CTA Button */}
      <div className="flex justify-center">
        <CTAButton />
      </div>

      {/* Stats Grid */}
      <div className="mt-12 grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-bg-surface border border-border-light rounded-xl py-4 px-3 hover:border-border-normal transition-colors duration-base">
          <p className="text-base sm:text-xl font-bold text-text-primary tracking-tight">
            2,400+
          </p>
          <p className="text-xs sm:text-xs text-text-tertiary mt-1 tracking-widest">
            JOBS INDEXED
          </p>
        </div>

        <div className="bg-bg-surface border border-border-light rounded-xl py-4 px-3 hover:border-border-normal transition-colors duration-base">
          <p className="text-base sm:text-xl font-bold text-status-warning tracking-wide">
            OPTIMIZED
          </p>
          <p className="text-xs sm:text-xs text-text-tertiary mt-1 tracking-widest">
            ATS PROMPTS
          </p>
        </div>

        <div className="bg-bg-surface border border-border-light rounded-xl py-4 px-3 hover:border-border-normal transition-colors duration-base">
          <p className="text-base sm:text-xl font-bold text-status-info tracking-tight flex items-center justify-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-status-info animate-pulse" />
            0.8s
          </p>
          <p className="text-xs sm:text-xs text-text-tertiary mt-1 tracking-widest">
            MATCH SPEED
          </p>
        </div>
      </div>

      {/* Dashboard Preview */}
      <div className="mt-14 w-full">
        <AnalyticsPreview />
      </div>
    </Container>
  );
}
