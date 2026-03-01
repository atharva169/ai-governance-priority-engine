"use client";

import { useEffect, useState, useCallback } from "react";
import { DelhiMap } from "@/components/DelhiMap";
import { ChangesPanel } from "@/components/ChangesPanel";
import GuidedTour from "@/components/GuidedTour";

interface Issue {
    id: string;
    title: string;
    region: string;
    category: string;
    issueType: string;
    label: "Critical" | "Attention Required" | "Stable";
    score: number;
    rank: number;
    percentile: number;
    escalationRisk: number;
    daysPending: number;
    complaintsCount: number;
    explanation: string;
    aiReasoning: string;
}

interface Commitment {
    id: string;
    title: string;
    status: string;
    daysPending: number;
    riskLevel: string;
    delaySeverity: string;
}

interface Statistics {
    distribution: {
        count: number;
        mean: number;
        median: number;
        standardDeviation: number;
        min: number;
        max: number;
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
        riskLevel: string;
    }[];
    issueTypeAnalysis: {
        type: string;
        count: number;
        avgScore: number;
    }[];
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
    "life-safety": "Life-Safety",
    "essential-service": "Essential Service",
    infrastructure: "Infrastructure",
    amenity: "Amenity",
};

export default function DashboardPage() {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [commitments, setCommitments] = useState<Commitment[]>([]);
    const [stats, setStats] = useState<Statistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showTour, setShowTour] = useState(false);

    // Check for guided tour flag on mount
    useEffect(() => {
        if (localStorage.getItem("showGuidedTour") === "true") {
            setShowTour(true);
        }
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem("token") || "";
            const headers = { Authorization: `Bearer ${token}` };
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

            const [issuesRes, commitmentsRes, statsRes] = await Promise.all([
                fetch(`${API_BASE}/api/issues`, { headers }),
                fetch(`${API_BASE}/api/commitments`, { headers }),
                fetch(`${API_BASE}/api/issues/statistics`, { headers }),
            ]);

            if (!issuesRes.ok || !commitmentsRes.ok) throw new Error("Failed to load data.");

            const rawIssues = await issuesRes.json();
            const rawCommitments = await commitmentsRes.json();

            setIssues(Array.isArray(rawIssues?.issues) ? rawIssues.issues : []);
            setCommitments(Array.isArray(rawCommitments?.commitments) ? rawCommitments.commitments : []);

            if (statsRes.ok) {
                setStats(await statsRes.json());
            }
        } catch {
            setError("Unable to load governance data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getHealthColor = (score: number) => {
        if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
        if (score >= 45) return "text-amber-500 dark:text-amber-400";
        return "text-red-600 dark:text-red-400";
    };

    const getHealthBg = (score: number) => {
        if (score >= 70) return "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50";
        if (score >= 45) return "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50";
        return "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50";
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mb-3"></div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
                        AI Priority Engine Loading...
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

    const criticalIssues = issues.filter((i) => i.label === "Critical").slice(0, 5);
    const escalationCount = issues.filter((i) => i.escalationRisk >= 4).length;
    const lifeSafetyCount = issues.filter((i) => i.issueType === "life-safety").length;

    const mostDelayed = commitments.length > 0
        ? commitments.reduce((prev, curr) => (prev.daysPending > curr.daysPending ? prev : curr))
        : null;

    return (
        <div className="space-y-6 pb-8">
            {/* Guided Tour Overlay */}
            {showTour && <GuidedTour onComplete={() => setShowTour(false)} />}

            {/* What Changed Since Last Login */}
            <ChangesPanel />

            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                    Executive Dashboard
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    AI-powered governance health overview and priority intelligence.
                </p>
            </div>

            {/* Governance Health Score — Hero Section */}
            {stats && (
                <div className={`rounded-md border p-5 ${getHealthBg(stats.governanceHealth.score)}`}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">
                                Governance Health Score
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-5xl font-black ${getHealthColor(stats.governanceHealth.score)}`}>
                                    {stats.governanceHealth.score}
                                </span>
                                <span className="text-lg text-slate-400 dark:text-slate-500 font-light">/100</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{stats.governanceHealth.description}</p>
                        </div>
                        <div className="flex gap-6 text-center">
                            <div>
                                <div className="text-3xl font-bold text-red-700 dark:text-red-500">{stats.labelCounts.Critical}</div>
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">Critical</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-amber-600 dark:text-amber-500">{stats.labelCounts["Attention Required"]}</div>
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">Attention</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-500">{stats.labelCounts.Stable}</div>
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">Stable</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alerts */}
            {lifeSafetyCount > 0 && (
                <div className="rounded-md border-l-4 border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-950/30 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-700 dark:text-red-400 mb-0.5">⚠ Life-Safety Alert</p>
                    <p className="text-sm text-red-800 dark:text-red-300">
                        {lifeSafetyCount} active issue{lifeSafetyCount > 1 ? "s" : ""} classified as direct threats to human health or safety.
                        These have been automatically elevated by the AI priority engine.
                    </p>
                </div>
            )}

            {escalationCount > 0 && (
                <div className="rounded-md border-l-4 border-amber-500 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-0.5">⚡ Escalation Warning</p>
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                        {escalationCount} issue{escalationCount > 1 ? "s" : ""} at escalation risk level 4+. Immediate review recommended.
                    </p>
                </div>
            )}

            {/* Statistics Row */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3">
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avg Priority</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.distribution.mean}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">μ ± {stats.distribution.standardDeviation}σ</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3">
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Median Score</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.distribution.median}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">50th percentile</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3">
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Score Range</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.distribution.min}–{stats.distribution.max}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Min to Max</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3">
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Analyzed</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.distribution.count}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Issues scored</p>
                    </div>
                </div>
            )}

            {/* Regional Heat Map */}
            {issues.length > 0 && (
                <div className="pt-2">
                    <DelhiMap issues={issues} userZone={localStorage.getItem("constituencyName")} />
                </div>
            )}

            {/* Category Risk + Issue Type Analysis */}
            {stats && (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Category Risk */}
                    <div className="bg-white border border-slate-200 rounded-md p-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 border-b border-slate-100 pb-2">
                            Category Risk Analysis
                        </h2>
                        <div className="space-y-2">
                            {stats.categoryAnalysis.slice(0, 8).map((cat) => (
                                <div key={cat.category} className="flex items-center justify-between">
                                    <span className="text-sm text-slate-700 truncate flex-1">{cat.category}</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${cat.avgScore >= 65 ? "bg-red-500" : cat.avgScore >= 40 ? "bg-amber-500" : "bg-emerald-500"
                                                    }`}
                                                style={{ width: `${cat.avgScore}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono text-slate-500 w-8 text-right">{cat.avgScore}</span>
                                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${cat.riskLevel === "Critical" ? "bg-red-100 text-red-700"
                                            : cat.riskLevel === "Elevated" ? "bg-amber-100 text-amber-700"
                                                : "bg-emerald-100 text-emerald-700"
                                            }`}>
                                            {cat.riskLevel}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Issue Type Distribution */}
                    <div className="bg-white border border-slate-200 rounded-md p-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 border-b border-slate-100 pb-2">
                            Issue Type Distribution
                        </h2>
                        <div className="space-y-3">
                            {stats.issueTypeAnalysis.map((type) => (
                                <div key={type.type} className="flex items-center justify-between">
                                    <div>
                                        <span className="text-sm font-medium text-slate-800">
                                            {ISSUE_TYPE_LABELS[type.type] || type.type}
                                        </span>
                                        <span className="text-xs text-slate-400 ml-2">({type.count} issues)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">Avg:</span>
                                        <span className={`text-sm font-bold ${type.avgScore >= 65 ? "text-red-700"
                                            : type.avgScore >= 40 ? "text-amber-600"
                                                : "text-emerald-700"
                                            }`}>
                                            {type.avgScore}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                {/* Top Priority Issues */}
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 border-b border-slate-200 pb-2">
                        Top Priority Issues
                    </h2>
                    {criticalIssues.length === 0 ? (
                        <p className="text-sm text-slate-500">No critical issues currently active.</p>
                    ) : (
                        <div className="space-y-3">
                            {criticalIssues.map((issue) => (
                                <div key={issue.id} className="rounded-md border border-slate-200 bg-white p-4">
                                    <div className="flex items-start gap-3">
                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-800 text-sm font-bold shrink-0">
                                            {issue.rank}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                                                    {issue.title}
                                                </h3>
                                                <span className="text-lg font-black text-red-700 shrink-0">{issue.score}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {issue.region} · {issue.category} · {issue.daysPending}d pending · {issue.complaintsCount} complaints
                                            </p>
                                            <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                                                {issue.explanation}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Most Delayed Commitment + Commitment Summary */}
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 border-b border-slate-200 pb-2">
                        Commitment Tracker
                    </h2>
                    {mostDelayed ? (
                        <div className="space-y-3">
                            <div className="rounded-md border border-slate-200 bg-white p-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1">Most Delayed</p>
                                <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                                    {mostDelayed.title}
                                </h3>
                                <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3">
                                    <div>
                                        <span className="block text-xs uppercase tracking-wide text-slate-500">Days Pending</span>
                                        <span className="block mt-0.5 text-2xl font-bold text-slate-900">
                                            {mostDelayed.daysPending}
                                            <span className="text-xs font-normal text-slate-400 ml-1">days</span>
                                        </span>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200"></div>
                                    <div>
                                        <span className="block text-xs uppercase tracking-wide text-slate-500">Status</span>
                                        <span className={`inline-flex items-center rounded-sm mt-0.5 px-2 py-0.5 text-xs font-semibold uppercase ${mostDelayed.status === "stalled" ? "bg-red-100 text-red-800"
                                            : mostDelayed.status === "delayed" ? "bg-amber-100 text-amber-800"
                                                : "bg-slate-100 text-slate-700"
                                            }`}>
                                            {mostDelayed.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Commitment overview */}
                            <div className="rounded-md border border-slate-200 bg-white p-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">All Commitments</p>
                                <div className="space-y-2">
                                    {commitments.slice(0, 5).map((c) => (
                                        <div key={c.id} className="flex items-center justify-between text-sm">
                                            <span className="text-slate-700 truncate flex-1 mr-2">{c.title}</span>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`text-xs font-semibold ${c.daysPending >= 180 ? "text-red-600" : c.daysPending >= 90 ? "text-amber-600" : "text-slate-500"
                                                    }`}>
                                                    {c.daysPending}d
                                                </span>
                                                <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${c.status === "stalled" ? "bg-red-100 text-red-700"
                                                    : c.status === "delayed" ? "bg-amber-100 text-amber-700"
                                                        : c.status === "not-started" ? "bg-slate-100 text-slate-600"
                                                            : "bg-blue-100 text-blue-700"
                                                    }`}>
                                                    {c.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">No commitment data available.</p>
                    )}
                </div>
            </div>

            {/* AI Engine Footer */}
            <div className="text-center pt-4 border-t border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                    Powered by AI Priority Engine · {issues.length} issues analyzed · {Object.keys(ISSUE_TYPE_LABELS).length}-tier severity classification · 7-factor scoring model
                </p>
            </div>
        </div>
    );
}
