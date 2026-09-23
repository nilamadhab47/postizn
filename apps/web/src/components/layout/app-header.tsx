import Link from "next/link";

export function AppHeader({
  title,
  action,
}: {
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-line px-6">
      <h1 className="text-sm font-medium">{title}</h1>
      {action ? (
        <Link
          href={action.href}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg"
        >
          {action.label}
        </Link>
      ) : null}
    </header>
  );
}
