"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CouponDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { refresh } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function apply() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await api<{ message: string }>("/billing/promo", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      await refresh();
      setMessage(result.message);
      setCode("");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Could not apply that code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setCode("");
          setMessage(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Have a code?</DialogTitle>
          <DialogDescription>
            Works only if you have not paid. An active trial stretches to 30
            days. After trial ends, a second code can unlock Pro for 14 days.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={code}
          autoCapitalize="characters"
          placeholder="Enter code"
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void apply();
          }}
        />
        {message ? (
          <p className="text-sm font-semibold text-accent">{message}</p>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            className="border-line bg-transparent hover:bg-background hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button disabled={busy || !code.trim()} onClick={() => void apply()}>
            {busy ? "Applying…" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
