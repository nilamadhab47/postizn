"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CONTACT_EMAIL } from "@/lib/site";
import { api, ApiError, type AccessId } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { inr } from "@/lib/pricing";
import { rupeesFromPaise, type BillingInterval, type PaidPlanId } from "@postn/shared";

type Sku = { amountPaise: number; listPaise: number };

type BillingMe = {
  provider: string;
  attached: boolean;
  billingExempt: boolean;
  plans: Array<{ id: PaidPlanId; monthly: Sku; yearly: Sku }>;
  subscription: {
    plan: string;
    interval: BillingInterval;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
};

function paiseLabel(sku: Sku, cycle: BillingInterval) {
  const now = inr(rupeesFromPaise(sku.amountPaise));
  const list = inr(rupeesFromPaise(sku.listPaise));
  const period = cycle === "yearly" ? "/ year" : "/ month";
  if (sku.listPaise > sku.amountPaise) {
    return `${now} ${period} · ${list} list`;
  }
  return `${now} ${period}`;
}

export function BillingPanel({ access }: { access: AccessId }) {
  const { user, refresh } = useAuth();
  const search = useSearchParams();
  const billingFlag = search.get("billing");
  const entitlements = user?.entitlements;
  const trialDays = entitlements?.trialDaysRemaining;
  const [cycle, setCycle] = useState<BillingInterval>("monthly");
  const [info, setInfo] = useState<BillingMe | null>(null);
  const [busy, setBusy] = useState<PaidPlanId | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void api<BillingMe>("/billing/me")
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  useEffect(() => {
    if (billingFlag === "return") {
      setMessage("Payment is confirming with the provider. This page updates when the webhook lands — not from the success URL.");
      void refresh();
    } else if (billingFlag === "canceled") {
      setMessage("Checkout was closed. Nothing was charged.");
    }
  }, [billingFlag, refresh]);

  async function startCheckout(plan: PaidPlanId) {
    setBusy(plan);
    setMessage(null);
    try {
      const session = await api<{ url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan, interval: cycle }),
      });
      if (session.url) {
        window.location.href = session.url;
        return;
      }
      setMessage("Checkout did not return a URL.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Could not start checkout.");
    } finally {
      setBusy(null);
    }
  }

  const pro = info?.plans.find((row) => row.id === "PRO");
  const studio = info?.plans.find((row) => row.id === "STUDIO");
  const exempt = Boolean(info?.billingExempt || entitlements?.billingExempt);

  return (
    <div>
      {access === "TRIAL" ? (
        <p className="mt-3 max-w-lg text-sm font-semibold text-accent">
          Trial · {trialDays ?? 0} day{trialDays === 1 ? "" : "s"} left.
          LinkedIn and X only. Pro unlocks the rest of the grid.
        </p>
      ) : access === "FREE" ? (
        <p className="mt-3 max-w-lg text-sm font-semibold text-accent">
          Trial ended. Extra channels stay paused until Pro.
        </p>
      ) : null}

      <div className="mt-4 inline-flex rounded-full border border-line p-1">
        {(["monthly", "yearly"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setCycle(id)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${
              cycle === id ? "bg-accent text-accent-fg" : "text-muted"
            }`}
          >
            {id === "monthly" ? "Monthly" : "Yearly"}
          </button>
        ))}
      </div>

      <div className="mt-4 grid max-w-4xl gap-4 lg:grid-cols-3">
        <PlanCard
          name={access === "FREE" ? "Trial ended" : "Trial"}
          current={access === "TRIAL"}
          points={[
            "LinkedIn + X · 2 channels",
            `${entitlements?.postsTodayRemaining ?? 0} of ${entitlements?.postsPerDay ?? 2} posts left today`,
            `${entitlements?.postsRemaining ?? 0} of ${entitlements?.postsPerMonth ?? 20} posts this window`,
            `${entitlements?.imageRemaining ?? 0} of ${entitlements?.imageCap ?? 3} images · ${entitlements?.aiRemaining ?? 0} of ${entitlements?.aiCap ?? 8} AI writes`,
          ]}
        />
        <PlanCard
          name="Pro"
          current={access === "PRO"}
          points={[
            pro ? paiseLabel(pro[cycle], cycle) : "₹799 / month launch",
            "All live channels",
            "8 posts / day · 150 / month",
            "20 images · 40 AI writes / month",
          ]}
          action={
            exempt || access === "PRO" || access === "STUDIO"
              ? null
              : {
                  label: busy === "PRO" ? "Opening…" : "Upgrade to Pro",
                  onClick: () => void startCheckout("PRO"),
                  disabled: busy != null,
                }
          }
        />
        <PlanCard
          name="Studio"
          current={access === "STUDIO"}
          points={[
            studio ? paiseLabel(studio[cycle], cycle) : "₹1,499 / month",
            "Everything in Pro",
            "20 posts / day · 400 / month",
            "80 images · 150 AI writes · video coming",
          ]}
          action={
            exempt || access === "STUDIO"
              ? null
              : {
                  label: busy === "STUDIO" ? "Opening…" : "Upgrade to Studio",
                  onClick: () => void startCheckout("STUDIO"),
                  disabled: busy != null,
                }
          }
        />
      </div>

      {message ? <p className="mt-4 max-w-2xl text-sm text-accent">{message}</p> : null}
      {exempt ? (
        <p className="mt-4 max-w-lg text-sm text-muted">
          Founder login stays Pro off-session so every channel can be tested.
        </p>
      ) : (
        <p className="mt-4 max-w-lg text-sm text-muted">
          postN never sees the card. Checkout opens the attached provider
          {info?.provider && info.provider !== "none" ? ` (${info.provider})` : ""}
          . Paid access is granted only after the signed webhook, not the return URL.
          {info && !info.attached
            ? " Adapter not attached yet — the button is wired for tomorrow."
            : ""}
        </p>
      )}
      <p className="mt-2 max-w-lg text-sm text-muted">
        Enterprise is custom.{" "}
        <a className="font-semibold text-accent" href={`mailto:${CONTACT_EMAIL}`}>
          Talk to us
        </a>
        . GST extra later.
      </p>
    </div>
  );
}

function PlanCard({
  name,
  current,
  points,
  action,
}: {
  name: string;
  current: boolean;
  points: string[];
  action?: { label: string; onClick: () => void; disabled: boolean } | null;
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
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          disabled={action.disabled}
          className="mt-5 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg disabled:opacity-60"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
