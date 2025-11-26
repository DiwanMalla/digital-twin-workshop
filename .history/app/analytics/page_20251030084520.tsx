"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  TrendingUp,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Brain,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface LearningMetrics {
  totalConversations: number;
  positiveRatings: number;
  negativeRatings: number;
  satisfactionRate: number;
  popularTopics: Array<{ topic: string; count: number }>;
  improvementsNeeded: number;
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/learning/metrics");
      if (!response.ok) throw new Error("Failed to fetch metrics");
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
      console.error("[Analytics] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-rose-400 mb-4">{error}</p>
          <button
            onClick={fetchMetrics}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const totalRatings = metrics.positiveRatings + metrics.negativeRatings;
  const hasRatings = totalRatings > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Brain className="w-7 h-7 text-emerald-400" />
                  Learning Analytics
                </h1>
                <p className="text-sm text-slate-400">
                  AI performance and learning insights
                </p>
              </div>
            </div>
            <button
              onClick={fetchMetrics}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-sm flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Conversations */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <MessageSquare className="w-8 h-8 text-blue-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">
                Total
              </span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {metrics.totalConversations}
            </div>
            <div className="text-sm text-slate-400">Conversations</div>
          </div>

          {/* Satisfaction Rate */}
          <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-950/30 rounded-xl p-6 border border-emerald-700/50">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-emerald-400" />
              <span className="text-xs text-emerald-400 uppercase tracking-wider">
                Satisfaction
              </span>
            </div>
            <div className="text-3xl font-bold text-emerald-400 mb-1">
              {hasRatings ? `${metrics.satisfactionRate.toFixed(1)}%` : "N/A"}
            </div>
            <div className="text-sm text-slate-400">
              {hasRatings ? "User satisfaction" : "No ratings yet"}
            </div>
          </div>

          {/* Positive Ratings */}
          <div className="bg-gradient-to-br from-green-900/30 to-green-950/30 rounded-xl p-6 border border-green-700/50">
            <div className="flex items-center justify-between mb-4">
              <ThumbsUp className="w-8 h-8 text-green-400" />
              <span className="text-xs text-green-400 uppercase tracking-wider">
                Positive
              </span>
            </div>
            <div className="text-3xl font-bold text-green-400 mb-1">
              {metrics.positiveRatings}
            </div>
            <div className="text-sm text-slate-400">Thumbs up</div>
          </div>

          {/* Negative Ratings */}
          <div className="bg-gradient-to-br from-rose-900/30 to-rose-950/30 rounded-xl p-6 border border-rose-700/50">
            <div className="flex items-center justify-between mb-4">
              <ThumbsDown className="w-8 h-8 text-rose-400" />
              <span className="text-xs text-rose-400 uppercase tracking-wider">
                Needs Work
              </span>
            </div>
            <div className="text-3xl font-bold text-rose-400 mb-1">
              {metrics.negativeRatings}
            </div>
            <div className="text-sm text-slate-400">Improvements needed</div>
          </div>
        </div>

        {/* Satisfaction Progress Bar */}
        {hasRatings && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Feedback Distribution
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-green-400">Positive Feedback</span>
                  <span className="text-slate-300">
                    {metrics.positiveRatings} (
                    {((metrics.positiveRatings / totalRatings) * 100).toFixed(
                      1
                    )}
                    %)
                  </span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                    style={{
                      width: `${
                        (metrics.positiveRatings / totalRatings) * 100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-rose-400">Negative Feedback</span>
                  <span className="text-slate-300">
                    {metrics.negativeRatings} (
                    {((metrics.negativeRatings / totalRatings) * 100).toFixed(
                      1
                    )}
                    %)
                  </span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-red-500 transition-all duration-500"
                    style={{
                      width: `${
                        (metrics.negativeRatings / totalRatings) * 100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Popular Topics */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            Popular Topics
          </h3>
          {metrics.popularTopics.length > 0 ? (
            <div className="space-y-3">
              {metrics.popularTopics.map((topic, index) => {
                const maxCount = Math.max(
                  ...metrics.popularTopics.map((t) => t.count)
                );
                const percentage = (topic.count / maxCount) * 100;

                return (
                  <div key={topic.topic}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300 capitalize">
                        {topic.topic.replace(/_/g, " ")}
                      </span>
                      <span className="text-slate-400">
                        {topic.count} questions
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          index === 0
                            ? "bg-gradient-to-r from-yellow-500 to-amber-500"
                            : index === 1
                            ? "bg-gradient-to-r from-emerald-500 to-green-500"
                            : index === 2
                            ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                            : "bg-gradient-to-r from-purple-500 to-pink-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400">
                No topic data yet. Ask some questions to build analytics!
              </p>
            </div>
          )}
        </div>

        {/* Learning Insights */}
        <div className="mt-8 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-xl p-6 border border-blue-700/30">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-400" />
            Learning Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5"></div>
              <div>
                <p className="text-slate-300 font-medium">
                  Self-Learning Active
                </p>
                <p className="text-slate-400 text-xs">
                  AI improves from every thumbs up and learns from similar
                  conversations
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5"></div>
              <div>
                <p className="text-slate-300 font-medium">
                  Pattern Recognition
                </p>
                <p className="text-slate-400 text-xs">
                  Positive responses are reinforced with higher weight (1.5x)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full mt-1.5"></div>
              <div>
                <p className="text-slate-300 font-medium">Topic Extraction</p>
                <p className="text-slate-400 text-xs">
                  Automatically categorizes questions for better context
                  understanding
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-rose-400 rounded-full mt-1.5"></div>
              <div>
                <p className="text-slate-300 font-medium">
                  Improvement Tracking
                </p>
                <p className="text-slate-400 text-xs">
                  {metrics.improvementsNeeded > 0
                    ? `${metrics.improvementsNeeded} areas marked for improvement`
                    : "All responses performing well!"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
