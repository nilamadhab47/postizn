import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { WAITLIST_MODE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthCard
      mode="login"
      oauthError={error}
      hideRegister={WAITLIST_MODE}
      hideOauth={WAITLIST_MODE}
    />
  );
}
