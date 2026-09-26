import { ComposeBoard } from "@/components/compose/compose-board";

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string; post?: string }>;
}) {
  const { at, post } = await searchParams;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ComposeBoard initialAt={at} initialPostId={post} />
    </div>
  );
}
