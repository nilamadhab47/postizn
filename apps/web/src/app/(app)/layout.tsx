import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { OnboardingHost } from "@/components/onboarding/onboarding-host";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
      <OnboardingHost />
    </AuthProvider>
  );
}
