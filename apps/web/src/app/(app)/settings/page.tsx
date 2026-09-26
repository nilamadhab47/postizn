"use client";

import { Suspense } from "react";
import { SettingsBoard } from "@/components/settings/settings-board";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-muted">Loading settings…</div>
      }
    >
      <SettingsBoard />
    </Suspense>
  );
}
