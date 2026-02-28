"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import Link from "next/link";

interface ChatRoom {
  id: string;
  name: string | null;
  display_name: string;
  room_type: "direct" | "group" | "course" | "study_group";
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  member_count: number;
  members: Array<{ user: { id: string; name: string; email: string } }>;
}

interface ChatSidebarProps {
  selectedRoomId?: string;
  onRoomSelect?: (roomId: string) => void;
  onCreateRoom?: () => void;
}

export default function ChatSidebar({
  selectedRoomId,
  onRoomSelect,
  onCreateRoom,
}: ChatSidebarProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "direct" | "group">("all");

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/messages/rooms");
      const data = await response.json();
      if (data.rooms) {
        setRooms(data.rooms);
      }
    } catch (err) {
      console.error("Error fetching rooms:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRooms = rooms.filter((room) => {
    // Filter by type
    if (filter === "direct" && room.room_type !== "direct") return false;
    if (filter === "group" && room.room_type === "direct") return false;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return room.display_name?.toLowerCase().includes(query);
    }
    return true;
  });

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const getRoomIcon = (roomType: string) => {
    switch (roomType) {
      case "direct":
        return "mdi:account";
      case "group":
        return "mdi:account-group";
      case "course":
        return "mdi:school";
      case "study_group":
        return "mdi:book-open-page-variant";
      default:
        return "mdi:chat";
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
          <button
            onClick={onCreateRoom}
            className="p-2 text-[#0066CC] hover:bg-blue-50 rounded-lg transition-colors"
            title="New message"
          >
            <Icon icon="mdi:plus" className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Icon
            icon="mdi:magnify"
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mt-3">
          {[
            { value: "all", label: "All" },
            { value: "direct", label: "Direct" },
            { value: "group", label: "Groups" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value as any)}
              className={`flex-1 py-1.5 text-sm rounded-lg transition-colors ${
                filter === option.value
                  ? "bg-[#0066CC] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Icon icon="mdi:chat-outline" className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No conversations yet</p>
            <button
              onClick={onCreateRoom}
              className="mt-2 text-[#0066CC] hover:underline text-sm"
            >
              Start a new conversation
            </button>
          </div>
        ) : (
          <AnimatePresence>
            {filteredRooms.map((room) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Link
                  href={`/messages/${room.id}`}
                  onClick={() => onRoomSelect?.(room.id)}
                  className={`flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                    selectedRoomId === room.id ? "bg-blue-50" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${
                      room.room_type === "direct"
                        ? "bg-[#0066CC]"
                        : room.room_type === "course"
                        ? "bg-green-600"
                        : "bg-purple-600"
                    }`}
                  >
                    {room.room_type === "direct" ? (
                      room.display_name?.charAt(0).toUpperCase() || "?"
                    ) : (
                      <Icon icon={getRoomIcon(room.room_type)} className="w-6 h-6" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-900 truncate">
                        {room.display_name || "Unnamed Chat"}
                      </h3>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                        {formatTimeAgo(room.last_message_at)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <p className="text-sm text-gray-500 truncate">
                        {room.last_message_preview || "No messages yet"}
                      </p>
                      {room.unread_count > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-[#0066CC] text-white text-xs font-medium rounded-full">
                          {room.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
