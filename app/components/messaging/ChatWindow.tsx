"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { createClient } from "@supabase/supabase-js";

interface Message {
  id: string;
  content: string;
  message_type: "text" | "file" | "image" | "system";
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  sender_id: string;
  sender: { id: string; name: string; email: string } | null;
  reply_to: {
    id: string;
    content: string;
    sender: { id: string; name: string } | null;
  } | null;
  is_edited: boolean;
  created_at: string;
}

interface Room {
  id: string;
  name: string | null;
  display_name: string;
  room_type: string;
  members: Array<{
    user_id: string;
    member_role: string;
    user: { id: string; name: string; email: string };
  }>;
  my_role: string;
}

interface ChatWindowProps {
  roomId: string;
  currentUserId: string;
}

export default function ChatWindow({ roomId, currentUserId }: ChatWindowProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRoom();
    fetchMessages();
    markAsRead();
    const cleanup = setupRealtimeSubscription();

    return () => {
      cleanup();
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchRoom = async () => {
    try {
      const response = await fetch(`/api/messages/rooms/${roomId}`);
      const data = await response.json();
      if (data.room) {
        setRoom(data.room);
      }
    } catch (err) {
      console.error("Error fetching room:", err);
    }
  };

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/messages/rooms/${roomId}/messages`);
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      setError("Failed to load messages");
      console.error("Error fetching messages:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch(`/api/messages/rooms/${roomId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const setupRealtimeSubscription = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const channel = supabase
      .channel(`chat-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "student_chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          // Refetch messages when new message arrives
          fetchMessages();
          markAsRead();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageContent.trim() && !selectedFile) || isSending) return;

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append("content", messageContent.trim());
      if (replyingTo) {
        formData.append("reply_to_id", replyingTo.id);
      }
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      const response = await fetch(`/api/messages/rooms/${roomId}/messages`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send message");
        return;
      }

      // Add new message to list
      setMessages((prev) => [...prev, data]);
      setMessageContent("");
      setReplyingTo(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        setError("File too large. Maximum size is 50MB.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";

    messages.forEach((message) => {
      const messageDate = new Date(message.created_at).toDateString();
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: message.created_at, messages: [message] });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });

    return groups;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-[#0066CC]" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
              room?.room_type === "direct"
                ? "bg-[#0066CC]"
                : room?.room_type === "course"
                ? "bg-green-600"
                : "bg-purple-600"
            }`}
          >
            {room?.room_type === "direct" ? (
              room?.display_name?.charAt(0).toUpperCase() || "?"
            ) : (
              <Icon icon="mdi:account-group" className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">
              {room?.display_name || "Chat"}
            </h2>
            <p className="text-sm text-gray-500">
              {room?.members?.length || 0} members
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Icon icon="mdi:chat-outline" className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {groupMessagesByDate(messages).map((group, groupIndex) => (
              <div key={groupIndex}>
                {/* Date Separator */}
                <div className="flex items-center gap-4 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-500 font-medium">
                    {formatDate(group.date)}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Messages */}
                {group.messages.map((message) => {
                  const isOwnMessage = message.sender_id === currentUserId;
                  const isSystem = message.message_type === "system";

                  if (isSystem) {
                    return (
                      <div
                        key={message.id}
                        className="text-center my-4 text-sm text-gray-500"
                      >
                        {message.content}
                      </div>
                    );
                  }

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex mb-4 ${
                        isOwnMessage ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] ${
                          isOwnMessage ? "order-2" : ""
                        }`}
                      >
                        {/* Sender Name (for group chats) */}
                        {!isOwnMessage && room?.room_type !== "direct" && (
                          <p className="text-xs text-gray-500 mb-1 ml-3">
                            {message.sender?.name || "Unknown"}
                          </p>
                        )}

                        {/* Reply Preview */}
                        {message.reply_to && (
                          <div
                            className={`mb-1 px-3 py-1 rounded-lg text-xs ${
                              isOwnMessage
                                ? "bg-blue-50 text-blue-700 ml-auto"
                                : "bg-gray-100 text-gray-600"
                            }`}
                            style={{ maxWidth: "200px" }}
                          >
                            <p className="font-medium">
                              {message.reply_to.sender?.name || "Unknown"}
                            </p>
                            <p className="truncate">{message.reply_to.content}</p>
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div
                          className={`px-4 py-2 rounded-lg ${
                            isOwnMessage
                              ? "bg-[#0066CC] text-white rounded-br-md"
                              : "bg-white border border-gray-200 text-gray-900 rounded-bl-md"
                          }`}
                        >
                          {/* File Attachment */}
                          {message.file_url && (
                            <div className="mb-2">
                              {message.message_type === "image" ? (
                                <img
                                  src={message.file_url}
                                  alt="Attached image"
                                  className="max-w-full rounded-lg"
                                />
                              ) : (
                                <a
                                  href={message.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-2 rounded-lg ${
                                    isOwnMessage
                                      ? "bg-blue-700"
                                      : "bg-gray-100"
                                  }`}
                                >
                                  <Icon
                                    icon="mdi:file"
                                    className="w-5 h-5"
                                  />
                                  <span className="text-sm truncate">
                                    {message.file_name || "Download file"}
                                  </span>
                                </a>
                              )}
                            </div>
                          )}

                          {/* Message Content */}
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                          </p>

                          {/* Timestamp */}
                          <div
                            className={`flex items-center gap-1 mt-1 text-xs ${
                              isOwnMessage ? "text-blue-200" : "text-gray-400"
                            }`}
                          >
                            <span>{formatTime(message.created_at)}</span>
                            {message.is_edited && <span>· Edited</span>}
                          </div>
                        </div>

                        {/* Reply Button */}
                        <button
                          onClick={() => setReplyingTo(message)}
                          className={`mt-1 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 ${
                            isOwnMessage ? "ml-auto mr-2" : "ml-2"
                          }`}
                        >
                          <Icon icon="mdi:reply" className="w-3 h-3" />
                          Reply
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-6 py-2 bg-gray-100 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Icon icon="mdi:reply" className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500">Replying to</span>
              <span className="font-medium text-gray-700">
                {replyingTo.sender?.name || "Unknown"}
              </span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <Icon icon="mdi:close" className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500 truncate mt-1">
            {replyingTo.content}
          </p>
        </div>
      )}

      {/* File Preview */}
      {selectedFile && (
        <div className="px-6 py-2 bg-gray-100 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Icon icon="mdi:file" className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">{selectedFile.name}</span>
              <span className="text-gray-400">
                ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <Icon icon="mdi:close" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleSendMessage} className="flex items-end gap-3">
          {/* File Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-[#0066CC] hover:bg-gray-100 rounded-lg transition-colors"
            title="Attach file"
          >
            <Icon icon="mdi:attachment" className="w-5 h-5" />
          </button>

          {/* Message Input */}
          <div className="flex-1">
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-[#0066CC] focus:border-transparent resize-none"
              style={{ maxHeight: "120px" }}
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={isSending || (!messageContent.trim() && !selectedFile)}
            className="p-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052a3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
            ) : (
              <Icon icon="mdi:send" className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
