import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export function AuthCard({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";

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
            ? "Sign up with your name, email, and password."
            : "Sign in with your email and password."}
        </p>
        <AuthForm mode={mode} />
      </div>
    </div>
  );
}
