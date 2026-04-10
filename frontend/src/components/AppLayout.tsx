import { Header } from "./Header";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <Header />
      <main>{children}</main>
    </div>
  );
}