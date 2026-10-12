import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { WAITLIST_MODE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (WAITLIST_MODE) redirect("/");
  const { error } = await searchParams;
  return <AuthCard mode="register" oauthError={error} />;
}
