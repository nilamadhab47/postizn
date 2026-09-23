import { AppHeader } from "@/components/layout/app-header";

export default function AnalyticsPage() {
  return (
    <div>
      <AppHeader title="Analytics" />
      <div className="p-8">
        <p className="max-w-lg text-sm text-muted">
          Post and channel metrics after publish is reliable. Not a launch
          blocker.
        </p>
      </div>
    </div>
  );
}
