import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { OauthButtons } from "@/components/auth/oauth-buttons";

const OAUTH_ERRORS: Record<string, string> = {
  oauth_denied: "You cancelled sign in.",
  oauth_expired: "Sign in expired. Try again.",
  oauth_failed: "Could not sign in with Google, LinkedIn, or X. Try again.",
  oauth_not_configured: "That sign-in method is not set up on this server.",
  oauth_missing: "Sign in did not complete. Try again.",
};

export function AuthCard({
  mode,
  oauthError,
}: {
  mode: "login" | "register";
  oauthError?: string;
}) {
  const isRegister = mode === "register";
  const oauthMessage = oauthError ? OAUTH_ERRORS[oauthError] ?? OAUTH_ERRORS.oauth_failed : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-line bg-card p-8">
        <p className="flex items-center gap-2.5">
          <img src="/icon.png" alt="postN" width={36} height={36} className="rounded-xl" />
          <span className="text-3xl font-extrabold tracking-tight">
            post<span className="text-accent">N</span>
          </span>
        </p>
        <div className="mt-6 grid grid-cols-2 rounded-lg border border-line p-1 text-sm">
          <Link
            href="/login"
            className={`rounded-md py-2 text-center ${
              isRegister ? "text-muted" : "bg-foreground text-background"
            }`}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className={`rounded-md py-2 text-center ${
              isRegister ? "bg-foreground text-background" : "text-muted"
            }`}
          >
            Sign up
          </Link>
        </div>
        <h1 className="mt-6 text-3xl font-bold">
          {isRegister ? "Create account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {isRegister
            ? "Sign up with Google, LinkedIn, X, or email. 14-day trial, no card."
            : "Sign in with Google, LinkedIn, X, or email."}
        </p>
        {oauthMessage ? <p className="mt-4 text-sm text-red-400">{oauthMessage}</p> : null}
        <OauthButtons mode={mode} />
        <AuthForm mode={mode} />
      </div>
    </div>
  );
}
