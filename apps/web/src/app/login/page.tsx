import { API_URL } from "@/lib/api";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-line bg-card p-8">
        <p className="text-lg font-semibold tracking-tight">
          post<span className="text-accent">N</span>
        </p>
        <h1 className="mt-6 text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Use Google to create your account. Email login comes later.
        </p>
        <a
          href={`${API_URL}/auth/google`}
          className="mt-8 flex h-11 items-center justify-center rounded-md bg-foreground text-sm font-medium text-background"
        >
          Continue with Google
        </a>
        <p className="mt-4 text-xs text-muted">
          Redirects to the API on port 4000, then back to your dashboard.
        </p>
      </div>
    </div>
  );
}
