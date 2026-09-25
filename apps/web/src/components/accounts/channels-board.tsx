"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChannelIcon, HelpIcon } from "@/components/accounts/channel-icons";
import { AppHeader } from "@/components/layout/app-header";
import { API_URL, api, ApiError } from "@/lib/api";
import { CHANNEL_GUIDES } from "@/lib/channel-guides";

type ChannelAccount = {
  id: string;
  platform: string;
  platformId: string;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  isActive: boolean;
  isMock: boolean;
};

type TokenField = {
  name: string;
  label: string;
  placeholder?: string;
  hint?: string;
  secret?: boolean;
};

type ProviderRow = {
  slug: string;
  platform: string;
  label: string;
  plan: "FREE" | "PRO";
  connectMode: "oauth" | "token" | "soon" | "gone";
  blurb: string;
  configured: boolean;
  locked: boolean;
  tokenFields: TokenField[];
  account: ChannelAccount | null;
};

type Catalog = {
  plan: "FREE" | "PRO";
  limit: number;
  used: number;
  providers: ProviderRow[];
};

const STATUS_COPY: Record<string, string> = {
    demo: "Demo channel connected. Paste real app keys in apps/api/.env to use live OAuth.",
  connected: "Channel connected.",
  denied: "Connection was cancelled.",
  missing_code: "Provider did not return a code.",
  expired_state: "That connect link expired. Try again.",
  oauth_failed: "Provider rejected the login. Check the app keys.",
  no_page: "No company Page found. You must be an admin of a LinkedIn Page.",
  scope_denied:
    "This LinkedIn app cannot post as a Page yet. Enable Community Management API and add the Page callback URL.",
};

