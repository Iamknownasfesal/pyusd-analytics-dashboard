import { Header } from "./header";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [renderTime, setRenderTime] = useState<number | null>(null);

  // Track page render times
  useEffect(() => {
    const start = performance.now();

    // Mark the navigation start for performance tracking
    performance.mark("dashboard-render-start");

    return () => {
      const end = performance.now();
      const timeMs = end - start;
      setRenderTime(timeMs);

      // Complete the performance measurement
      performance.mark("dashboard-render-end");
      performance.measure(
        "dashboard-render",
        "dashboard-render-start",
        "dashboard-render-end"
      );

      // Log slow renders in development
      if (process.env.NODE_ENV === "development" && timeMs > 300) {
        console.warn(`Slow render on ${pathname}: ${timeMs.toFixed(2)}ms`);
      }
    };
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container md:px-0 px-4 py-6 mx-auto">
        {children}
        {process.env.NODE_ENV === "development" && renderTime && (
          <div className="fixed bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-50 pointer-events-none">
            Render: {renderTime.toFixed(1)}ms
          </div>
        )}
      </main>
      <footer className="border-t py-4">
        <div className="container md:px-0 px-4 mx-auto flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} PYUSD Analytics Dashboard. All
            rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Powered by GCP Blockchain RPC
          </p>
        </div>
      </footer>
    </div>
  );
}
