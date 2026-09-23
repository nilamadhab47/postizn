"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const primary = [
  { href: "/calendar", label: "Calendar" },
  { href: "/compose", label: "Compose" },
  { href: "/posts", label: "Posts" },
  { href: "/media", label: "Media" },
  { href: "/accounts", label: "Channels" },
];

const secondary = [
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-full w-[232px] shrink-0 flex-col border-r border-line bg-[#101014]">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/calendar" className="text-[17px] font-semibold tracking-tight">
          post<span className="text-accent">N</span>
        </Link>
        <Link
          href="/compose"
          className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-fg"
        >
          New
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-6 px-2 py-3">
        <NavGroup links={primary} pathname={pathname} />
        <NavGroup links={secondary} pathname={pathname} />
      </nav>
      <div className="border-t border-line p-4">
        <p className="truncate text-sm font-medium">{user?.name ?? "Account"}</p>
        <p className="truncate text-xs text-muted">{user?.email}</p>
        <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">
          {user?.plan}
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-3 text-xs text-muted hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

function NavGroup({
  links,
  pathname,
}: {
  links: { href: string; label: string }[];
  pathname: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {links.map((link) => {
        const active =
          pathname === link.href ||
          (link.href === "/calendar" && pathname === "/dashboard");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 text-[13px] ${
              active
                ? "bg-zinc-800/90 text-foreground"
                : "text-muted hover:bg-zinc-800/50 hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
