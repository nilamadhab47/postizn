"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PLAN_WELCOME_EVENT } from "@/lib/onboarding";
import {
  PAYWALL_EVENT,
  finishTrialEnded,
  hasSeenTrialEnded,
  isLapsed,
} from "@/lib/paywall";
import { CHECKOUT_TRUST, inr } from "@/lib/pricing";
import { loadRazorpayCheckout, openRazorpayModal } from "@/lib/razorpay-checkout";
import { rupeesFromPaise, type BillingInterval, type PaidPlanId } from "@postn/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Sku = { amountPaise: number; listPaise: number };

type BillingMe = {
  attached: boolean;
  billingExempt: boolean;
  plans: Array<{ id: PaidPlanId; monthly: Sku; yearly: Sku }>;
};

function priceOf(sku: Sku | undefined, cycle: BillingInterval) {
  if (!sku) return cycle === "yearly" ? " / year" : " / month";
  return `${inr(rupeesFromPaise(sku.amountPaise))}${cycle === "yearly" ? " / year" : " / month"}`;
}

export function PaywallHost() {
  const { user, refresh } = useAuth();
  const lapsed = isLapsed(user?.entitlements?.access ?? user?.plan);
  const [open, setOpen] = useState(false);
  const [cycle, setCycle] = useState<BillingInterval>("monthly");
  const [info, setInfo] = useState<BillingMe | null>(null);
  const [busy, setBusy] = useState<PaidPlanId | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !lapsed) {
      setOpen(false);
      return;
    }
    if (!hasSeenTrialEnded(user.id)) setOpen(true);
  }, [user, lapsed]);

  useEffect(() => {
    function onPay() {
      if (!lapsed) return;
      setOpen(true);
    }
    window.addEventListener(PAYWALL_EVENT, onPay);
    return () => window.removeEventListener(PAYWALL_EVENT, onPay);
  }, [lapsed]);

  useEffect(() => {
    if (!open) return;
    void api<BillingMe>("/billing/me")
      .then(setInfo)
      .catch(() => setInfo(null));
  }, [open]);

  function dismiss() {
    if (user) finishTrialEnded(user.id);
    setOpen(false);
    setMessage(null);
  }

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
        if (user) finishTrialEnded(user.id);
        setOpen(false);
        window.dispatchEvent(
          new CustomEvent(PLAN_WELCOME_EVENT, { detail: { plan } }),
        );
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

  if (!user || !lapsed) return null;

  const pro = info?.plans.find((row) => row.id === "PRO");
  const studio = info?.plans.find((row) => row.id === "STUDIO");

  return (
    <>
      <div className="border-b border-accent/40 bg-accent/10 px-4 py-2 text-center text-sm font-semibold">
        Trial ended. Pay to use LinkedIn, X, and everything else.{" "}
        <button
          type="button"
          className="font-extrabold text-accent underline-offset-2 hover:underline"
          onClick={() => setOpen(true)}
        >
          See Pro
        </button>
      </div>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) dismiss();
        }}
      >
        <DialogContent className="z-[90] sm:max-w-lg" overlayClassName="z-[90]" showCloseButton>
          <DialogHeader>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent">
              Trial ended
            </p>
            <DialogTitle className="text-xl">Pay to use.</DialogTitle>
            <DialogDescription>
              You can still open every tab. Posting, LinkedIn, X, AI, and uploads
              wait on Pro. Drafts stay.
            </DialogDescription>
          </DialogHeader>
          <div className="inline-flex rounded-full border border-line p-1">
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
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void startCheckout("PRO")}
              className="rounded-xl border border-accent bg-card p-4 text-left disabled:opacity-60"
            >
              <p className="text-lg font-bold">Pro</p>
              <p className="mt-1 text-sm font-semibold text-accent">
                {busy === "PRO" ? "Opening…" : priceOf(pro?.[cycle], cycle)}
              </p>
              <p className="mt-2 text-xs font-semibold text-muted">
                Every live channel. 8 posts / day.
              </p>
            </button>
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void startCheckout("STUDIO")}
              className="rounded-xl border border-line bg-card p-4 text-left disabled:opacity-60"
            >
              <p className="text-lg font-bold">Studio</p>
              <p className="mt-1 text-sm font-semibold text-accent">
                {busy === "STUDIO" ? "Opening…" : priceOf(studio?.[cycle], cycle)}
              </p>
              <p className="mt-2 text-xs font-semibold text-muted">
                Higher caps. Video gen when it ships.
              </p>
            </button>
          </div>
          <p className="text-xs font-semibold text-muted">{CHECKOUT_TRUST}</p>
          {message ? <p className="text-sm font-semibold text-accent">{message}</p> : null}
          <DialogFooter>
            <Button
              variant="outline"
              className="border-line bg-transparent hover:bg-card hover:text-foreground"
              onClick={dismiss}
            >
              Not now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
