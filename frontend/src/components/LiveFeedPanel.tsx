"use client";

import { useLiveStream } from "@/hooks/useLiveStream";
import { useEffect, useState } from "react";

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

const ISSUE_TYPE_LABELS: Record<string, string> = {
    "life-safety": "Life-Safety",
    "essential-service": "Essential Svc",
    infrastructure: "Infrastructure",
    amenity: "Amenity",
};

interface LiveFeedPanelProps {
    onNewGrievance?: () => void;
}

export default function LiveFeedPanel({ onNewGrievance }: LiveFeedPanelProps) {
    const { updates, totalCount, isConnected, messageRate } = useLiveStream();
    const [displayCount, setDisplayCount] = useState(0);
    const [isAnimatingCount, setIsAnimatingCount] = useState(false);

    // Animate the counter
    useEffect(() => {
        if (totalCount > displayCount) {
            setIsAnimatingCount(true);
            const timer = setTimeout(() => {
                setDisplayCount(totalCount);
                setIsAnimatingCount(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [totalCount, displayCount]);

    // Notify parent when new grievance arrives
    useEffect(() => {
        if (updates.length > 0 && onNewGrievance) {
            onNewGrievance();
        }
    }, [updates.length, onNewGrievance]);

    return (
        <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                <div className="flex items-center gap-2">
                    {/* LIVE indicator */}
                    <div className="flex items-center gap-1.5">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                            isConnected
                                ? "bg-red-500 animate-live-pulse"
                                : "bg-slate-400"
                        }`} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
                            Live
                        </span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">|</span>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                        Real-Time Grievance Feed
                    </h3>
                </div>

                <div className="flex items-center gap-3">
                    {/* Message rate */}
                    {messageRate > 0 && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            {messageRate} msg/min
                        </span>
                    )}

                    {/* Connection status */}
                    <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                            isConnected
                                ? "bg-emerald-500"
                                : "bg-amber-500 animate-pulse"
                        }`} />
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            {isConnected ? "Connected" : "Reconnecting..."}
                        </span>
                    </div>
                </div>
            </div>

            {/* Live Counter */}
            <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">
                        Grievances Analyzed (Last 24h)
                    </p>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-black text-white tabular-nums transition-transform duration-300 ${
                            isAnimatingCount ? "scale-110 text-emerald-400" : "scale-100"
                        }`}>
                            {displayCount.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">issues</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Source</p>
                    <p className="text-xs text-emerald-400 font-bold">CPGRAMS Live Portal</p>
                </div>
            </div>

            {/* Feed Items */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[320px] overflow-y-auto">
                {updates.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                        <p className="text-sm text-slate-400 dark:text-slate-500">
                            {isConnected
                                ? "Waiting for incoming grievances..."
                                : "Connecting to live feed..."
                            }
                        </p>
                        {isConnected && (
                            <p className="text-[10px] text-slate-400 mt-1">
                                New issues appear every 15–30 seconds
                            </p>
                        )}
                    </div>
                ) : (
                    updates.map((item, idx) => (
                        <div
                            key={item.id}
                            className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                                idx === 0 ? "animate-feed-slide-in" : ""
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Score badge */}
                                <div className={`shrink-0 w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold ${
                                    LABEL_COLORS[item.label] || "bg-slate-200 text-slate-700"
                                }`}>
                                    {item.score}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight line-clamp-1">
                                            {item.title}
                                        </h4>
                                        {idx === 0 && (
                                            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded animate-pulse-glow">
                                                NEW
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                            {item.region}
                                        </span>
                                        <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                            ISSUE_TYPE_COLORS[item.issueType] || "bg-slate-100 text-slate-600"
                                        }`}>
                                            {ISSUE_TYPE_LABELS[item.issueType] || item.issueType}
                                        </span>
                                        {item.escalationRisk >= 4 && (
                                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                                                ⚡ High Escalation
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                                        <span>{item.complaintsCount} complaints</span>
                                        <span>{item.daysPending}d pending</span>
                                        {item.nlpSentiment && (
                                            <span className={`font-semibold flex items-center gap-0.5 ${
                                                item.nlpSentiment.severity >= 4 ? "text-red-500" :
                                                item.nlpSentiment.severity >= 3 ? "text-amber-500" :
                                                "text-emerald-500"
                                            }`}>
                                                <span>{item.nlpSentiment.emoji}</span>
                                                <span>{item.nlpSentiment.label}</span>
                                            </span>
                                        )}
                                        <span className={`font-semibold ${
                                            item.label === "Critical" ? "text-red-500" :
                                            item.label === "Attention Required" ? "text-amber-500" :
                                            "text-emerald-500"
                                        }`}>
                                            {item.label}
                                        </span>
                                    </div>
                                    {/* NLP Keywords */}
                                    {item.nlpSentiment && item.nlpSentiment.keywords && item.nlpSentiment.keywords.length > 0 && (
                                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                            <span className="text-[9px] text-slate-400 dark:text-slate-500">NLP:</span>
                                            {item.nlpSentiment.keywords.slice(0, 3).map((kw, kwIdx) => (
                                                <span
                                                    key={kwIdx}
                                                    className="text-[9px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1 py-0.5 rounded"
                                                >
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center uppercase tracking-wider">
                    CPGRAMS Aggregation Layer · Pattern detection across citizen complaints · Auto-scored by AI Priority Engine
                </p>
            </div>
        </div>
    );
}
