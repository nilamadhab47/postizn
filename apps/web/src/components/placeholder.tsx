export function Placeholder({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-lg text-base text-muted">{body}</p>
    </div>
  );
}
