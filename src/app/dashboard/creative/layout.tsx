import { CreativeSidebar } from "@/components/dashboard/creative-sidebar";
import { SpotlightSearch } from "@/components/dashboard/spotlight-search";

export default function CreativeDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[#0a0a0f] overflow-hidden">
      {/* Aurora Background Effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/15 rounded-full blur-[120px] animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-fuchsia-600/10 rounded-full blur-[180px]" />
      </div>

      {/* Noise Texture Overlay */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Grid Pattern */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <CreativeSidebar />

      <main className="relative z-10 lg:pl-20 transition-all duration-500">
        <div className="max-w-[1600px] mx-auto p-6 lg:p-10">
          <SpotlightSearch />
          {children}
        </div>
      </main>
    </div>
  );
}
