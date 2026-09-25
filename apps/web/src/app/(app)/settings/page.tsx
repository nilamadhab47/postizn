"use client";

import { useAuth } from "@/lib/auth";
import type { Me } from "@/lib/api";

export default function SettingsPage() {
  const { user } = useAuth();
  const entitlements = user?.entitlements;
  const plan = user?.plan ?? "FREE";

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <div className="mt-6 max-w-lg rounded-xl border border-line bg-card p-5 text-base">
        <Row label="Name" value={user?.name ?? "—"} />
        <Row label="Email" value={user?.email ?? "—"} />
        <Row label="Plan" value={plan} />
        <Row label="Timezone" value={user?.timezone ?? "Asia/Kolkata"} />
      </div>

      <h2
        id="plan"
        className="mt-10 text-xs font-extrabold uppercase tracking-[0.18em] text-accent"
      >
        Plan
      </h2>
      <div className="mt-4 grid max-w-3xl gap-4 sm:grid-cols-2">
        <PlanCard
          name="FREE"
          current={plan === "FREE"}
          points={[
            "LinkedIn + X",
            `${entitlements?.channelLimit && plan === "FREE" ? entitlements.channelLimit : 2} channels`,
            "30 posts / month",
            "3 test image gens",
          ]}
        />
        <PlanCard
          name="PRO"
          current={plan === "PRO"}
          points={[
            "Everything on FREE",
            "LinkedIn Page, Telegram, Slack, Discord, Dev.to",
            "20 channels",
            "Unlimited image gens",
          ]}
        />
      </div>
      <p className="mt-4 max-w-lg text-sm text-muted">
        New accounts start on FREE. Razorpay checkout for PRO comes after
        publish works. Your founder login is PRO so we can test every channel.
      </p>
    </div>
  );
}

function PlanCard({
  name,
  current,
  points,
}: {
  name: Me["plan"];
  current: boolean;
  points: string[];
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        current ? "border-accent bg-card" : "border-line bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold">{name}</p>
        {current ? (
          <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-accent">
            Current
          </span>
        ) : null}
      </div>
      <ul className="mt-4 space-y-2 text-sm text-muted">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
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
