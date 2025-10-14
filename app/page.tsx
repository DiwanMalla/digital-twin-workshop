"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<{
    answer: string;
    sources: Array<{ title: string; content: string; score: number }>;
    processingTime?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dbStatus, setDbStatus] = useState<{
    success: boolean;
    message: string;
    vectorCount?: number;
  } | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{
    question: string;
    answer: string;
    timestamp: Date;
  }>>([]);

  // Load database on mount
  useEffect(() => {
    loadDatabase();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const currentQuestion = question;
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await fetch("/api/mcp/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to get response");
        return;
      }

      setResponse(data);
      setChatHistory(prev => [...prev, {
        question: currentQuestion,
        answer: data.answer,
        timestamp: new Date()
      }]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    "Tell me about your work experience",
    "What are your technical skills?",
    "Describe your career goals",
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
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-2xl">🤖</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Digital Twin AI
            </h1>
          </div>
          <p className="text-slate-400 text-lg">
            Your AI-powered professional profile assistant
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-500">
            <span className="px-2 py-1 bg-slate-800/50 rounded-full border border-slate-700/50">Upstash Vector</span>
            <span className="px-2 py-1 bg-slate-800/50 rounded-full border border-slate-700/50">Groq AI</span>
            <span className="px-2 py-1 bg-slate-800/50 rounded-full border border-slate-700/50">RAG System</span>
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
                    📊 {dbStatus.vectorCount} content chunks indexed and ready
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left sidebar - Chat History */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800/50 p-6 shadow-2xl sticky top-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>💬</span> Chat History
              </h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {chatHistory.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">
                    No conversations yet.<br/>Start by asking a question!
                  </p>
                ) : (
                  chatHistory.slice().reverse().map((chat, idx) => (
                    <div 
                      key={idx}
                      className="p-3 bg-slate-800/30 rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-all cursor-pointer group"
                      onClick={() => setQuestion(chat.question)}
                    >
                      <p className="text-xs text-slate-400 mb-1">
                        {chat.timestamp.toLocaleTimeString()}
                      </p>
                      <p className="text-sm text-slate-300 line-clamp-2 group-hover:text-blue-400 transition-colors">
                        {chat.question}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-2 order-1 lg:order-2 space-y-6">
            {/* Query Form */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800/50 p-6 sm:p-8 shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="question" className="block text-sm font-medium mb-3 text-slate-300">
                    💭 What would you like to know?
                  </label>
                  <div className="relative">
                    <textarea
                      id="question"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask me anything about my experience, skills, projects, or goals..."
                      className="w-full px-4 py-4 bg-slate-800/50 border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-white placeholder-slate-500 resize-none transition-all"
                      rows={4}
                      disabled={loading}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-slate-500">
                      {question.length}/500
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 disabled:shadow-none flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      <span>Thinking...</span>
                    </>
                  ) : (
                    <>
                      <span>Ask Question</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* Sample Questions */}
              <div className="mt-6">
                <p className="text-sm text-slate-400 mb-3 font-medium">✨ Suggested questions:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sampleQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuestion(q)}
                      className="text-xs sm:text-sm text-left bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500/50 text-slate-300 hover:text-blue-300 px-4 py-3 rounded-lg transition-all duration-200 group"
                      disabled={loading}
                    >
                      <span className="opacity-50 group-hover:opacity-100 transition-opacity">→</span> {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-rose-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span>⚠️</span>
                  </div>
                  <div>
                    <p className="font-semibold text-rose-400 mb-1">Error</p>
                    <p className="text-sm text-rose-300/80">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Response */}
            {response && (
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800/50 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Answer */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span>🤖</span>
                        </div>
                        <h2 className="text-xl font-semibold text-blue-400">AI Response</h2>
                      </div>
                      {response.processingTime && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                          </svg>
                          {response.processingTime}ms
                        </div>
                      )}
                    </div>
                    <div className="prose prose-invert max-w-none">
                      <p className="text-slate-200 leading-relaxed text-base whitespace-pre-wrap">
                        {response.answer}
                      </p>
                    </div>
                  </div>

                  {/* Sources */}
                  {response.sources && response.sources.length > 0 && (
                    <div className="border-t border-slate-800/50 pt-6">
                      <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
                        <span>📚</span> Sources & References ({response.sources.length})
                      </h3>
                      <div className="grid gap-3">
                        {response.sources.map((source, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200 group"
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 text-xs">
                                  {idx + 1}
                                </div>
                                <span className="text-sm font-semibold text-purple-400 group-hover:text-purple-300 transition-colors">
                                  {source.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 bg-slate-700/30 px-2 py-1 rounded-full">
                                <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                                </svg>
                                <span className="text-xs text-slate-400 font-medium">
                                  {(source.score * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed pl-8">
                              {source.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-slate-500 pb-8">
          <p className="flex items-center justify-center gap-2 flex-wrap">
            <span>Built with</span>
            <span className="text-blue-400">Next.js 15</span>
            <span>•</span>
            <span className="text-purple-400">MCP Server</span>
            <span>•</span>
            <span className="text-pink-400">Powered by AI</span>
          </p>
        </div>
      </div>
    </div>
  );
}
    
