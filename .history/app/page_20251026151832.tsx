"use client";

import { useState, useEffect, useRef } from "react";
import {
  Check,
  Copy,
  Trash2,
  Send,
  Sparkles,
  User,
  Bot,
  RotateCw,
  Database,
  Zap,
  Brain,
  Github,
  Menu,
  X,
} from "lucide-react";

type Message = {
  type: "user" | "ai";
  content: string;
  timestamp: Date;
};

export default function Home() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [dbStatus, setDbStatus] = useState<{
    success: boolean;
    message: string;
    vectorCount?: number;
  } | null>(null);
  const [isReloading, setIsReloading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{
    success: boolean;
    repos_synced?: number;
    message?: string;
  } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load database on mount
  useEffect(() => {
    loadDatabase();
    checkLastSync();
  }, []);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const loadDatabase = async () => {
    try {
      const res = await fetch("/api/mcp/query");
      const data = await res.json();
      setDbStatus(data);
    } catch (err) {
      console.error("Error loading database:", err);
    }
  };

  const checkLastSync = async () => {
    try {
      const res = await fetch("/api/github/sync");
      const data = await res.json();
      setLastSync(data.last_sync);
    } catch (err) {
      console.error("Error checking last sync:", err);
    }
  };

  const syncGitHub = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch("/api/github/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: process.env.NEXT_PUBLIC_GITHUB_USERNAME || "DiwanMalla",
        }),
      });
      const data = await res.json();
      setSyncStatus(data);
      if (data.success) {
        setLastSync(data.last_sync);
        // Reload database to update counts
        await loadDatabase();
      }
    } catch (err) {
      console.error("Error syncing GitHub:", err);
      setSyncStatus({
        success: false,
        message: "Failed to sync GitHub data",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const reloadDatabase = async () => {
    setIsReloading(true);
    try {
      const res = await fetch("/api/mcp/reload", {
        method: "DELETE",
      });
      const data = await res.json();
      setDbStatus(data);
    } catch (err) {
      console.error("Error reloading database:", err);
    } finally {
      setIsReloading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading || isStreaming) return;

    const userQuestion = question.trim();
    setQuestion("");
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingMessage("");
    setStatusMessage("");

    // Add user message immediately
    const newUserMessage: Message = {
      type: "user",
      content: userQuestion,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    try {
      const response = await fetch("/api/mcp/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userQuestion }),
      });

      if (!response.ok) throw new Error("Stream failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));

              if (data.type === "status") {
                setStatusMessage(data.message);
              } else if (data.type === "token") {
                fullResponse += data.content;
                setStreamingMessage(fullResponse);
              } else if (data.type === "done") {
                setIsStreaming(false);
                setStatusMessage("");
                // Add complete AI message
                const aiMessage: Message = {
                  type: "ai",
                  content: fullResponse,
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, aiMessage]);
                setStreamingMessage("");
              } else if (data.type === "error") {
                throw new Error(data.message);
              }
            }
          }
        }
      }
    } catch (err) {
      const errorMessage: Message = {
        type: "ai",
        content: `Error: ${
          err instanceof Error ? err.message : "Failed to get response"
        }`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setStreamingMessage("");
      setIsStreaming(false);
      setStatusMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const clearChat = () => {
    if (confirm("Are you sure you want to clear the chat history?")) {
      setMessages([]);
      setStreamingMessage("");
    }
  };

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content.split("\n").map((line, i) => {
      // Headers
      if (line.startsWith("### ")) {
        return (
          <h3 key={i} className="text-lg font-bold mt-4 mb-2 text-blue-300">
            {line.replace("### ", "")}
          </h3>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={i} className="text-xl font-bold mt-4 mb-2 text-blue-300">
            {line.replace("## ", "")}
          </h2>
        );
      }
      // Bold
      if (line.includes("**")) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className="mb-2">
            {parts.map((part, j) =>
              j % 2 === 1 ? (
                <strong key={j} className="font-semibold text-white">
                  {part}
                </strong>
              ) : (
                part
              )
            )}
          </p>
        );
      }
      // Bullet points
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return (
          <li key={i} className="ml-4 mb-1">
            {line.replace(/^[\s-*]+/, "")}
          </li>
        );
      }
      // Code blocks
      if (line.trim().startsWith("`") && line.trim().endsWith("`")) {
        return (
          <code
            key={i}
            className="bg-slate-800 px-2 py-1 rounded text-blue-300 text-sm block my-1"
          >
            {line.replace(/`/g, "")}
          </code>
        );
      }
      // Regular line
      return line.trim() ? (
        <p key={i} className="mb-2">
          {line}
        </p>
      ) : (
        <br key={i} />
      );
    });
  };

  const sampleQuestions = [
    "What is your name?",
    "Tell me about your work experience",
    "What are your technical skills?",
    "What projects have you worked on?",
    "What are your career goals?",
    "Tell me about your achievements",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main container */}
      <div className="relative min-h-screen flex">
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar - Mobile slide-in + Desktop fixed */}
        <div
          className={`${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-80 flex-col border-r border-white/10 backdrop-blur-xl bg-gray-900/95 lg:bg-gray-900/50 p-6 h-screen overflow-y-auto transition-transform duration-300 ease-in-out flex`}
        >
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          {/* Logo/Brand */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Digital Twin</h2>
                <p className="text-xs text-slate-400">AI Profile Assistant</p>
              </div>
            </div>
          </div>

          {/* Database Status */}
          {dbStatus && (
            <div className="mb-6">
              <div
                className={`p-4 rounded-xl border backdrop-blur-sm ${
                  dbStatus.success
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-rose-500/10 border-rose-500/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Database
                    className={`w-4 h-4 ${
                      dbStatus.success ? "text-emerald-400" : "text-rose-400"
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      dbStatus.success ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {dbStatus.success ? "Database Ready" : "Database Error"}
                  </span>
                </div>
                {dbStatus.vectorCount && (
                  <p className="text-xs text-slate-400">
                    {dbStatus.vectorCount} vectors indexed
                  </p>
                )}
                <button
                  onClick={reloadDatabase}
                  disabled={isReloading}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg text-xs text-slate-300 transition-all disabled:opacity-50"
                >
                  <RotateCw
                    className={`w-3 h-3 ${isReloading ? "animate-spin" : ""}`}
                  />
                  {isReloading ? "Reloading..." : "Reload Database"}
                </button>
              </div>
            </div>
          )}

          {/* GitHub Sync */}
          <div className="mb-6">
            <div className="p-4 rounded-xl border border-white/10 backdrop-blur-sm bg-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Github className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-white">
                  GitHub Auto-Sync
                </span>
              </div>
              {lastSync && (
                <p className="text-xs text-slate-400 mb-3">
                  Last synced: {new Date(lastSync).toLocaleString()}
                </p>
              )}
              {syncStatus && (
                <div
                  className={`mb-3 p-2 rounded-lg text-xs ${
                    syncStatus.success
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-rose-500/10 text-rose-400"
                  }`}
                >
                  {syncStatus.success
                    ? `✓ Synced ${syncStatus.repos_synced} repositories`
                    : syncStatus.message || "Sync failed"}
                </div>
              )}
              <button
                onClick={syncGitHub}
                disabled={isSyncing}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-xs text-blue-300 transition-all disabled:opacity-50"
              >
                <Github
                  className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`}
                />
                {isSyncing
                  ? "Syncing..."
                  : lastSync
                  ? "Sync Now"
                  : "Initial Sync"}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <span className="text-xs text-slate-400">Messages</span>
              <span className="text-sm font-semibold text-white">
                {messages.length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <span className="text-xs text-slate-400">Status</span>
              <span className="flex items-center gap-1.5 text-xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isStreaming ? "bg-green-500 animate-pulse" : "bg-gray-500"
                  }`}
                ></span>
                <span className="text-white">
                  {isStreaming ? "Active" : "Idle"}
                </span>
              </span>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
              Powered By
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Zap className="w-3 h-3 text-blue-400" />
                <span>Next.js 15 + Streaming</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Database className="w-3 h-3 text-purple-400" />
                <span>Upstash Vector DB</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Brain className="w-3 h-3 text-pink-400" />
                <span>Groq AI (Llama 3.3)</span>
              </div>
            </div>
          </div>

          {/* Clear Chat */}
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="mt-auto flex items-center justify-center gap-2 w-full px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-sm text-rose-400 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Clear Conversation
            </button>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col w-full">
          {/* Header */}
          <div className="border-b border-white/10 backdrop-blur-xl bg-gray-900/30 px-3 sm:px-6 py-3 sticky top-0 z-30">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="lg:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex-shrink-0"
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5 text-white" />
                </button>

                <div className="flex-1 min-w-0">
                  <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-white truncate">
                    <span className="hidden sm:inline">Chat with </span>
                    <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      Diwan&apos;s AI
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 hidden lg:block">
                    Ask me anything about my professional background, skills,
                    and experience
                  </p>
                </div>

                {/* Mobile DB status indicator */}
                <div className="lg:hidden flex-shrink-0">
                  {dbStatus?.success && (
                    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      <span className="text-xs text-emerald-400 hidden sm:inline">Ready</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 space-y-4">
              {messages.length === 0 && !isStreaming && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] sm:min-h-[60vh] text-center px-4">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-4 backdrop-blur-sm border border-white/10">
                    <Sparkles className="w-7 h-7 sm:w-10 sm:h-10 text-blue-400" />
                  </div>
                  <h2 className="text-xl sm:text-3xl font-bold text-white mb-2">
                    Welcome! 👋
                  </h2>
                  <p className="text-slate-400 text-xs sm:text-base mb-6 max-w-2xl">
                    I&apos;m an AI assistant trained on Diwan&apos;s profile. Ask about skills, projects, or experience!
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
                    {sampleQuestions.slice(0, 4).map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuestion(q)}
                        className="p-2.5 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-lg text-left text-xs sm:text-sm text-slate-300 hover:text-white transition-all group"
                        disabled={isLoading || isStreaming}
                      >
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0" />
                          <span className="line-clamp-2">{q}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 sm:gap-4 ${
                    msg.type === "user" ? "justify-end" : "justify-start"
                  } animate-fade-in`}
                >
                  {msg.type === "ai" && (
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 sm:px-5 sm:py-4 ${
                      msg.type === "user"
                        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20"
                        : "bg-white/5 backdrop-blur-sm text-slate-100 border border-white/10 shadow-lg"
                    }`}
                  >
                    <div className="text-sm leading-relaxed break-words">
                      {msg.type === "ai" ? (
                        formatMessage(msg.content)
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/10">
                      <p className="text-xs opacity-60">
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {msg.type === "ai" && (
                        <button
                          onClick={() => copyToClipboard(msg.content, idx)}
                          className="text-xs opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/5"
                          title="Copy response"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="hidden sm:inline text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {msg.type === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming message */}
              {isStreaming && streamingMessage && (
                <div className="flex gap-3 sm:gap-4 justify-start animate-fade-in">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
                  </div>
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 sm:px-5 sm:py-4 bg-white/5 backdrop-blur-sm text-slate-100 border border-blue-500/30 shadow-lg shadow-blue-500/20">
                    <div className="text-sm leading-relaxed break-words">
                      {formatMessage(streamingMessage)}
                    </div>
                    <div className="flex items-center gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/10">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                      </div>
                      <p className="text-xs text-blue-400">
                        Streaming response...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status message */}
              {statusMessage && (
                <div className="flex justify-center">
                  <div className="px-4 py-2 bg-blue-500/10 backdrop-blur-sm rounded-full border border-blue-500/30 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <p className="text-xs text-blue-300">{statusMessage}</p>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-white/10 backdrop-blur-xl bg-gray-900/50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div className="flex gap-2 sm:gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask me anything..."
                    className="flex-1 px-4 py-3 sm:px-5 sm:py-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-white placeholder-slate-500 transition-all text-sm"
                    disabled={isLoading || isStreaming}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || isStreaming || !question.trim()}
                    className="px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105"
                  >
                    {isLoading || isStreaming ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span className="hidden sm:inline">Thinking...</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Send</span>
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Quick questions - show when no messages */}
                {messages.length === 0 && !isStreaming && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-slate-500 py-2">
                      Try asking:
                    </span>
                    {sampleQuestions.slice(4).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuestion(q)}
                        className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-all"
                        disabled={isLoading || isStreaming}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </form>

              <p className="text-xs text-center text-slate-500 mt-3 sm:mt-4">
                Powered by Next.js 15 • Upstash Vector • Groq AI • Real-time
                Streaming
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
