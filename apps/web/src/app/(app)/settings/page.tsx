"use client";

import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <div className="mt-6 max-w-lg rounded-xl border border-line bg-card p-5 text-sm">
        <Row label="Name" value={user?.name ?? "—"} />
        <Row label="Email" value={user?.email ?? "—"} />
        <Row label="Plan" value={user?.plan ?? "FREE"} />
        <Row label="Timezone" value={user?.timezone ?? "Asia/Kolkata"} />
      </div>
      <p className="mt-4 text-xs text-muted">
        Billing with Razorpay is last. Timezone stays IST unless you change it
        later.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-3 last:border-0">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
