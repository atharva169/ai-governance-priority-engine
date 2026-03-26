"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { DelhiMap } from "@/components/DelhiMap";
import { ChangesPanel } from "@/components/ChangesPanel";
import GuidedTour from "@/components/GuidedTour";
import LiveFeedPanel from "@/components/LiveFeedPanel";
import SentimentTrendPanel from "@/components/SentimentTrendPanel";
import RadialGauge from "@/components/RadialGauge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

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
    const lastRefetchRef = useRef<number>(0);

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
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

            const [issuesRes, commitmentsRes, statsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/issues`, { headers }),
                fetch(`${API_BASE_URL}/api/commitments`, { headers }),
                fetch(`${API_BASE_URL}/api/issues/statistics`, { headers }),
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

    // Debounced re-fetch when live feed pushes new grievances (max once per 30s)
    const handleNewGrievance = useCallback(() => {
        const now = Date.now();
        if (now - lastRefetchRef.current > 30000) {
            lastRefetchRef.current = now;
            fetchData();
        }
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

            {/* Real-Time Live Grievance Feed */}
            <LiveFeedPanel onNewGrievance={handleNewGrievance} />

            {/* NLP Sentiment Trend Analysis */}
            <SentimentTrendPanel />

            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                    Executive Dashboard
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    AI-powered governance health overview and priority intelligence.
                </p>
            </div>

            {/* Governance Health Score — Hero Section with Radial Gauge */}
            {stats && stats.governanceHealth && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900 p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        {/* Radial Gauge */}
                        <div className="flex items-center gap-8">
                            <RadialGauge
                                score={stats.governanceHealth.score}
                                label="Governance Health"
                                sublabel={stats.governanceHealth.description}
                            />
                        </div>

                        {/* Distribution Donut Chart */}
                        {stats.labelCounts && (() => {
                            const distData = [
                                { name: "Critical", value: stats.labelCounts.Critical || 0, color: "#ef4444" },
                                { name: "Attention", value: stats.labelCounts["Attention Required"] || 0, color: "#f59e0b" },
                                { name: "Stable", value: stats.labelCounts.Stable || 0, color: "#10b981" },
                            ];
                            return (
                                <div className="flex items-center gap-6">
                                    <div className="w-36 h-36">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={distData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={38}
                                                    outerRadius={58}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                    strokeWidth={0}
                                                >
                                                    {distData.map((entry, index) => (
                                                        <Cell key={index} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-3">
                                        {distData.map((d) => (
                                            <div key={d.name} className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                                                <div>
                                                    <div className="text-2xl font-bold" style={{ color: d.color }}>{d.value}</div>
                                                    <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">{d.name}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
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

            {/* Statistics Row — Glassmorphism Cards */}
            {stats && stats.distribution && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="glass rounded-xl p-4 card-hover">
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avg Priority</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 animate-count">{stats.distribution.mean}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">μ ± {stats.distribution.standardDeviation}σ</p>
                    </div>
                    <div className="glass rounded-xl p-4 card-hover">
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Median Score</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 animate-count">{stats.distribution.median}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">50th percentile</p>
                    </div>
                    <div className="glass rounded-xl p-4 card-hover">
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Score Range</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 animate-count">{stats.distribution.min}–{stats.distribution.max}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Min to Max</p>
                    </div>
                    <div className="glass rounded-xl p-4 card-hover">
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Analyzed</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 animate-count">{stats.distribution.count}</p>
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
            {stats && stats.categoryAnalysis && (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Category Risk */}
                    <div className="glass rounded-xl p-5">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
                            Category Risk Analysis
                        </h2>
                        <div className="space-y-2.5">
                            {stats.categoryAnalysis.slice(0, 8).map((cat) => (
                                <div key={cat.category} className="flex items-center justify-between group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">{cat.category}</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    cat.avgScore >= 65 ? "bg-gradient-to-r from-red-500 to-rose-400"
                                                    : cat.avgScore >= 40 ? "bg-gradient-to-r from-amber-500 to-orange-400"
                                                    : "bg-gradient-to-r from-emerald-500 to-teal-400"
                                                }`}
                                                style={{ width: `${cat.avgScore}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-8 text-right">{cat.avgScore}</span>
                                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${cat.riskLevel === "Critical" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                            : cat.riskLevel === "Elevated" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                            }`}>
                                            {cat.riskLevel}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Issue Type Distribution */}
                    <div className="glass rounded-xl p-5">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
                            Issue Type Distribution
                        </h2>
                        <div className="space-y-3">
                            {stats.issueTypeAnalysis.map((type) => (
                                <div key={type.type} className="flex items-center justify-between group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-lg px-2 py-2 -mx-2 transition-colors">
                                    <div>
                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                            {ISSUE_TYPE_LABELS[type.type] || type.type}
                                        </span>
                                        <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">({type.count} issues)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Avg:</span>
                                        <span className={`text-sm font-bold ${type.avgScore >= 65 ? "text-red-700 dark:text-red-400"
                                            : type.avgScore >= 40 ? "text-amber-600 dark:text-amber-400"
                                                : "text-emerald-700 dark:text-emerald-400"
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
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 border-b border-slate-200 dark:border-slate-700/50 pb-2">
                        Top Priority Issues
                    </h2>
                    {criticalIssues.length === 0 ? (
                        <p className="text-sm text-slate-500">No critical issues currently active.</p>
                    ) : (
                        <div className="space-y-3">
                            {criticalIssues.map((issue, idx) => (
                                <div key={issue.id} className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-4 card-hover animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                                    <div className="flex items-start gap-3">
                                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white text-sm font-bold shrink-0 shadow-md">
                                            {issue.rank}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                                                    {issue.title}
                                                </h3>
                                                <span className="text-lg font-black text-red-600 dark:text-red-400 shrink-0">{issue.score}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {issue.region} · {issue.category} · {issue.daysPending}d pending · {issue.complaintsCount} complaints
                                            </p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
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
            <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-700/50">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-500 font-semibold">✦ Powered by Gemini AI + Priority Engine</span>
                    · {issues.length} issues analyzed · 7-factor scoring model
                </p>
            </div>
        </div>
    );
}
