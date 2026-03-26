"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// ─── Types ───

interface ZoneSummary {
    totalIssues: number;
    criticalCount: number;
    attentionCount: number;
    stableCount: number;
    avgScore: number;
    maxScore: number;
    lifeSafetyCount: number;
    highEscalationCount: number;
}

interface ZoneSentimentData {
    zone: {
        zone: string;
        avgSeverity: number;
        avgComparative: number;
        trend: string;
        trendArrow: string;
        changePercent: number;
        dataPoints: number;
        label: string;
        emoji: string;
    } | null;
    breakdown: Record<string, number>;
    topKeywords: { word: string; count: number }[];
}

interface ZoneIssue {
    id: string;
    title: string;
    description: string;
    region: string;
    category: string;
    issueType: string;
    label: string;
    score: number;
    rank: number;
    complaintsCount: number;
    daysPending: number;
    escalationRisk: number;
    sentimentSeverity: number;
    explanation: string;
    aiReasoning: string;
}

interface ZoneCommitment {
    id: string;
    title: string;
    status: string;
    daysPending: number;
    delaySeverity: string;
}

interface ZoneConclusion {
    type: string;
    text: string;
}

interface ZoneData {
    zone: string;
    summary: ZoneSummary;
    sentiment: ZoneSentimentData;
    issues: ZoneIssue[];
    commitments: ZoneCommitment[];
    conclusions: ZoneConclusion[];
    generatedAt: string;
}

// ─── Helpers ───

const ISSUE_TYPE_LABELS: Record<string, string> = {
    "life-safety": "Life-Safety",
    "essential-service": "Essential Service",
    infrastructure: "Infrastructure",
    amenity: "Amenity",
};

