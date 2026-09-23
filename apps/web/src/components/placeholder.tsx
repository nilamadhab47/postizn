export function Placeholder({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-lg text-sm text-muted">{body}</p>
    </div>
  );
}
