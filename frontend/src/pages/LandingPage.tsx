import { Hero } from "../components/Landing/Hero";
export default function LandingPage() {
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