const ISSUE_TYPE_COLORS: Record<string, string> = {
    "life-safety": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    "essential-service": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    infrastructure: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    amenity: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const LABEL_COLORS: Record<string, string> = {
    Critical: "bg-red-600 text-white",
    "Attention Required": "bg-amber-500 text-white",
    Stable: "bg-emerald-600 text-white",
};

const CONCLUSION_STYLES: Record<string, { border: string; bg: string; icon: string }> = {
    critical: { border: "border-red-500", bg: "bg-red-50 dark:bg-red-950/20", icon: "🚨" },
    warning: { border: "border-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", icon: "⚠️" },
    info: { border: "border-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20", icon: "ℹ️" },
    stable: { border: "border-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20", icon: "✅" },
    recommendation: { border: "border-purple-500", bg: "bg-purple-50 dark:bg-purple-950/20", icon: "💡" },
};

const SEVERITY_BAR_COLORS: Record<number, string> = {
    5: "bg-red-500", 4: "bg-orange-500", 3: "bg-amber-500", 2: "bg-emerald-400", 1: "bg-emerald-300",
};

// ─── Component ───

export default function ZoneIntelligencePage() {
    const params = useParams();
    const router = useRouter();
    const zoneName = decodeURIComponent(params.zoneName as string);

    const [data, setData] = useState<ZoneData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchZoneData() {
            try {
                const token = localStorage.getItem("token") || "";
                const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
                const res = await fetch(
                    `${API_BASE_URL}/api/zones/${encodeURIComponent(zoneName)}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!res.ok) throw new Error("Failed to load zone data");
                const json = await res.json();
                setData(json);
            } catch {
                setError("Unable to load zone intelligence.");
            } finally {
                setLoading(false);
            }
        }
        if (zoneName) fetchZoneData();
    }, [zoneName]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mb-3" />
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
                        Loading Zone Intelligence...
                    </p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-4 border border-red-200 bg-red-50 rounded-md">
                <h3 className="text-sm font-semibold text-red-900 uppercase">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error || "Zone data unavailable."}</p>
            </div>
        );
    }

    const { summary, sentiment, issues, commitments, conclusions } = data;
    const sentimentZone = sentiment.zone;

    return (
        <div className="space-y-6 pb-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
                <button
                    onClick={() => router.push("/dashboard")}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors font-medium"
                >
                    ← Dashboard
                </button>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="text-slate-700 dark:text-slate-200 font-semibold">{zoneName}</span>
            </div>

            {/* ═══════════════ HERO SECTION ═══════════════ */}
            <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* Zone Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                                Zone Intelligence Report
                            </p>
                            <h1 className="text-3xl font-black text-white">{zoneName}</h1>
                            <p className="text-sm text-slate-400 mt-1">
                                AI-generated governance analysis · {new Date(data.generatedAt).toLocaleString()}
                            </p>
                        </div>
                        {sentimentZone && sentimentZone.dataPoints > 0 && (
                            <div className="text-right">
                                <span className="text-4xl">{sentimentZone.emoji}</span>
                                <p className="text-sm font-bold text-white mt-1">{sentimentZone.label}</p>
                                <p className={`text-xs font-semibold ${
                                    sentimentZone.trend === "rising" ? "text-red-400" :
                                    sentimentZone.trend === "falling" ? "text-emerald-400" :
                                    "text-slate-400"
                                }`}>
                                    {sentimentZone.trendArrow} {sentimentZone.changePercent !== 0
                                        ? `${sentimentZone.changePercent > 0 ? "+" : ""}${sentimentZone.changePercent}% this hour`
                                        : "Stable"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Summary Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {[
                        { label: "Total Issues", value: summary.totalIssues, color: "text-slate-800 dark:text-slate-100" },
                        { label: "Critical", value: summary.criticalCount, color: "text-red-600 dark:text-red-400" },
                        { label: "Attention", value: summary.attentionCount, color: "text-amber-600 dark:text-amber-400" },
                        { label: "Stable", value: summary.stableCount, color: "text-emerald-600 dark:text-emerald-400" },
                        { label: "Avg Score", value: summary.avgScore, color: "text-slate-800 dark:text-slate-100" },
                        { label: "Max Score", value: summary.maxScore, color: "text-red-600 dark:text-red-400" },
                        { label: "Life-Safety", value: summary.lifeSafetyCount, color: "text-red-700 dark:text-red-400" },
                        { label: "High Escalation", value: summary.highEscalationCount, color: "text-amber-600 dark:text-amber-400" },
                    ].map((stat) => (
                        <div key={stat.label} className="px-3 py-3 text-center">
                            <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{stat.label}</p>
                            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══════════════ AI CONCLUSIONS ═══════════════ */}
            <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                    🧠 AI Conclusions & Recommendations
                </h2>
                <div className="space-y-3">
                    {conclusions.map((c, idx) => {
                        const style = CONCLUSION_STYLES[c.type] || CONCLUSION_STYLES.info;
                        return (
                            <div
                                key={idx}
                                className={`border-l-4 ${style.border} ${style.bg} px-4 py-3 rounded-r-md`}
                            >
                                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                                    <span className="mr-1.5">{style.icon}</span>
                                    {c.text}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══════════════ SENTIMENT DEEP DIVE ═══════════════ */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Sentiment Breakdown */}
                <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                        📊 Sentiment Severity Distribution
                    </h2>
                    <div className="space-y-3">
                        {[
                            { level: 5, label: "Outraged", emoji: "🔴" },
                            { level: 4, label: "Angry", emoji: "😡" },
                            { level: 3, label: "Frustrated", emoji: "😠" },
                            { level: 2, label: "Concerned", emoji: "😐" },
                            { level: 1, label: "Neutral", emoji: "😊" },
                        ].map(({ level, label, emoji }) => {
                            const count = sentiment.breakdown[level] || 0;
                            const total = Object.values(sentiment.breakdown).reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;

                            return (
                                <div key={level} className="flex items-center gap-3">
                                    <span className="text-sm w-5">{emoji}</span>
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-20">{label}</span>
                                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${SEVERITY_BAR_COLORS[level]}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-12 text-right">
                                        {count} ({pct}%)
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Anger Keywords */}
                <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                        🔥 Top Anger Keywords (NLP)
                    </h2>
                    {sentiment.topKeywords.length === 0 ? (
                        <p className="text-sm text-slate-400 dark:text-slate-500">
                            No keyword data available yet.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {sentiment.topKeywords.map((kw, idx) => {
                                const intensity = Math.min(kw.count, 5);
                                const sizeClass = intensity >= 4 ? "text-lg px-3 py-1.5" :
                                    intensity >= 2 ? "text-sm px-2 py-1" : "text-xs px-2 py-0.5";
                                const colorClass = intensity >= 4
                                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800"
                                    : intensity >= 2
                                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";

                                return (
                                    <span
                                        key={idx}
                                        className={`inline-flex items-center gap-1 rounded-md border font-semibold ${sizeClass} ${colorClass}`}
                                    >
                                        {kw.word}
                                        <span className="opacity-50 font-normal">×{kw.count}</span>
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════ ISSUES TABLE ═══════════════ */}
            <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                        📋 All Issues in {zoneName} — Ranked by AI Priority
                    </h2>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
                    {issues.length === 0 ? (
                        <div className="px-5 py-8 text-center">
                            <p className="text-sm text-slate-400 dark:text-slate-500">
                                No issues tracked in this zone.
                            </p>
                        </div>
                    ) : (
                        issues.map((issue) => (
                            <div
                                key={issue.id}
                                className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    {/* Rank badge */}
                                    <div className={`shrink-0 w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold ${
                                        LABEL_COLORS[issue.label] || "bg-slate-200 text-slate-700"
                                    }`}>
                                        {issue.score}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                                                #{issue.rank} · {issue.title}
                                            </h4>
                                        </div>

                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                                {issue.region}
                                            </span>
                                            <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                                ISSUE_TYPE_COLORS[issue.issueType] || "bg-slate-100 text-slate-600"
                                            }`}>
                                                {ISSUE_TYPE_LABELS[issue.issueType] || issue.issueType}
                                            </span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                {issue.complaintsCount} complaints
                                            </span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                {issue.daysPending}d pending
                                            </span>
                                            {issue.escalationRisk >= 4 && (
                                                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                                                    ⚡ High Escalation
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed line-clamp-2">
                                            {issue.explanation}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ═══════════════ COMMITMENTS ═══════════════ */}
            {commitments.length > 0 && (
                <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                        📌 Linked Government Commitments
                    </h2>
                    <div className="space-y-3">
                        {commitments.map((c) => (
                            <div key={c.id} className="flex items-center justify-between">
                                <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 mr-4 truncate">
                                    {c.title}
                                </span>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className={`text-xs font-semibold ${
                                        c.daysPending >= 180 ? "text-red-600 dark:text-red-400" :
                                        c.daysPending >= 90 ? "text-amber-600 dark:text-amber-400" :
                                        "text-slate-500 dark:text-slate-400"
                                    }`}>
                                        {c.daysPending}d
                                    </span>
                                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                        c.status === "stalled" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" :
                                        c.status === "delayed" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
                                        c.status === "not-started" ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" :
                                        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                    }`}>
                                        {c.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Zone Intelligence Report · Powered by AI Priority Engine + NLP Sentiment Analysis · Auto-generated at {new Date(data.generatedAt).toLocaleTimeString()}
                </p>
            </div>
        </div>
    );
}
