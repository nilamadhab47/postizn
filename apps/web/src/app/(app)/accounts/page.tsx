import { Suspense } from "react";
import { ChannelsBoard } from "@/components/accounts/channels-board";

export default function AccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-muted">Loading channels…</div>
      }
    >
      <ChannelsBoard />
    </Suspense>
  );
}
