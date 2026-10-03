"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CONTACT_EMAIL } from "@/lib/site";
import { api, ApiError, type AccessId } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CHECKOUT_TRUST, inr } from "@/lib/pricing";
import { loadRazorpayCheckout, openRazorpayModal } from "@/lib/razorpay-checkout";
import { PLAN_WELCOME_EVENT } from "@/lib/onboarding";
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
  const [cycleTouched, setCycleTouched] = useState(false);
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
      setMessage("If you already paid, this page updates after verification — not from the URL alone.");
      void refresh();
    } else if (billingFlag === "canceled") {
      setMessage("Checkout was closed. Nothing was charged.");
    }
  }, [billingFlag, refresh]);

  useEffect(() => {
    const sub = info?.subscription;
    const live = sub && (sub.status === "ACTIVE" || sub.status === "PAST_DUE");
    if (!cycleTouched && live && sub.interval) setCycle(sub.interval);
  }, [info, cycleTouched]);

  async function startCheckout(plan: PaidPlanId) {
    setBusy(plan);
    setMessage(null);
    try {
      const session = await api<{
        url: string | null;
        keyId: string | null;
        orderId: string | null;
        subscriptionId: string | null;
        amount: number;
        currency: string;
        plan: PaidPlanId;
        interval: BillingInterval;
      }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan, interval: cycle }),
      });
      const keyId = session.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
      if ((session.subscriptionId || session.orderId) && keyId) {
        await loadRazorpayCheckout();
        const result = await openRazorpayModal({
          keyId,
          orderId: session.orderId ?? undefined,
          subscriptionId: session.subscriptionId ?? undefined,
          amount: session.amount,
          currency: session.currency,
          name: "postN",
          description: `${plan === "STUDIO" ? "Studio" : "Pro"} · ${cycle}`,
          email: user?.email,
          contactName: user?.name,
        });
        if (result.status === "dismissed") {
          setMessage("Checkout was closed. Nothing was charged.");
          return;
        }
        if (result.status === "failed") {
          setMessage(result.message);
          return;
        }
        await api("/billing/verify", {
          method: "POST",
          body: JSON.stringify(result.payload),
        });
        await refresh();
        const me = await api<BillingMe>("/billing/me");
        setInfo(me);
        const switched =
          (access === "PRO" || access === "STUDIO") &&
          info?.subscription?.interval &&
          info.subscription.interval !== cycle;
        setMessage(
          switched
            ? `${plan === "STUDIO" ? "Studio" : "Pro"} ${cycle} is on. The previous cycle is stopped.`
            : `${plan === "STUDIO" ? "Studio" : "Pro"} is on.`,
        );
        if (access !== "PRO" && access !== "STUDIO") {
          window.dispatchEvent(
            new CustomEvent(PLAN_WELCOME_EVENT, { detail: { plan } }),
          );
        }
        return;
      }
      if (session.url) {
        window.location.href = session.url;
        return;
      }
      setMessage("Checkout did not return a subscription.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Could not start checkout.");
    } finally {
      setBusy(null);
    }
  }

  const pro = info?.plans.find((row) => row.id === "PRO");
  const studio = info?.plans.find((row) => row.id === "STUDIO");
  const exempt = Boolean(info?.billingExempt || entitlements?.billingExempt);
  const billed =
    info?.subscription &&
    (info.subscription.status === "ACTIVE" || info.subscription.status === "PAST_DUE")
      ? info.subscription
      : null;

  function pickCycle(id: BillingInterval) {
    setCycleTouched(true);
    setCycle(id);
  }

  const proAction = checkoutAction({
    target: "PRO",
    access,
    cycle,
    billedInterval: billed?.interval ?? null,
    exempt,
    busy,
    onClick: () => void startCheckout("PRO"),
  });
  const studioAction = checkoutAction({
    target: "STUDIO",
    access,
    cycle,
    billedInterval: billed?.interval ?? null,
    exempt,
    busy,
    onClick: () => void startCheckout("STUDIO"),
  });

  return (
    <div>
      {access === "TRIAL" ? (
        <p className="mt-3 max-w-lg text-sm font-semibold text-accent">
          Trial · {trialDays ?? 0} day{trialDays === 1 ? "" : "s"} left.
          LinkedIn and X only. Pro unlocks the rest of the grid.
        </p>
      ) : access === "FREE" ? (
        <p className="mt-3 max-w-lg text-sm font-semibold text-accent">
          Trial ended. LinkedIn, X, and every other channel wait on Pro. Pay to use.
        </p>
      ) : null}

      <div className="mt-4 inline-flex rounded-full border border-line p-1">
        {(["monthly", "yearly"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => pickCycle(id)}
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
          points={
            access === "FREE"
              ? ["Paused until you pay", "LinkedIn, X, and the grid wait on Pro"]
              : [
                  "LinkedIn + X · 2 channels",
                  `${entitlements?.postsTodayRemaining ?? 0} of ${entitlements?.postsPerDay ?? 2} posts left today`,
                  `${entitlements?.postsRemaining ?? 0} of ${entitlements?.postsPerMonth ?? 20} posts this window`,
                  `${entitlements?.imageRemaining ?? 0} of ${entitlements?.imageCap ?? 3} images · ${entitlements?.aiRemaining ?? 0} of ${entitlements?.aiCap ?? 8} AI writes`,
                ]
          }
        />
        <PlanCard
          name="Pro"
          current={access === "PRO"}
          currentLabel={
            access === "PRO"
              ? billed?.interval === "yearly"
                ? "Current · yearly"
                : "Current · monthly"
              : undefined
          }
          points={[
            pro ? paiseLabel(pro[cycle], cycle) : "₹799 / month launch",
            "All live channels",
            "8 posts / day · 150 / month",
            "20 images · 40 AI writes / month",
            ...(access === "PRO" && billed?.currentPeriodEnd
              ? [`Renews ${formatIstDate(billed.currentPeriodEnd)}`]
              : []),
          ]}
          hint={
            access === "PRO" && billed?.interval !== "yearly" && cycle === "yearly"
              ? "Yearly bills now and stops monthly. Unused days this month are not refunded."
              : access === "PRO" && billed?.interval !== "yearly" && cycle === "monthly"
                ? "Flip to Yearly to prepay a year."
                : null
          }
          action={proAction}
        />
        <PlanCard
          name="Studio"
          current={access === "STUDIO"}
          currentLabel={
            access === "STUDIO"
              ? billed?.interval === "yearly"
                ? "Current · yearly"
                : "Current · monthly"
              : undefined
          }
          points={[
            studio ? paiseLabel(studio[cycle], cycle) : "₹1,499 / month",
            "Everything in Pro",
            "20 posts / day · 400 / month",
            "80 images · 150 AI writes · video coming",
            ...(access === "STUDIO" && billed?.currentPeriodEnd
              ? [`Renews ${formatIstDate(billed.currentPeriodEnd)}`]
              : []),
          ]}
          action={studioAction}
        />
      </div>

      {message ? <p className="mt-4 max-w-2xl text-sm text-accent">{message}</p> : null}
      {exempt ? (
        <p className="mt-4 max-w-lg text-sm text-muted">
          Founder login stays Pro off-session so every channel can be tested.
        </p>
      ) : (
        <p className="mt-4 max-w-lg text-sm text-muted">
          {CHECKOUT_TRUST}
          {info && !info.attached
            ? " Checkout is not attached on this API yet."
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
  currentLabel,
  points,
  hint,
  action,
}: {
  name: string;
  current: boolean;
  currentLabel?: string;
  points: string[];
  hint?: string | null;
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
            {currentLabel ?? "Current"}
          </span>
        ) : null}
      </div>
      <ul className="mt-4 space-y-2 text-sm text-muted">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      {hint ? <p className="mt-3 text-xs font-semibold text-muted">{hint}</p> : null}
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

function checkoutAction({
  target,
  access,
  cycle,
  billedInterval,
  exempt,
  busy,
  onClick,
}: {
  target: PaidPlanId;
  access: AccessId;
  cycle: BillingInterval;
  billedInterval: BillingInterval | null;
  exempt: boolean;
  busy: PaidPlanId | null;
  onClick: () => void;
}): { label: string; onClick: () => void; disabled: boolean } | null {
  if (exempt) return null;
  if (access === "STUDIO" && target === "PRO") return null;
  if (access === "STUDIO" && target === "STUDIO") {
    if (billedInterval === "yearly") return null;
    if (billedInterval === "monthly" && cycle === "yearly") {
      return {
        label: busy === "STUDIO" ? "Opening…" : "Switch to yearly",
        onClick,
        disabled: busy != null,
      };
    }
    return null;
  }
  if (access === "PRO" && target === "PRO") {
    if (billedInterval === "yearly") return null;
    if (cycle === "yearly") {
      return {
        label: busy === "PRO" ? "Opening…" : "Switch to yearly",
        onClick,
        disabled: busy != null,
      };
    }
    return null;
  }
  const noun = target === "STUDIO" ? "Studio" : "Pro";
  return {
    label: busy === target ? "Opening…" : `Upgrade to ${noun}`,
    onClick,
    disabled: busy != null,
  };
}

function formatIstDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}
