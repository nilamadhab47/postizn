import { AppHeader } from "@/components/layout/app-header";

export default function ComposePage() {
  return (
    <div className="flex min-h-full flex-col">
      <AppHeader title="Compose" />
      <div className="grid flex-1 lg:grid-cols-[1fr_320px]">
        <div className="p-6">
          <p className="text-xs uppercase tracking-wide text-muted">
            Global draft
          </p>
          <textarea
            className="mt-3 min-h-[220px] w-full resize-y rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-accent/60"
            placeholder="Write once. We’ll adapt per channel in the next pass."
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-md border border-dashed border-line px-3 py-2 text-xs text-muted"
            >
              Add image
            </button>
            <button
              type="button"
              className="rounded-md border border-line px-3 py-2 text-xs text-muted"
            >
              Generate 5 variations
            </button>
          </div>
          <div className="mt-8 flex gap-2">
            <button
              type="button"
              className="rounded-md border border-line px-4 py-2 text-sm"
            >
              Save draft
            </button>
            <button
              type="button"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg"
            >
              Schedule
            </button>
          </div>
        </div>
        <aside className="border-t border-line p-6 lg:border-l lg:border-t-0">
          <p className="text-xs uppercase tracking-wide text-muted">Channels</p>
          <div className="mt-3 space-y-2">
            {["LinkedIn", "X"].map((name) => (
              <label
                key={name}
                className="flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2 text-sm"
              >
                {name}
                <input type="checkbox" disabled className="accent-accent" />
              </label>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted">
            Connect channels to schedule. Preview per platform comes with the
            provider layer.
          </p>
        </aside>
      </div>
    </div>
  );
}
