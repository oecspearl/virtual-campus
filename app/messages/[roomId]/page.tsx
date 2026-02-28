"use client";

import { use, useState } from "react";
import { Icon } from "@iconify/react";
import ChatSidebar from "@/app/components/messaging/ChatSidebar";
import ChatWindow from "@/app/components/messaging/ChatWindow";
import { useSupabase } from "@/lib/supabase-provider";
import { useRouter } from "next/navigation";

export default function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const { user, loading } = useSupabase();
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-[#0066CC]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Icon icon="mdi:lock" className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Please sign in to access messages</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar - Hidden on mobile when chat is open */}
      <div
        className={`${
          showSidebar ? "block" : "hidden"
        } md:block w-full md:w-80 flex-shrink-0`}
      >
        <ChatSidebar
          selectedRoomId={roomId}
          onRoomSelect={(newRoomId) => router.push(`/messages/${newRoomId}`)}
          onCreateRoom={() => router.push("/messages")}
        />
      </div>

      {/* Chat Window */}
      <div
        className={`${
          showSidebar ? "hidden" : "flex"
        } md:flex flex-1 flex-col`}
      >
        {/* Mobile Back Button */}
        <div className="md:hidden p-2 border-b border-gray-200 bg-white">
          <button
            onClick={() => setShowSidebar(true)}
            className="flex items-center gap-2 text-gray-600"
          >
            <Icon icon="mdi:arrow-left" className="w-5 h-5" />
            Back to chats
          </button>
        </div>

        <ChatWindow roomId={roomId} currentUserId={user.id} />
      </div>

      {/* Mobile: Show chat button when sidebar is visible */}
      <button
        onClick={() => setShowSidebar(false)}
        className={`${
          showSidebar ? "block" : "hidden"
        } md:hidden fixed bottom-4 right-4 p-4 bg-[#0066CC] text-white rounded-full shadow-lg`}
      >
        <Icon icon="mdi:chat" className="w-6 h-6" />
      </button>
    </div>
  );
}
