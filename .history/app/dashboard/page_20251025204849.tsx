"use client";

import { useState } from "react";
import {
  Brain,
  Database,
  Sparkles,
  RefreshCw,
  MessageSquare,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface QueryResponse {
  answer: string;
  sources: Array<{ title: string; score: number }>;
  latency: number;
}

interface ReloadResponse {
  success: boolean;
  message: string;
  vectorCount?: number;
  reloadTime?: number;
}

export default function MCPDashboard() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadStatus, setReloadStatus] = useState<ReloadResponse | null>(
    null
  );

  const handleQuery = async () => {
    if (!query.trim()) return;

    setIsQuerying(true);
    setResponse(null);

    try {
      const res = await fetch("/api/mcp/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });

      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error("Query failed:", error);
      setResponse({
        answer: "Failed to query digital twin. Please try again.",
        sources: [],
        latency: 0,
      });
    } finally {
      setIsQuerying(false);
    }
  };

  const handleReload = async () => {
    setIsReloading(true);
    setReloadStatus(null);

    try {
      const res = await fetch("/api/mcp/reload", {
        method: "DELETE",
      });

      const data = await res.json();
      setReloadStatus(data);
    } catch (error) {
      console.error("Reload failed:", error);
      setReloadStatus({
        success: false,
        message: "Failed to reload database. Please try again.",
      });
    } finally {
      setIsReloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Brain className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">
              Digital Twin MCP Server
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            AI-powered professional profile assistant with RAG technology
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <p className="text-xs text-muted-foreground">
                MCP Server Running
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Vector Database
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reloadStatus?.vectorCount || "—"}
              </div>
              <p className="text-xs text-muted-foreground">
                Profile data chunks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Last Query Time
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {response?.latency ? `${response.latency}ms` : "—"}
              </div>
              <p className="text-xs text-muted-foreground">Response latency</p>
            </CardContent>
          </Card>
        </div>

        {/* Query Interface */}
        <Card>
          <CardHeader>
            <CardTitle>Query Digital Twin</CardTitle>
            <CardDescription>
              Ask questions about Diwan Malla's professional background, skills,
              experience, or projects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Example: Tell me about your experience with React and Next.js..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <Button
              onClick={handleQuery}
              disabled={isQuerying || !query.trim()}
              className="w-full"
            >
              {isQuerying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Querying...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Ask Question
                </>
              )}
            </Button>

            {/* Response */}
            {response && (
              <div className="space-y-4 rounded-lg border border-border bg-muted/50 p-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Response:</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {response.answer}
                  </p>
                </div>

                {response.sources && response.sources.length > 0 && (
                  <div className="space-y-2 border-t border-border pt-4">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Sources:
                    </h4>
                    <div className="space-y-1">
                      {response.sources.map((source, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs"
                        >
                          <span>{source.title}</span>
                          <span className="text-muted-foreground">
                            {(source.score * 100).toFixed(1)}% match
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                  <span>Latency: {response.latency}ms</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Management */}
        <Card>
          <CardHeader>
            <CardTitle>Database Management</CardTitle>
            <CardDescription>
              Reload vector database with updated profile data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleReload}
              disabled={isReloading}
              variant="outline"
              className="w-full"
            >
              {isReloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reloading Database...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Vector Database
                </>
              )}
            </Button>

            {reloadStatus && (
              <div
                className={`flex items-start gap-3 rounded-lg border p-4 ${
                  reloadStatus.success
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-red-500/50 bg-red-500/10"
                }`}
              >
                {reloadStatus.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{reloadStatus.message}</p>
                  {reloadStatus.vectorCount && (
                    <p className="text-xs text-muted-foreground">
                      Loaded {reloadStatus.vectorCount} vectors in{" "}
                      {reloadStatus.reloadTime}ms
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sample Questions */}
        <Card>
          <CardHeader>
            <CardTitle>Try These Sample Questions</CardTitle>
            <CardDescription>
              Click any question to populate the query field
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {[
                "What is your experience with React and Next.js?",
                "Tell me about your most impactful project",
                "What are your technical skills?",
                "Describe your work at Barnamala Tech",
                "What are your career goals?",
                "What makes you a strong Full-Stack Developer?",
              ].map((sampleQuery, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery(sampleQuery)}
                  className="justify-start text-left"
                >
                  {sampleQuery}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
