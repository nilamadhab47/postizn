import { AppHeader } from "@/components/layout/app-header";

export default function MediaPage() {
  return (
    <div>
      <AppHeader title="Media" />
      <div className="p-8">
        <div className="rounded-xl border border-dashed border-line px-6 py-16 text-center">
          <p className="text-sm font-medium">Media library</p>
          <p className="mt-2 text-sm text-muted">
            Upload once, reuse across posts. Wired after R2.
          </p>
        </div>
      </div>
    </div>
  );
}
