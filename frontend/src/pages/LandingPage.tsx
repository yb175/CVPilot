import { Hero } from "../components/Landing/Hero";
import { useUser } from "@clerk/react";
import { PageContainer, GridBackground, PageTransition } from "../components/ui";

export default function LandingPage() {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <PageContainer background="primary">
        <GridBackground />
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse text-text-tertiary text-sm">Loading...</div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageTransition>
      <PageContainer background="primary">
        <GridBackground variant="light" />
        <Hero />
      </PageContainer>
    </PageTransition>
  );
}