import { Suspense } from "react";
import { PostsBoard } from "@/components/posts/posts-board";

export default function PostsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense fallback={<p className="p-5 text-sm text-muted">Loading posts…</p>}>
        <PostsBoard />
      </Suspense>
    </div>
  );
}
