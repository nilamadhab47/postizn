"use client";

import { FormEvent, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api, ApiError, PROFILE_TIMEZONES, type Me } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/layout/app-header";
import { UserAvatar } from "@/components/layout/user-avatar";
import { ChannelIcon } from "@/components/accounts/channel-icons";

export function ProfileBoard() {
  const { user, refresh } = useAuth();
  if (!user) return null;
  return <ProfileForm user={user} refresh={refresh} />;
}

function ProfileForm({
  user,
  refresh,
}: {
  user: Me;
  refresh: () => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name ?? "");
  const [timezone, setTimezone] = useState(user.timezone || "Asia/Kolkata");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "—";

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await api<Me>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name, timezone }),
      });
      await refresh();
      toast.success("Profile saved");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile");
    } finally {
      setPending(false);
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.type === "image/gif") {
      setError("Use a JPEG, PNG, or WebP photo");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploaded = await api<{ url: string }>("/media", {
        method: "POST",
        body: form,
      });
      await api<Me>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ image: uploaded.url }),
      });
      await refresh();
      toast.success("Photo updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not upload photo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto() {
    setError(null);
    setUploading(true);
    try {
      await api<Me>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ image: null }),
      });
      await refresh();
      toast.success("Photo removed");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove photo");
    } finally {
      setUploading(false);
    }
  }

  const logins = user.logins ?? { google: false, linkedin: false, twitter: false };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AppHeader title="Profile" />
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
          <section className="rounded-3xl border border-line bg-card/60 p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <UserAvatar
                name={user.name}
                image={user.image}
                className="size-24 text-2xl"
              />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-2xl font-bold">
                  {user.name || "Your name"}
                </h2>
                <p className="mt-1 truncate text-sm text-muted">{user.email}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => void onPhoto(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="rounded-xl bg-accent px-3 py-2 text-sm font-bold text-accent-fg disabled:opacity-60"
                  >
                    {uploading ? "Uploading…" : "Change photo"}
                  </button>
                  {user.image ? (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => void removePhoto()}
                      className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-muted hover:text-foreground disabled:opacity-60"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <form onSubmit={(e) => void saveProfile(e)} className="mt-8 grid gap-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">
                  Display name
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={80}
                  className="mt-1.5 h-12 w-full rounded-xl border border-line bg-background px-3 text-base outline-none focus:border-accent"
                  placeholder="How should we greet you?"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">
                  Timezone
                </span>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="mt-1.5 h-12 w-full rounded-xl border border-line bg-background px-3 text-base outline-none focus:border-accent"
                >
                  {PROFILE_TIMEZONES.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1.5 block text-xs text-muted">
                  Schedule times show in this zone. New accounts default to India (IST).
                </span>
              </label>
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              <button
                type="submit"
                disabled={pending}
                className="h-12 w-full rounded-xl bg-accent text-base font-bold text-accent-fg disabled:opacity-60 sm:w-auto sm:px-6"
              >
                {pending ? "Saving…" : "Save profile"}
              </button>
            </form>
          </section>

          <div className="grid gap-4 content-start">
            <section className="rounded-3xl border border-line bg-card/60 p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">
                Account
              </h3>
              <dl className="mt-4 space-y-3 text-sm">
                <Detail label="Email" value={user.email} />
                <Detail
                  label="Email status"
                  value={user.emailVerified ? "Verified" : "Not verified"}
                />
                <Detail label="Plan" value={user.plan} />
                <Detail label="Member since" value={joined} />
                <Detail
                  label="Password"
                  value={user.hasPassword ? "Set for email sign in" : "OAuth only"}
                />
              </dl>
              <Link
                href="/settings?tab=account"
                className="mt-5 inline-block text-sm font-semibold text-accent hover:underline"
              >
                Plan and settings
              </Link>
            </section>

            <section className="rounded-3xl border border-line bg-card/60 p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">
                Sign-in methods
              </h3>
              <ul className="mt-4 space-y-2">
                <LoginRow label="Google" on={logins.google} mark={<GoogleDot />} />
                <LoginRow
                  label="LinkedIn"
                  on={logins.linkedin}
                  mark={<ChannelIcon slug="linkedin" className="size-5 rounded-md" />}
                />
                <LoginRow
                  label="X"
                  on={logins.twitter}
                  mark={<ChannelIcon slug="twitter" className="size-5 rounded-md" />}
                />
                <LoginRow
                  label="Email & password"
                  on={Boolean(user.hasPassword)}
                />
              </ul>
            </section>

            <section className="rounded-3xl border border-line bg-card/60 p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">
                Workspace
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat
                  label="Channels"
                  value={String(user.setup?.channels ?? 0)}
                  href="/accounts"
                />
                <Stat
                  label="Posts"
                  value={String(user.setup?.posts ?? 0)}
                  href="/posts"
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/70 pb-3 last:border-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className="max-w-[60%] text-right font-semibold">{value}</dd>
    </div>
  );
}

function LoginRow({
  label,
  on,
  mark,
}: {
  label: string;
  on: boolean;
  mark?: ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-line bg-background/50 px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm font-semibold">
        {mark}
        {label}
      </span>
      <span
        className={`text-[10px] font-extrabold uppercase tracking-wide ${
          on ? "text-accent" : "text-muted"
        }`}
      >
        {on ? "Connected" : "Not linked"}
      </span>
    </li>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-line bg-background/50 p-3 hover:border-accent/50"
    >
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </p>
    </Link>
  );
}

function GoogleDot() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.4 7.4 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4V6.5H1.4C.5 8.2 0 10.1 0 12s.5 3.8 1.4 5.5l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.7 0 3.3.6 4.5 1.7l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.5l4 3.1C6.3 6.8 8.9 4.8 12 4.8z"
      />
    </svg>
  );
}