export function ChannelsBoard() {
  const search = useSearchParams();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState<ProviderRow | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [helpSlug, setHelpSlug] = useState<string | null>(null);

  const banner = useMemo(() => {
    const status = search.get("status");
    if (!status) return null;
    const base = STATUS_COPY[status] ?? status;
    const detail = search.get("detail");
    return detail ? `${base} ${detail}` : base;
  }, [search]);

  async function load() {
    try {
      const data = await api<Catalog>("/social/channels");
      setCatalog(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load channels");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function disconnect(id: string) {
    setBusyId(id);
    try {
      await api(`/social/accounts/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not disconnect");
    } finally {
      setBusyId(null);
    }
  }

  async function sendTest(id: string) {
    setBusyId(`test:${id}`);
    try {
      await api(`/social/accounts/${id}/test`, {
        method: "POST",
        body: JSON.stringify({ content: "postN test · IST" }),
      });
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Test publish failed");
    } finally {
      setBusyId(null);
    }
  }

  async function submitToken() {
    if (!form) return;
    setSaving(true);
    setFormError(null);
    try {
      await api(`/social/connect/${form.slug}/token`, {
        method: "POST",
        body: JSON.stringify({ fields }),
      });
      setForm(null);
      setFields({});
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not connect");
    } finally {
      setSaving(false);
    }
  }

  const atCap = Boolean(catalog && catalog.used >= catalog.limit);
  const groups = [
    {
      title: "Free",
      rows: catalog?.providers.filter((p) => p.plan === "FREE" && p.connectMode !== "soon" && p.connectMode !== "gone") ?? [],
    },
    {
      title: "PRO",
      rows: catalog?.providers.filter((p) => p.plan === "PRO" && (p.connectMode === "oauth" || p.connectMode === "token")) ?? [],
    },
    {
      title: "Coming later",
      rows: catalog?.providers.filter((p) => p.connectMode === "soon") ?? [],
    },
    {
      title: "Unavailable",
      rows: catalog?.providers.filter((p) => p.connectMode === "gone") ?? [],
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <AppHeader title="Channels" />
      <div className="p-8">
        <p className="max-w-2xl text-sm text-muted">
          LinkedIn and X are free. LinkedIn Page, Telegram, Slack, Discord, and
          Dev.to are live on PRO. Medium no longer issues API tokens, so it
          stays in Unavailable. The rest of the grid is the roadmap.
        </p>
        {catalog ? (
          <p className="mt-3 text-xs uppercase tracking-wide text-muted">
            {catalog.plan} · {catalog.used} / {catalog.limit} connected
            {catalog.plan === "FREE" ? " · extra channels need PRO" : ""}
          </p>
        ) : null}
        {banner ? (
          <p className="mt-4 max-w-lg text-sm text-accent">{banner}</p>
        ) : null}
        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        {groups.map((group) =>
          group.rows.length ? (
            <section key={group.title} className="mt-10">
              <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">
                {group.title}
              </h2>
              <div className="mt-4 grid max-w-4xl gap-3 sm:grid-cols-2">
                {group.rows.map((provider) => {
                  const connected = Boolean(provider.account);
                  const connectBlocked = atCap && !connected;
                  return (
                    <div
                      key={provider.slug}
                      className="flex items-start justify-between gap-4 rounded-xl border border-line bg-card p-5"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <ChannelIcon slug={provider.slug} />
                        <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{provider.label}</p>
                          {provider.plan === "PRO" ? (
                            <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-accent">
                              PRO
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setHelpSlug(provider.slug)}
                            className="text-muted hover:text-accent"
                            aria-label={`How to connect ${provider.label}`}
                            title="How to"
                          >
                            <HelpIcon className="size-4" />
                          </button>
                        </div>
                        {provider.account ? (
                          <p className="mt-1 truncate text-sm text-muted">
                            {provider.account.displayName ?? provider.account.username}
                            {provider.account.username
                              ? ` · @${provider.account.username}`
                              : ""}
                            {provider.account.isMock ? " · demo" : ""}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-muted">{provider.blurb}</p>
                        )}
                        </div>
                      </div>
                      <ChannelActions
                        provider={provider}
                        connected={connected}
                        connectBlocked={connectBlocked}
                        locked={provider.locked}
                        busyId={busyId}
                        onDisconnect={disconnect}
                        onTest={sendTest}
                        onToken={() => {
                          setForm(provider);
                          setFields({});
                          setFormError(null);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null,
        )}
      </div>

      {form ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0714]/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6">
            <div className="flex items-start gap-3">
              <ChannelIcon slug={form.slug} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold">Connect {form.label}</p>
                  <button
                    type="button"
                    onClick={() => setHelpSlug(form.slug)}
                    className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs font-bold text-muted hover:border-accent hover:text-accent"
                    aria-label={`How to connect ${form.label}`}
                  >
                    <HelpIcon className="size-3.5" />
                    How to
                  </button>
                </div>
                <p className="mt-1 text-sm text-muted">{form.blurb}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-4">
              {form.tokenFields.map((field) => (
                <label key={field.name} className="block text-sm">
                  <span className="font-medium">{field.label}</span>
                  <input
                    type={field.secret ? "password" : "text"}
                    value={fields[field.name] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(e) =>
                      setFields((current) => ({
                        ...current,
                        [field.name]: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  {field.hint ? (
                    <span className="mt-1 block text-xs text-muted">{field.hint}</span>
                  ) : null}
                </label>
              ))}
            </div>
            {formError ? (
              <p className="mt-4 text-sm text-red-400">{formError}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-xl border border-line px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submitToken()}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-fg disabled:opacity-60"
              >
                {saving ? "Connecting…" : "Connect"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {helpSlug ? (
        <HowToModal
          slug={helpSlug}
          label={
            form?.slug === helpSlug
              ? form.label
              : (catalog?.providers.find((row) => row.slug === helpSlug)?.label ?? helpSlug)
          }
          onClose={() => setHelpSlug(null)}
        />
      ) : null}
    </div>
  );
}

function ChannelActions({
  provider,
  connected,
  connectBlocked,
  locked,
  busyId,
  onDisconnect,
  onTest,
  onToken,
}: {
  provider: ProviderRow;
  connected: boolean;
  connectBlocked: boolean;
  locked: boolean;
  busyId: string | null;
  onDisconnect: (id: string) => void;
  onTest: (id: string) => void;
  onToken: () => void;
}) {
  if (provider.connectMode === "soon") {
    return (
      <span className="shrink-0 rounded-md border border-line px-3 py-1.5 text-sm text-muted">
        Soon
      </span>
    );
  }

  if (provider.connectMode === "gone") {
    return (
      <span className="shrink-0 rounded-md border border-line px-3 py-1.5 text-sm text-muted">
        Gone
      </span>
    );
  }

  if (connected && provider.account) {
    return (
      <div className="flex shrink-0 flex-col items-end gap-2">
        {provider.connectMode === "oauth" ? (
          <a
            href={`${API_URL}/social/connect/${provider.slug}`}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-foreground"
          >
            Reconnect
          </a>
        ) : (
          <button
            type="button"
            onClick={onToken}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-foreground"
          >
            Reconnect
          </button>
        )}
        {!provider.account.isMock ? (
          <button
            type="button"
            disabled={busyId === `test:${provider.account.id}`}
            onClick={() => onTest(provider.account!.id)}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-60"
          >
            Test post
          </button>
        ) : null}
        <button
          type="button"
          disabled={busyId === provider.account.id}
          onClick={() => onDisconnect(provider.account!.id)}
          className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-60"
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (locked) {
    return (
      <Link
        href="/settings#plan"
        className="shrink-0 rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-foreground"
      >
        PRO
      </Link>
    );
  }

  if (connectBlocked) {
    return (
      <span className="shrink-0 rounded-md border border-line px-3 py-1.5 text-sm text-muted">
        Limit reached
      </span>
    );
  }

  if (provider.connectMode === "token") {
    return (
      <button
        type="button"
        onClick={onToken}
        className="shrink-0 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
      >
        Connect
      </button>
    );
  }

  return (
    <a
      href={`${API_URL}/social/connect/${provider.slug}`}
      className="shrink-0 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
    >
      Connect
    </a>
  );
}

function HowToModal({
  slug,
  label,
  onClose,
}: {
  slug: string;
  label: string;
  onClose: () => void;
}) {
  const guide = CHANNEL_GUIDES[slug];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b0714]/80 p-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-card p-6">
        <div className="flex items-start gap-3">
          <ChannelIcon slug={slug} />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">How to connect {label}</p>
            {guide?.note ? (
              <p className="mt-1 text-sm text-muted">{guide.note}</p>
            ) : null}
          </div>
        </div>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          {(guide?.steps ?? ["No guide for this channel yet."]).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {guide?.links?.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {guide.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-line px-3 py-1.5 text-sm text-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-fg"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
