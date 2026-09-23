const platforms = [
  {
    name: "X",
    blurb: "OAuth 2.0 PKCE. Callback is already reserved on the API.",
  },
  {
    name: "LinkedIn",
    blurb: "Share on LinkedIn + OpenID. Personal posts first.",
  },
];

export default function AccountsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
      <p className="mt-2 max-w-lg text-sm text-muted">
        Connect buttons are here. The OAuth dance is phase 1 — NestJS will own
        the callbacks on port 4000.
      </p>
      <div className="mt-8 grid max-w-xl gap-4">
        {platforms.map((platform) => (
          <div
            key={platform.name}
            className="flex items-center justify-between rounded-xl border border-line bg-card p-5"
          >
            <div>
              <p className="font-medium">{platform.name}</p>
              <p className="mt-1 text-sm text-muted">{platform.blurb}</p>
            </div>
            <button
              type="button"
              disabled
              className="rounded-md border border-line px-3 py-1.5 text-sm text-muted"
            >
              Connect soon
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
