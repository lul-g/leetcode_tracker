import { AppShell } from "@/components/app-shell/app-shell";
import { AppProvider } from "@/lib/app-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
