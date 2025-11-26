"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle,
  XCircle,
  TrendingUp,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface SkillMatch {
  skill: string;
  hasSkill: boolean;
  proficiency?: "expert" | "advanced" | "intermediate" | "learning";
  matchStrength: number;
}

interface JobAnalysis {
  matchScore: number;
  matchedSkills: SkillMatch[];
  missingSkills: string[];
  strongPoints: string[];
  gapAnalysis: string[];
  recommendation: string;
  confidence: number;
}

export default function JobMatcherPage() {
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeJob = async () => {
    if (!jobDescription.trim()) {
      setError("Please paste a job description");
      return;
    }

      setLoading(true);
      setError(null);

      const response = await fetch("/api/job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to analyze job");
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      console.error("[Job Matcher] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-emerald-400";
    if (score >= 6) return "text-green-400";
    if (score >= 4) return "text-yellow-400";
    return "text-rose-400";
  };

  const getScoreGradient = (score: number) => {
    if (score >= 8) return "from-emerald-500 to-green-500";
    if (score >= 6) return "from-green-500 to-lime-500";
    if (score >= 4) return "from-yellow-500 to-orange-500";
    return "from-rose-500 to-red-500";
  };

  const getProficiencyBadge = (proficiency?: string) => {
    const styles: Record<string, string> = {
      expert: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      advanced: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      intermediate: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      learning: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    };
    return styles[proficiency || ""] || "bg-slate-500/20 text-slate-300";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Briefcase className="w-7 h-7 text-blue-400" />
                Job Matcher
              </h1>
              <p className="text-sm text-slate-400">
                Analyze how well you match a job description
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Job Description
              </h2>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here...

Example:
We're looking for a Full-Stack Developer with experience in:
- React, Next.js, TypeScript
- Node.js, Express, PostgreSQL
- AWS, Docker, CI/CD
- 3+ years of experience..."
                className="w-full h-96 bg-slate-900 border border-slate-600 rounded-lg p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {jobDescription.length} / 10,000 characters
                </span>
                <button
                  onClick={analyzeJob}
                  disabled={loading || !jobDescription.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      Analyze Match
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-rose-400">Error</p>
                  <p className="text-sm text-rose-300/80">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            {analysis ? (
              <>
                {/* Match Score */}
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <TrendingUp className="w-6 h-6 text-blue-400" />
                      <h2 className="text-lg font-semibold">Match Score</h2>
                    </div>
                    <div
                      className={`text-6xl font-bold ${getScoreColor(
                        analysis.matchScore
                      )} mb-2`}
                    >
                      {analysis.matchScore}
                      <span className="text-3xl">/10</span>
                    </div>
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden max-w-md mx-auto">
                      <div
                        className={`h-full bg-gradient-to-r ${getScoreGradient(
                          analysis.matchScore
                        )} transition-all duration-1000`}
                        style={{
                          width: `${(analysis.matchScore / 10) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-slate-300">
                      {analysis.recommendation}
                    </p>
                  </div>
                </div>

                {/* Matched Skills */}
                {analysis.matchedSkills.length > 0 && (
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      Matched Skills ({analysis.matchedSkills.length})
                    </h3>
                    <div className="space-y-2">
                      {analysis.matchedSkills.map((skill, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-sm font-medium">
                              {skill.skill}
                            </span>
                          </div>
                          {skill.proficiency && (
                            <span
                              className={`text-xs px-2 py-1 rounded-full border ${getProficiencyBadge(
                                skill.proficiency
                              )}`}
                            >
                              {skill.proficiency}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Skills */}
                {analysis.missingSkills.length > 0 && (
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-rose-400" />
                      Missing Skills ({analysis.missingSkills.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.missingSkills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strong Points */}
                {analysis.strongPoints.length > 0 && (
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      Your Strengths
                    </h3>
                    <ul className="space-y-2">
                      {analysis.strongPoints.map((point, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-1.5 flex-shrink-0"></span>
                          <span className="text-slate-300">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Gap Analysis */}
                {analysis.gapAnalysis.length > 0 && (
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                      Gap Analysis
                    </h3>
                    <ul className="space-y-2">
                      {analysis.gapAnalysis.map((gap, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 flex-shrink-0"></span>
                          <span className="text-slate-300">{gap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-slate-800/50 rounded-xl p-12 border border-slate-700 text-center">
                <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">
                  Paste a job description and click "Analyze Match" to see how
                  well you fit the role
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
