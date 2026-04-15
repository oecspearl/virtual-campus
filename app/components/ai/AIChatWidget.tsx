'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface AIChatWidgetProps {
  currentPage?: string;
  context?: Record<string, any>;
  initialMessage?: string;
}

export default function AIChatWidget({ currentPage = '/', context = {}, initialMessage }: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(!!initialMessage);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConversations, setShowConversations] = useState(false);
  const [usage, setUsage] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock response function for when AI service is not available
  const getMockResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
      return `I'd be happy to help you with the OECS Learning Management System! However, the AI service is currently not configured. 

Here are some common things you can do:
- **View Courses**: Navigate to the "Courses" section to see available courses
- **Submit Assignments**: Go to your course and find the assignment section
- **Join Video Conferences**: Look for the video conference section in your course
- **Access Help**: Use the help system for detailed guides

For immediate assistance, please contact your course instructor or use the help system.`;
    } else if (lowerMessage.includes('course')) {
      return `To work with courses in the OECS Learning Management System:

1. **Browse Courses**: Go to the "Courses" section to see all available courses
2. **Enroll**: Click on a course you're interested in and enroll
3. **Access Materials**: Once enrolled, you can access course content, assignments, and discussions
4. **Track Progress**: Monitor your progress through the course dashboard

The AI service is currently not configured, but you can find detailed help in the help system.`;
    } else if (lowerMessage.includes('assignment')) {
      return `To submit assignments:

1. **Navigate to Course**: Go to your enrolled course
2. **Find Assignment**: Look for the assignment section or specific assignment
3. **Read Instructions**: Carefully read the assignment requirements
4. **Submit Work**: Upload your files or enter your response
5. **Confirm Submission**: Make sure to submit before the deadline

For specific assignment help, contact your course instructor. The AI service is currently not available.`;
    } else {
      return `Thank you for your message! I'm the AI assistant for the OECS Learning Management System. 

Currently, the AI service is not configured, so I can provide basic guidance:

- Use the **Help System** for detailed instructions
- Contact your **Course Instructor** for course-specific questions
- Check the **Navigation Menu** for different platform features

Once the AI service is properly configured, I'll be able to provide more detailed and personalized assistance!`;
    }
  };

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

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
    loadUsage();
  }, []);

  // Auto-send initial message when provided or changed
  const lastSentMessage = useRef('');
  useEffect(() => {
    if (initialMessage && initialMessage.trim() && initialMessage !== lastSentMessage.current) {
      lastSentMessage.current = initialMessage;
      setIsOpen(true);
      sendMessage(initialMessage.trim());
    }
  }, [initialMessage]);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/ai/chat');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadUsage = async () => {
    try {
      const response = await fetch('/api/ai/usage');
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (error) {
      console.error('Error loading usage:', error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/ai/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setCurrentConversationId(conversationId);
        setShowConversations(false);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      setError('Failed to load conversation');
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
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationId: currentConversationId,
          currentPage,
          context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        
        if (response.status === 401) {
          setError('Please log in to use the AI assistant.');
        } else if (response.status === 500) {
          if (errorData.error?.includes('API key') || errorData.error?.includes('AI service')) {
            // Fallback to mock response when AI service is not configured
            const mockResponse = getMockResponse(message);
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: mockResponse,
              timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, assistantMessage]);
            return;
          } else {
            setError('Server error. Please try again later.');
          }
        } else {
          setError(`Error: ${errorData.error || 'Failed to send message'}`);
        }
        return;
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (!currentConversationId) {
        setCurrentConversationId(data.conversationId);
        loadConversations(); // Refresh conversations list
      }

      loadUsage(); // Refresh usage data

    } catch (error) {
      console.error('Error sending message:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setShowConversations(false);
    setError(null);
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/ai/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        if (currentConversationId === conversationId) {
          startNewConversation();
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const quickActions = [
    "How do I submit an assignment?",
    "How do I join a video conference?",
    "How do I access my courses?",
    "How do I update my profile?"
  ];

  return (
    <>
      {/* Floating Action Button - positioned above bottom nav on mobile */}
      <motion.button
        className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-[1100] bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-colors lg:bottom-6"
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

      {/* Chat Widget - responsive width and height for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-40 right-4 sm:bottom-24 sm:right-6 lg:bottom-24 z-[1050] w-[calc(100vw-2rem)] sm:w-96 h-[min(600px,calc(100vh-12rem))] bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <div className="flex items-center space-x-2">
                <Icon icon="mdi:robot" className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">AI Assistant</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowConversations(!showConversations)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  title="Conversations"
                >
                  <Icon icon="mdi:history" className="w-4 h-4" />
                </button>
                <button
                  onClick={startNewConversation}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  title="New Conversation"
                >
                  <Icon icon="mdi:plus" className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  title="Close"
                >
                  <Icon icon="mdi:close" className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conversations Sidebar */}
            <AnimatePresence>
              {showConversations && (
                <motion.div
                  className="absolute left-0 top-0 w-80 h-full bg-white border-r border-gray-200 z-10"
                  initial={{ x: -320 }}
                  animate={{ x: 0 }}
                  exit={{ x: -320 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-4 border-b border-gray-200">
                    <h4 className="font-medium text-gray-900">Conversations</h4>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer group"
                        onClick={() => loadConversation(conv.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {conv.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(conv.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(conv.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700"
                          >
                            <Icon icon="mdi:delete" className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <Icon icon="mdi:robot" className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="font-medium text-gray-900 mb-2">Welcome to AI Assistant!</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    I'm here to help you with the OECS Learning Management System.
                  </p>
                  
                  
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Try asking:</p>
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => sendMessage(action)}
                        className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded"
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
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <ReactMarkdown
                        components={{
                          code({ node, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const isInline = !match;
                            return !isInline && match ? (
                              <SyntaxHighlighter
                                style={tomorrow as any}
                                language={match[1]}
                                PreTag="div"
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          },
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
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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

            {/* Usage Info */}
            {usage && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
                Today: {usage.today.api_calls} calls, {usage.today.tokens_used} tokens
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me anything about the platform..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
