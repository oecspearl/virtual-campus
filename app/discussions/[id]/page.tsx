"use client";

import { use } from "react";
import GlobalDiscussionDetail from "@/app/components/discussions/GlobalDiscussionDetail";
import { useSupabase } from "@/lib/supabase-provider";

export default function DiscussionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useSupabase();

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1600px]">
      <GlobalDiscussionDetail discussionId={id} currentUserId={user?.id} />
    </div>
  );
}
