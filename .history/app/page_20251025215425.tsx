"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Copy, Trash2, Send, Sparkles } from "lucide-react";

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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load database on mount
  useEffect(() => {
    loadDatabase();
  }, []);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  const loadDatabase = async () => {
    try {
      const res = await fetch("/api/mcp/query");
      const data = await res.json();
      setDbStatus(data);
    } catch (err) {
      console.error("Error loading database:", err);
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
        content: `Error: ${err instanceof Error ? err.message : "Failed to get response"}`,
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
    return content
      .split("\n")
      .map((line, i) => {
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
            <code key={i} className="bg-slate-800 px-2 py-1 rounded text-blue-300 text-sm block my-1">
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
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Digital Twin AI
            </h1>
          </div>
          <p className="text-slate-400 text-lg mb-3">
            Your AI-powered professional profile assistant with real-time streaming
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap text-xs text-slate-500">
            <span className="px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live Streaming
            </span>
            <span className="px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50">
              🔍 Upstash Vector
            </span>
            <span className="px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50">
              ⚡ Groq AI
            </span>
            {messages.length > 0 && (
              <span className="px-3 py-1.5 bg-blue-500/20 rounded-full border border-blue-500/30 text-blue-300">
                💬 {messages.length} messages
              </span>
            )}
          </div>
        </div>

        {/* Database Status */}
        {dbStatus && (
          <div
            className={`mb-6 p-4 rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
              dbStatus.success
                ? "bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                : "bg-rose-500/10 border-rose-500/30 shadow-lg shadow-rose-500/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                dbStatus.success ? "bg-emerald-500/20" : "bg-rose-500/20"
              }`}>
                <span className="text-xl">
                  {dbStatus.success ? "✓" : "✗"}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{dbStatus.message}</p>
                {dbStatus.vectorCount && (
                  <p className="text-sm text-slate-400 mt-1">
                    �� {dbStatus.vectorCount} content chunks indexed and ready
                  </p>
                )}
              </div>
              <button
                onClick={reloadDatabase}
                disabled={isReloading}
                className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg 
                  className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isReloading ? 'Reloading...' : 'Reload DB'}
              </button>
            </div>
          </div>
        )}

        {/* Main Chat Container */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden">
          {/* Chat Messages */}
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center mb-4">
                  <span className="text-4xl">💬</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-300 mb-2">Start a conversation</h3>
                <p className="text-slate-500 text-sm">Ask me anything about my professional background</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${
                  msg.type === "user" ? "justify-end" : "justify-start"
                } animate-fade-in`}
              >
                {msg.type === "ai" && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.type === "user"
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20"
                      : "bg-white/10 backdrop-blur-sm text-slate-200 border border-white/10 shadow-lg"
                  } transition-all hover:shadow-xl`}
                >
                  <div className="text-sm">
                    {msg.type === "ai" ? formatMessage(msg.content) : <p>{msg.content}</p>}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                    <p className="text-xs opacity-50">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                    {msg.type === "ai" && (
                      <button
                        onClick={() => copyToClipboard(msg.content, idx)}
                        className="text-xs opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1"
                        title="Copy response"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                {msg.type === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-white text-sm font-bold">U</span>
                  </div>
                )}
              </div>
            ))}
            
            {/* Show streaming message */}
            {isStreaming && streamingMessage && (
              <div className="flex gap-3 justify-start animate-fade-in">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Sparkles className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white/10 backdrop-blur-sm text-slate-200 border border-blue-500/30 shadow-lg shadow-blue-500/20">
                  <div className="text-sm">{formatMessage(streamingMessage)}</div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                    <p className="text-xs text-blue-300">Streaming...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Show status message */}
            {statusMessage && (
              <div className="flex justify-center">
                <div className="px-4 py-2 bg-blue-500/20 backdrop-blur-sm rounded-full border border-blue-500/30">
                  <p className="text-xs text-blue-300">{statusMessage}</p>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Form */}
          <div className="border-t border-slate-800/50 p-4 bg-slate-900/80 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-white placeholder-slate-500 transition-all"
                  disabled={isLoading || isStreaming}
                />
                <button
                  type="submit"
                  disabled={isLoading || isStreaming || !question.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center gap-2"
                >
                  {isLoading || isStreaming ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      <span>Thinking...</span>
                    </>
                  ) : (
                    <>
                      <span>Send</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                      </svg>
                    </>
                  )}
                </button>
              </div>

              {/* Sample Questions */}
              <div className="flex flex-wrap gap-2">
                {sampleQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuestion(q)}
                    className="text-xs bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500/50 text-slate-300 hover:text-blue-300 px-3 py-1.5 rounded-lg transition-all duration-200"
                    disabled={isLoading || isStreaming}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500 pb-8">
          <p className="flex items-center justify-center gap-2 flex-wrap">
            <span>Built with</span>
            <span className="text-blue-400">Next.js 15</span>
            <span>•</span>
            <span className="text-purple-400">Real-time Streaming</span>
            <span>•</span>
            <span className="text-pink-400">Powered by AI</span>
          </p>
        </div>
      </div>
    </div>
  );
}
