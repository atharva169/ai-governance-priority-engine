"use client";

import React, { useState } from "react";
import {
    X,
    Brain,
    Search,
    CheckCircle2,
    IndianRupee,
    Clock,
    Building2,
    Users,
    Sparkles,
    Loader2,
} from "lucide-react";

interface AISolution {
    rootCauseAnalysis: string;
    proposedSolution: string[];
    estimatedBudget: string;
    timeline: string;
    similarCases: string;
    stakeholders: string;
    source?: string;
}

interface AISolutionPanelProps {
    issueId: string;
    issueTitle: string;
    issueScore: number;
    onClose: () => void;
}

export default function AISolutionPanel({ issueId, issueTitle, issueScore, onClose }: AISolutionPanelProps) {
    const [solution, setSolution] = useState<AISolution | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasRequested, setHasRequested] = useState(false);

    const fetchSolution = async () => {
        setLoading(true);
        setError(null);
        setHasRequested(true);

        try {
            const token = localStorage.getItem("token") || "";
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
            const response = await fetch(`${API_BASE_URL}/api/ai-solution`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ issueId, issueTitle, issueScore }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate AI solution");
            }

            const data = await response.json();
            setSolution(data.solution);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch on mount
    React.useEffect(() => {
        fetchSolution();
    }, [issueId]);

    const sectionConfig = [
        { key: "rootCauseAnalysis", label: "Root Cause Analysis", icon: Search, gradient: "from-red-500 to-orange-500" },
        { key: "proposedSolution", label: "Proposed Solution", icon: CheckCircle2, gradient: "from-emerald-500 to-teal-500" },
        { key: "estimatedBudget", label: "Estimated Budget", icon: IndianRupee, gradient: "from-amber-500 to-yellow-500" },
        { key: "timeline", label: "Implementation Timeline", icon: Clock, gradient: "from-blue-500 to-indigo-500" },
        { key: "similarCases", label: "Similar Cases in India", icon: Building2, gradient: "from-purple-500 to-pink-500" },
        { key: "stakeholders", label: "Stakeholders to Involve", icon: Users, gradient: "from-cyan-500 to-blue-500" },
    ];

    return (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

            {/* Panel */}
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 animate-slide-in-right overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 px-6 py-5 border-b border-slate-700">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-400/30">
                                    <Sparkles className="h-3 w-3 text-violet-400" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">AI Analysis</span>
                                </div>
                                {solution?.source && (
                                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                                        {solution.source === "ai" ? "⚡ Live AI" : solution.source === "cache" ? "📦 Cached" : "🔄 Fallback"}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-base font-semibold text-white leading-tight truncate">{issueTitle}</h2>
                            <p className="text-xs text-slate-400 mt-1">Priority Score: <span className="text-white font-bold">{issueScore}/100</span></p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="relative">
                                <div className="h-12 w-12 rounded-full border-2 border-violet-200 dark:border-violet-800 border-t-violet-500 animate-spin" />
                                <Brain className="h-5 w-5 text-violet-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Analyzing Issue...</p>
                                <p className="text-xs text-slate-500 mt-1">AI Engine is generating a comprehensive solution</p>
                            </div>
                            {/* Shimmer lines */}
                            <div className="w-full space-y-3 mt-4">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="animate-shimmer rounded-lg" style={{ animationDelay: `${i * 0.15}s` }}>
                                        <div className="h-16 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-lg" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                            <button onClick={fetchSolution} className="mt-2 text-xs font-semibold text-red-600 hover:text-red-800 uppercase tracking-wider">
                                Retry →
                            </button>
                        </div>
                    )}

                    {solution && !loading && (
                        <div className="space-y-5">
                            {sectionConfig.map(({ key, label, icon: Icon, gradient }) => {
                                const value = solution[key as keyof AISolution];
                                if (!value) return null;

                                return (
                                    <div key={key} className="group rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 overflow-hidden hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 hover:shadow-md">
                                        {/* Section Header */}
                                        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/50">
                                            <div className={`p-1.5 rounded-lg bg-gradient-to-br ${gradient} text-white shadow-sm`}>
                                                <Icon className="h-3.5 w-3.5" />
                                            </div>
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{label}</h3>
                                        </div>

                                        {/* Section Content */}
                                        <div className="px-4 py-3">
                                            {key === "proposedSolution" && Array.isArray(value) ? (
                                                <ol className="space-y-2">
                                                    {(value as string[]).map((step, idx) => (
                                                        <li key={idx} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center mt-0.5 shadow-sm">
                                                                {idx + 1}
                                                            </span>
                                                            <span>{step}</span>
                                                        </li>
                                                    ))}
                                                </ol>
                                            ) : (
                                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{String(value)}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Powered by badge */}
                            <div className="flex items-center justify-center gap-2 pt-4 pb-2">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-700/50">
                                    <Sparkles className="h-3 w-3 text-violet-500" />
                                    <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">Powered by AI Engine</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
