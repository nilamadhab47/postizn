"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export function NotificationBell() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [unread, setUnread] = useState(0);
  const active = pathname === "/settings" && search.get("tab") === "notifications";

  const refresh = useCallback(() => {
    void api<{ unread: number }>("/notifications/unread-count")
      .then((data) => setUnread(data.unread))
      .catch(() => setUnread(0));
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 20_000);
    const onFocus = () => refresh();
    const onNotices = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("postn:notices", onNotices);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("postn:notices", onNotices);
    };
  }, [refresh]);

  return (
    <Link
      href="/settings?tab=notifications"
      className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-base font-semibold ${
        active ? "bg-accent text-accent-fg" : "text-muted hover:bg-card hover:text-foreground"
      }`}
    >
      <span>Notifications</span>
      {unread > 0 ? (
        <span
          className={`min-w-5 rounded-full px-1.5 text-center text-[11px] font-extrabold ${
            active ? "bg-accent-fg text-accent" : "bg-today text-white"
          }`}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
