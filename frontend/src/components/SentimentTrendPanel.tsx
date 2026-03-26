"use client";

import { useLiveStream } from "@/hooks/useLiveStream";
import { useRouter } from "next/navigation";

const TREND_COLORS: Record<string, string> = {
    rising: "text-red-500 dark:text-red-400",
    falling: "text-emerald-500 dark:text-emerald-400",
    stable: "text-slate-400 dark:text-slate-500",
};

const SEVERITY_BAR_COLORS: Record<number, string> = {
    5: "bg-red-500",
    4: "bg-orange-500",
    3: "bg-amber-500",
    2: "bg-emerald-400",
    1: "bg-emerald-300",
};

const SEVERITY_BG: Record<number, string> = {
    5: "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20",
    4: "border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20",
    3: "border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20",
    2: "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20",
    1: "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20",
};

export default function SentimentTrendPanel() {
    const { zoneSentimentTrends, globalSentiment, isConnected } = useLiveStream();
    const router = useRouter();

    // Find if any zone has a spike
    const spikeZone = zoneSentimentTrends.find(
        (z) => z.trend === "rising" && z.changePercent >= 10
    );

    return (
        <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                <div className="flex items-center gap-2">
                    <span className="text-base">🧠</span>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                        NLP Sentiment Analysis
                    </h3>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">|</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        Real-time public anger detection
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span
                        className={`w-1.5 h-1.5 rounded-full ${
                            isConnected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                        }`}
                    />
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {isConnected ? "LIVE NLP" : "Connecting..."}
                    </span>
                </div>
            </div>

            {/* Sentiment Spike Alert */}
            {spikeZone && (
                <div className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 dark:from-red-800 dark:to-red-700 animate-pulse">
                    <div className="flex items-center gap-2">
                        <span className="text-white text-sm">🚨</span>
                        <p className="text-sm font-bold text-white">
                            Sentiment Spike Detected:
                        </p>
                        <p className="text-sm text-red-100">
                            Public anger is rising in {spikeZone.zone} (+
                            {spikeZone.changePercent}% this hour)
                        </p>
                    </div>
                </div>
            )}

            {/* Global Overview Bar */}
            {globalSentiment && globalSentiment.totalDataPoints > 0 && (
                <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">
                            Overall Public Sentiment
                        </p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-white">
                                {globalSentiment.label}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                                (Avg severity: {globalSentiment.avgSeverity}/5)
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                            Data Points
                        </p>
                        <p className="text-xs text-emerald-400 font-bold">
                            {globalSentiment.totalDataPoints} analyzed
                        </p>
                    </div>
                </div>
            )}

            {/* Zone Sentiment Cards */}
            <div className="p-4">
                {zoneSentimentTrends.length === 0 ? (
                    <div className="text-center py-6">
                        <p className="text-sm text-slate-400 dark:text-slate-500">
                            {isConnected
                                ? "Waiting for sentiment data from incoming grievances..."
                                : "Connecting to NLP analysis stream..."}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                            Sentiment trends populate as new complaints arrive
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {zoneSentimentTrends.map((zone) => {
                            const roundedSev = Math.round(zone.avgSeverity) || 1;
                            const barWidth = zone.dataPoints > 0
                                ? Math.min((zone.avgSeverity / 5) * 100, 100)
                                : 0;

                            return (
                                <div
                                    key={zone.zone}
                                    onClick={() => router.push(`/dashboard/zone/${encodeURIComponent(zone.zone)}`)}
                                    className={`rounded-md border p-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group ${
                                        SEVERITY_BG[roundedSev] || SEVERITY_BG[1]
                                    }`}
                                >
                                    {/* Zone Name + Emoji */}
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider truncate">
                                            {zone.zone.replace(" Delhi", "")}
                                        </span>
                                        <span className="text-lg" title={zone.label}>
                                            {zone.emoji}
                                        </span>
                                    </div>

                                    {/* Severity Bar */}
                                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                                                SEVERITY_BAR_COLORS[roundedSev] || "bg-slate-300"
                                            }`}
                                            style={{ width: `${barWidth}%` }}
                                        />
                                    </div>

                                    {/* Label + Trend */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                            {zone.dataPoints > 0 ? zone.label : "No data"}
                                        </span>
                                        {zone.dataPoints > 0 && (
                                            <span
                                                className={`text-xs font-bold ${
                                                    TREND_COLORS[zone.trend] || TREND_COLORS.stable
                                                }`}
                                            >
                                                {zone.trendArrow}{" "}
                                                {zone.changePercent !== 0
                                                    ? `${zone.changePercent > 0 ? "+" : ""}${zone.changePercent}%`
                                                    : ""}
                                            </span>
                                        )}
                                    </div>

                                    {/* Data point count + View Report */}
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-[9px] text-slate-400 dark:text-slate-500">
                                            {zone.dataPoints} complaint{zone.dataPoints !== 1 ? "s" : ""} analyzed
                                        </p>
                                        <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                                            View Report →
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center uppercase tracking-wider">
                    AFINN-based NLP Engine · Real-time sentiment scoring · Zone-level trend detection · Auto-refresh on new complaints
                </p>
            </div>
        </div>
    );
}
