"use client";

import React, { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    Shield,
    Activity,
    Users,
    Clock,
    Filter,
    RefreshCw,
    ChevronDown,
    MapPin,
    AlertTriangle,
    CheckCircle2,
    ArrowUpRight,
    ExternalLink,
    ChevronUp,
    BarChart3,
    ArrowUp,
    ArrowDown,
    Search,
    BrainCircuit,
    Layers,
    TrendingUp,
    Target,
    CheckSquare
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts";

interface FactorBreakdown {
    raw: number;
    weighted: number;
    weight: number;
    contribution: string;
}

interface Issue {
    id: string;
    title: string;
    description: string;
    region: string;
    category: string;
    issueType: string;
    label: "Critical" | "Attention Required" | "Stable";
    escalationRisk: number;
    explanation: string;
    aiReasoning: string;
    comparisonToNext: string | null;
    score: number;
    rank: number;
    percentile: number;
    zScore: number;
    confidence: string;
    daysPending: number;
    complaintsCount: number;
    factorBreakdown: Record<string, FactorBreakdown>;
}

interface Statistics {
    distribution: {
        count: number;
        mean: number;
        median: number;
        standardDeviation: number;
        min: number;
        max: number;
        range: number;
        q1: number;
        q3: number;
        iqr: number;
    };
    labelCounts: {
        Critical: number;
        "Attention Required": number;
        Stable: number;
    };
    governanceHealth: {
        score: number;
        label: string;
        description: string;
    };
    insights: { type: string; message: string }[];
    categoryAnalysis: {
        category: string;
        issueCount: number;
        avgScore: number;
        maxScore: number;
        riskLevel: string;
    }[];
    factorImportance: {
        factor: string;
        label: string;
        avgContribution: number;
        weight: number;
    }[];
}

const FACTOR_LABELS: Record<string, string> = {
    issueTypeSeverity: "Issue Severity",
    complaintVolume: "Complaint Volume",
    sentimentSeverity: "Public Sentiment",
    daysPending: "Pending Duration",
    publicVisibility: "Public Visibility",
    escalationRisk: "Escalation Risk",
    mediaAmplification: "Media Coverage",
    commitmentBreach: "Commitment Breach",
};

const ISSUE_TYPE_LABELS: Record<string, string> = {
    "life-safety": "Life-Safety",
    "essential-service": "Essential Service",
    infrastructure: "Infrastructure",
    amenity: "Amenity",
};

const ISSUE_TYPE_COLORS: Record<string, string> = {
    "life-safety": "bg-red-100 text-red-800 border-red-200",
    "essential-service": "bg-orange-100 text-orange-800 border-orange-200",
    infrastructure: "bg-blue-100 text-blue-800 border-blue-200",
    amenity: "bg-slate-100 text-slate-600 border-slate-200",
};

function IssuesContent() {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [stats, setStats] = useState<Statistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [commitments, setCommitments] = useState<{ id: string; title: string; status: string; linkedGrievanceIds?: string[] }[]>([]);
    const searchParams = useSearchParams();
    const highlightId = searchParams.get("highlight");
    const highlightRef = useRef<HTMLTableRowElement>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const token = localStorage.getItem("token") || "";
                const headers = { Authorization: `Bearer ${token}` };

                const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
                const [issuesRes, statsRes, commitmentsRes] = await Promise.all([
                    fetch(`${API_BASE}/api/issues`, { headers }),
                    fetch(`${API_BASE}/api/issues/statistics`, { headers }),
                    fetch(`${API_BASE}/api/commitments`, { headers }),
                ]);

                if (!issuesRes.ok) throw new Error("Failed to fetch issues.");
                if (!commitmentsRes.ok) throw new Error("Failed to fetch commitments.");

                const issuesData = await issuesRes.json();
                const statsData = statsRes.ok ? await statsRes.json() : null;
                const commitmentsData = await commitmentsRes.json();

                const parsedIssues = Array.isArray(issuesData?.issues) ? issuesData.issues : [];
                setIssues(parsedIssues);
                if (statsData) setStats(statsData);
                setCommitments(Array.isArray(commitmentsData?.commitments) ? commitmentsData.commitments : []);
            } catch (err) {
                console.error("Fetch error:", err);
                setError("Unable to retrieve issue data. Data service may be unavailable.");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    // Auto-expand and scroll to highlighted issue from query param
    useEffect(() => {
        if (highlightId && issues.length > 0) {
            setExpandedRows((prev) => {
                const next = new Set(prev);
                next.add(highlightId);
                return next;
            });
            // Scroll after a small delay for DOM to render
            setTimeout(() => {
                highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 300);
        }
    }, [highlightId, issues]);

    // Find commitments linked to a specific issue
    const getLinkedCommitments = (issueId: string) => {
        return commitments.filter(
            (c) => c.linkedGrievanceIds && c.linkedGrievanceIds.includes(issueId)
        );
    };

    const toggleRow = (id: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const getLabelStyle = (label: string) => {
        switch (label) {
            case "Critical": return "bg-red-100 text-red-800";
            case "Attention Required": return "bg-amber-100 text-amber-800";
            case "Stable": return "bg-emerald-100 text-emerald-800";
            default: return "bg-slate-100 text-slate-800";
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 65) return "text-red-700";
        if (score >= 40) return "text-amber-600";
        return "text-emerald-700";
    };

    const getHealthColor = (score: number) => {
        if (score >= 70) return "text-emerald-700";
        if (score >= 45) return "text-amber-600";
        return "text-red-700";
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mb-3"></div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
                        AI Priority Engine Analyzing...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 border border-red-200 bg-red-50 rounded-md">
                <h3 className="text-sm font-semibold text-red-900 uppercase">System Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    AI Priority Engine — Issue Rankings
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Issues ranked by multi-factor AI analysis. Click any row to see the full AI reasoning.
                </p>
            </div>

            {/* Statistical Summary Bar */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Health Score</p>
                        <p className={`text-2xl font-bold ${getHealthColor(stats.governanceHealth.score)}`}>
                            {stats.governanceHealth.score}
                            <span className="text-xs font-normal text-slate-400 ml-1">/100</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{stats.governanceHealth.label}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Issues</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.distribution.count}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Analyzed</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-3">
                        <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Critical</p>
                        <p className="text-2xl font-bold text-red-700">{stats.labelCounts.Critical}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Score ≥65</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avg Score</p>
                        <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{stats.distribution.mean}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">σ = {stats.distribution.standardDeviation}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Score Range</p>
                        <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{stats.distribution.min}–{stats.distribution.max}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Spread: {stats.distribution.range}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Attention</p>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-500">{stats.labelCounts["Attention Required"]}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Score 40–64</p>
                    </div>
                </div>
            )}

            {/* AI Insights */}
            {stats && stats.insights && stats.insights.length > 0 && (
                <div className="space-y-2">
                    {stats.insights.map((insight, i) => (
                        <div
                            key={i}
                            className={`px-4 py-2.5 rounded-sm text-sm border-l-4 ${insight.type === "critical"
                                ? "bg-red-50 border-red-500 text-red-800"
                                : insight.type === "warning"
                                    ? "bg-amber-50 border-amber-500 text-amber-800"
                                    : "bg-blue-50 border-blue-500 text-blue-800"
                                }`}
                        >
                            <span className="font-semibold uppercase text-[10px] tracking-widest block mb-0.5">
                                {insight.type === "critical" ? "⚠ Critical Insight" : insight.type === "warning" ? "⚡ Warning" : "ℹ Analysis"}
                            </span>
                            {insight.message}
                        </div>
                    ))}
                </div>
            )}

            {/* Issues Table */}
            <div className="rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th scope="col" className="px-4 py-3.5 font-semibold w-16 text-center text-slate-900 dark:text-slate-100">Rank</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold w-20 text-center">Score</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold">Issue</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold w-28">Type</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold w-28">Priority</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold w-24 text-center">Pending</th>
                                <th scope="col" className="px-4 py-3.5 font-semibold w-24 text-center text-slate-900 dark:text-slate-100">Complaints</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {issues.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        No issues currently recorded.
                                    </td>
                                </tr>
                            ) : (
                                issues.map((issue) => (
                                    <React.Fragment key={issue.id}>
                                        <tr
                                            ref={issue.id === highlightId ? highlightRef : undefined}
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${expandedRows.has(issue.id) ? "bg-slate-50 dark:bg-slate-800/50" : ""
                                                } ${issue.id === highlightId ? "ring-2 ring-blue-400 ring-inset" : ""}`}
                                            onClick={() => toggleRow(issue.id)}
                                        >
                                            {/* Rank */}
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${issue.rank <= 3
                                                    ? "bg-red-100 text-red-800"
                                                    : issue.rank <= 7
                                                        ? "bg-amber-100 text-amber-700"
                                                        : "bg-slate-100 text-slate-600"
                                                    }`}>
                                                    {issue.rank}
                                                </span>
                                            </td>

                                            {/* Score */}
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`text-lg font-bold ${getScoreColor(issue.score)}`}>
                                                    {issue.score}
                                                </span>
                                                <span className="text-xs text-slate-400 block">
                                                    p{issue.percentile}
                                                </span>
                                            </td>

                                            {/* Issue details */}
                                            <td className="px-4 py-3.5">
                                                <div className="font-medium text-slate-900 dark:text-slate-100 leading-tight">{issue.title}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{issue.region}</div>
                                            </td>

                                            {/* Issue Type */}
                                            <td className="px-4 py-3.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border ${ISSUE_TYPE_COLORS[issue.issueType] || "bg-slate-100 text-slate-600"
                                                    }`}>
                                                    {ISSUE_TYPE_LABELS[issue.issueType] || issue.issueType}
                                                </span>
                                            </td>

                                            {/* Priority label */}
                                            <td className="px-4 py-3.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium uppercase ${getLabelStyle(issue.label)}`}>
                                                    {issue.label}
                                                </span>
                                            </td>

                                            {/* Days pending */}
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`font-semibold ${issue.daysPending >= 90 ? "text-red-700" : issue.daysPending >= 30 ? "text-amber-600" : "text-slate-600"}`}>
                                                    {issue.daysPending}d
                                                </span>
                                            </td>

                                            {/* Complaints */}
                                            <td className="px-4 py-3.5 text-center text-slate-700 dark:text-slate-300 font-medium">
                                                {issue.complaintsCount}
                                            </td>
                                        </tr>

                                        {/* Expanded Detail Panel */}
                                        {expandedRows.has(issue.id) && (
                                            <tr className="bg-slate-50/70 dark:bg-slate-800/30">
                                                <td colSpan={7} className="px-6 py-5">
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                        {/* Left: Factor Breakdown */}
                                                        <div>
                                                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                                                                Factor Breakdown
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {Object.entries(issue.factorBreakdown)
                                                                    .sort(([, a], [, b]) => b.weighted - a.weighted)
                                                                    .map(([key, val]) => {
                                                                        const maxWeighted = Math.max(
                                                                            ...Object.values(issue.factorBreakdown).map((v) => v.weighted)
                                                                        );
                                                                        const barWidth = maxWeighted > 0 ? (val.weighted / maxWeighted) * 100 : 0;

                                                                        return (
                                                                            <div key={key} className="flex items-center gap-3">
                                                                                <span className="text-xs text-slate-600 w-32 shrink-0 truncate">
                                                                                    {FACTOR_LABELS[key] || key}
                                                                                </span>
                                                                                <div className="flex-1 h-4 bg-slate-200 rounded-sm overflow-hidden">
                                                                                    <div
                                                                                        className={`h-full rounded-sm ${val.weighted >= 12 ? "bg-red-500" : val.weighted >= 6 ? "bg-amber-500" : "bg-slate-400"
                                                                                            }`}
                                                                                        style={{ width: `${barWidth}%` }}
                                                                                    />
                                                                                </div>
                                                                                <span className="text-xs font-mono text-slate-500 w-14 text-right">
                                                                                    {val.weighted.toFixed(1)}
                                                                                </span>
                                                                                <span className="text-[10px] text-slate-400 w-12 text-right">
                                                                                    {val.contribution}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                            </div>
                                                            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                                                                <span>Total: <strong className={getScoreColor(issue.score)}>{issue.score}/100</strong></span>
                                                                <span>Percentile: <strong>p{issue.percentile}</strong></span>
                                                                <span>Z-Score: <strong>{issue.zScore}</strong></span>
                                                                <span>Confidence: <strong className="capitalize">{issue.confidence}</strong></span>
                                                            </div>
                                                        </div>

                                                        {/* Right: AI Reasoning */}
                                                        <div>
                                                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                                                                AI Reasoning
                                                            </h4>
                                                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-4">
                                                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                                                    {issue.aiReasoning}
                                                                </p>
                                                            </div>

                                                            {issue.comparisonToNext && (
                                                                <div className="mt-3">
                                                                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                                                                        Comparison to Next Rank
                                                                    </h5>
                                                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-3">
                                                                        {issue.comparisonToNext}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            <div className="mt-3 text-xs text-slate-500 italic">
                                                                {issue.description}
                                                            </div>

                                                            {/* Linked Commitments Section */}
                                                            {(() => {
                                                                const linked = getLinkedCommitments(issue.id);
                                                                if (linked.length === 0) return null;
                                                                return (
                                                                    <div className="mt-4 border-t border-slate-200 pt-3">
                                                                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                                                                            <CheckSquare className="h-3 w-3" />
                                                                            Linked Commitments
                                                                        </h5>
                                                                        <div className="space-y-2">
                                                                            {linked.map((cmt) => {
                                                                                const statusColor =
                                                                                    cmt.status === "Completed" || cmt.status === "On Track"
                                                                                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                                                        : cmt.status === "Delayed" || cmt.status === "At Risk"
                                                                                            ? "bg-amber-100 text-amber-700 border-amber-200"
                                                                                            : "bg-slate-100 text-slate-600 border-slate-200";
                                                                                return (
                                                                                    <Link
                                                                                        key={cmt.id}
                                                                                        href="/commitments"
                                                                                        className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 hover:border-blue-300 hover:bg-blue-50/30 dark:hover:bg-slate-800 transition-colors group"
                                                                                    >
                                                                                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium group-hover:text-blue-700 transition-colors">
                                                                                            {cmt.title}
                                                                                        </span>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusColor}`}>
                                                                                                {cmt.status}
                                                                                            </span>
                                                                                            <ExternalLink className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                                        </div>
                                                                                    </Link>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default function IssuesPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <Shield className="h-12 w-12 text-slate-300 animate-pulse" />
                    <p className="text-slate-500 font-medium">Loading Intelligence Engine...</p>
                </div>
            </div>
        }>
            <IssuesContent />
        </Suspense>
    );
}
