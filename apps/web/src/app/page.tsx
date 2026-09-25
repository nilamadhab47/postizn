export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <span className="flex items-center gap-2.5">
          <img src="/icon.png" alt="postN" width={36} height={36} className="rounded-xl" />
          <span className="text-3xl font-extrabold tracking-tight">
            post<span className="text-accent">N</span>
          </span>
        </span>
        <div className="flex items-center gap-2">
          <a
            href="/register"
            className="rounded-md px-4 py-2 text-sm text-muted hover:text-foreground"
          >
            Sign up
          </a>
          <a
            href="/login"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Sign in
          </a>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 pb-24">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
          India-first scheduler
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
          Post on LinkedIn and X without leaving IST.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Built for Indian founders and D2C brands. Sign in with email, then
          connect channels, compose, and schedule.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/register"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg"
          >
            Sign up
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
