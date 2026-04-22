'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface AITutorWidgetProps {
  lessonId: string;
  courseId?: string;
  /** Pass when rendered on a shared (cross-tenant) course lesson. */
  shareId?: string;
  isEnabled: boolean;
  onToggle: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function AITutorWidget({ lessonId, courseId, shareId, isEnabled, onToggle }: AITutorWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load lesson context when component mounts
  useEffect(() => {
    if (isEnabled && lessonId) {
      loadLessonContext();
    }
    // loadLessonContext closure depends on lessonId, courseId, shareId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, courseId, shareId, isEnabled]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const loadLessonContext = async () => {
    try {
      const response = await fetch('/api/ai/tutor/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, courseId, shareId })
      });

      if (response.ok) {
        const data = await response.json();
        setContext(data.context);
      }
    } catch (error) {
      console.error('Error loading lesson context:', error);
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          lessonId,
          courseId,
          shareId,
          context
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to get AI response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const quickActions = [
    "Explain the main concept",
    "Give me an example",
    "I need help with this lesson",
    "Can you summarize this?",
    "I'm stuck on a problem"
  ];

  if (!isEnabled) {
    return (
      <motion.button
        className="fixed bottom-6 left-6 z-[1100] bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg transition-colors"
        onClick={onToggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1 }}
        title="Activate AI Tutor"
      >
        <Icon icon="mdi:robot" className="w-6 h-6" />
      </motion.button>
    );
  }

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        className="fixed bottom-6 left-6 z-[1100] bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1 }}
      >
        <Icon 
          icon={isOpen ? "mdi:close" : "mdi:robot"} 
          className="w-6 h-6" 
        />
      </motion.button>

      {/* AI Tutor Widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-24 left-6 z-[1050] w-96 h-[600px] bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-lg">
              <div className="flex items-center space-x-2">
                <Icon icon="mdi:robot" className="w-5 h-5 text-white" />
                <h3 className="font-semibold text-white">AI Tutor</h3>
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full text-white">
                  {context?.lesson?.title || 'Loading...'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={onToggle}
                  className="p-1 text-white/80 hover:text-white"
                  title="Disable AI Tutor"
                >
                  <Icon icon="mdi:settings" className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-white/80 hover:text-white"
                  title="Close"
                >
                  <Icon icon="mdi:close" className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <Icon icon="mdi:robot" className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h4 className="font-medium text-gray-900 mb-2">Your AI Tutor is Ready!</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    I'm here to help you understand this lesson. Ask me anything!
                  </p>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Try asking:</p>
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => sendMessage(action)}
                        className="block w-full text-left text-xs text-purple-600 hover:text-purple-800 p-2 hover:bg-purple-50 rounded"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="text-sm mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="text-sm list-disc list-inside mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="text-sm list-decimal list-inside mb-2">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ children }) => <code className="bg-gray-200 px-1 py-0.5 rounded text-xs">{children}</code>
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-600">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Icon icon="mdi:alert-circle" className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask your AI tutor anything..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Icon icon="mdi:send" className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
