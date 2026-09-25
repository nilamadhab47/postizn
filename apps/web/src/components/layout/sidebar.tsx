"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const primary = [
  { href: "/dashboard", label: "Home" },
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
    <aside className="flex h-full w-[250px] shrink-0 flex-col border-r border-line bg-sidebar">
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/icon.png" alt="" width={32} height={32} className="rounded-lg" />
          <span className="text-[28px] font-extrabold tracking-tight">
            post<span className="text-accent">N</span>
          </span>
        </Link>
        <Link
          href="/compose"
          className="rounded-lg bg-accent px-2.5 py-1 text-sm font-bold text-accent-fg"
        >
          New
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-6 px-3 py-4">
        <NavGroup links={primary} pathname={pathname} />
        <NavGroup links={secondary} pathname={pathname} />
      </nav>
      <div className="border-t border-line p-4">
        <p className="truncate text-base font-bold">{user?.name ?? "Account"}</p>
        <p className="truncate text-sm text-muted">{user?.email}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-accent">
          {user?.plan}
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-3 text-sm font-semibold text-muted hover:text-foreground"
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
    <div className="flex flex-col gap-1">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-xl px-3 py-2.5 text-base font-semibold ${
              active
                ? "bg-accent text-accent-fg"
                : "text-muted hover:bg-card hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
