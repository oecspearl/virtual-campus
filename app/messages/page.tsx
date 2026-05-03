"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import ChatSidebar from "@/app/components/messaging/ChatSidebar";
import { useSupabase } from "@/lib/supabase-provider";
import { useRouter } from "next/navigation";
import AccessibleModal from '@/app/components/ui/AccessibleModal';

export default function MessagesPage() {
  const { user, loading } = useSupabase();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);

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
    // Mobile: sidebar takes full width (the empty-state pane is meaningless
    // until the user selects a room, which routes to /messages/[roomId]).
    // md and up: sidebar + empty-state placeholder side by side.
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="w-full md:w-80 flex-1 md:flex-none md:flex-shrink-0 min-w-0">
        <ChatSidebar
          onCreateRoom={() => setShowCreateModal(true)}
          onRoomSelect={(roomId) => router.push(`/messages/${roomId}`)}
        />
      </div>

      {/* Main Content - Empty State (desktop only; on mobile the sidebar IS the page) */}
      <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
        <div className="text-center px-4">
          <Icon
            icon="mdi:chat-processing-outline"
            className="w-24 h-24 mx-auto text-gray-300 mb-4"
          />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Select a conversation
          </h3>
          <p className="text-gray-500 mb-4">
            Choose a chat from the sidebar or start a new conversation
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052a3] transition-colors"
          >
            New Message
          </button>
        </div>
      </div>

      {/* Create Chat Modal */}
      <CreateChatModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(roomId) => {
          setShowCreateModal(false);
          router.push(`/messages/${roomId}`);
        }}
      />
    </div>
  );
}

// Create Chat Modal Component
function CreateChatModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (roomId: string) => void;
}) {
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/messages/users/search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      if (data.users) {
        setSearchResults(data.users);
      }
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = (user: any) => {
    if (mode === "direct") {
      setSelectedUsers([user]);
    } else {
      if (!selectedUsers.find((u) => u.id === user.id)) {
        setSelectedUsers([...selectedUsers, user]);
      }
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) {
      setError("Please select at least one user");
      return;
    }

    if (mode === "group" && !groupName.trim()) {
      setError("Please enter a group name");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      if (mode === "direct") {
        // Create or get direct message room
        const response = await fetch(
          `/api/messages/direct/${selectedUsers[0].id}`
        );
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to create conversation");
          return;
        }

        onCreated(data.room.id);
      } else {
        // Create group room
        const response = await fetch("/api/messages/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: groupName.trim(),
            room_type: "group",
            member_ids: selectedUsers.map((u) => u.id),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to create group");
          return;
        }

        onCreated(data.id);
      }
    } catch (err) {
      setError("Failed to create conversation");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setMode("direct");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUsers([]);
    setGroupName("");
    setError(null);
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        resetForm();
      }}
      title="New Message"
      size="md"
    >
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setMode("direct");
                setSelectedUsers([]);
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "direct"
                  ? "bg-[#0066CC] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Direct Message
            </button>
            <button
              onClick={() => setMode("group")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "group"
                  ? "bg-[#0066CC] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Group Chat
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Group Name (for group mode) */}
          {mode === "group" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
              />
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mode === "direct" ? "Recipient" : "Members"}
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#0066CC]/10 text-[#0066CC] rounded-full text-sm"
                  >
                    {user.name}
                    <button
                      onClick={() => handleRemoveUser(user.id)}
                      className="hover:text-red-500"
                    >
                      <Icon icon="mdi:close" className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* User Search */}
          {(mode === "group" || selectedUsers.length === 0) && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {mode === "direct" ? "Search for a user" : "Add members"}
              </label>
              <div className="relative">
                <Icon
                  icon="mdi:magnify"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                />
                {isSearching && (
                  <Icon
                    icon="mdi:loading"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin"
                  />
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                    >
                      <div className="w-8 h-8 bg-[#0066CC] rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {user.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.role_display}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={
                isCreating ||
                selectedUsers.length === 0 ||
                (mode === "group" && !groupName.trim())
              }
              className="px-4 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052a3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreating && (
                <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" />
              )}
              {mode === "direct" ? "Start Chat" : "Create Group"}
            </button>
          </div>
    </AccessibleModal>
  );
}
