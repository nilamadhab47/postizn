import type { Metadata } from "next";
import { InviteGate } from "@/components/auth/invite-gate";

export const metadata: Metadata = {
  title: "Invite",
  robots: { index: false, follow: false },
};

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InviteGate token={token} />;
}
