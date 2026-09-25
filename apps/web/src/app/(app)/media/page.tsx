import { AppHeader } from "@/components/layout/app-header";

export default function MediaPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppHeader title="Media" />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <p className="text-xl font-bold">Media library</p>
          <p className="mt-2 text-base text-muted">
            Upload once, reuse across posts. Wired after R2.
          </p>
        </div>
      </div>
    </div>
  );
}
