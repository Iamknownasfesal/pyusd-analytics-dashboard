import { Header } from "./header";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-6 mx-auto">{children}</main>
      <footer className="border-t py-4">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:flex-row">
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
