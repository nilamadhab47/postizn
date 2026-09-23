import { API_URL } from "@/lib/api";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <span className="text-xl font-semibold tracking-tight">
          post<span className="text-accent">N</span>
        </span>
        <a
          href="/login"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Sign in
        </a>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 pb-24">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
          India-first scheduler
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
          Post on LinkedIn and X without leaving IST.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Built for Indian founders and D2C brands. Connect accounts, compose,
          schedule, publish. Google login is live. Social connect is next.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={`${API_URL}/auth/google`}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg"
          >
            Continue with Google
          </a>
          <a
            href="/login"
            className="rounded-md border border-line px-5 py-2.5 text-sm text-foreground"
          >
            Sign in
          </a>
        </div>
      </main>
    </div>
  );
}
