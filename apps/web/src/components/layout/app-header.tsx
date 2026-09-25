import Link from "next/link";

export function AppHeader({
  title,
  action,
}: {
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-line px-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {action ? (
        <Link
          href={action.href}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-fg"
        >
          {action.label}
        </Link>
      ) : null}
    </header>
  );
}
