"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, AlertOctagon, CheckCircle2, Clock, PlusCircle, TrendingDown, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";

interface ScoreChange {
    id: string;
    title: string;
    region: string;
    oldScore: number;
    newScore: number;
    delta: number;
}

interface NewIssue {
    id: string;
    title: string;
    region: string;
    score: number;
    label: string;
}

interface ResolvedIssue {
    id: string;
    title: string;
    region: string;
    lastScore: number;
}

interface ChangeReport {
    daysAway: number;
    newCritical: ScoreChange[];
    deescalated: ScoreChange[];
    scoreChanges: ScoreChange[];
    resolved: ResolvedIssue[];
    newIssues: NewIssue[];
    summary: string;
    noChanges?: boolean;
}

const API = "http://localhost:4000";

export function ChangesPanel() {
    const [report, setReport] = useState<ChangeReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        async function loadChanges() {
            try {
                const token = localStorage.getItem("token") || "";
                const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

                // Step 1: Record this login and get days since last login
                const loginRes = await fetch(`${API}/api/simulation/record-login`, {
                    method: "POST", headers,
                });
                if (!loginRes.ok) { setLoading(false); return; }
                const { daysAway } = await loginRes.json();

                if (daysAway <= 0) { setLoading(false); return; }

                // Step 2: Get the change report for those days
                const changesRes = await fetch(`${API}/api/simulation/changes?daysAway=${daysAway}`, { headers });
                if (!changesRes.ok) { setLoading(false); return; }
                const data = await changesRes.json();
                setReport(data);
            } catch {
                // Silently fail
            } finally {
                setLoading(false);
            }
        }
        loadChanges();
    }, []);

    // Also show if noChanges = true, just with 0s, since user requested it always be visible
    if (loading || !report) return null;

    return (
        <Card className="rounded-sm border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col transition-all duration-300">
            {/* Header / Toggle */}
            <div
                className="bg-slate-900 px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                    <h2 className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-400" />
                        Executive Intelligence Brief
                    </h2>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-medium text-slate-300">
                            Since Last Login ({report.daysAway} day{report.daysAway !== 1 ? 's' : ''})
                        </span>
                    </div>
                    <div className="text-slate-400 bg-slate-800/50 p-1.5 rounded-full border border-slate-700">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                </div>
            </div>

            {isExpanded && (
                <CardContent className="p-6 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
                    {/* Metrics Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <StatCard
                            title="Escalated (Critical)"
                            value={report.newCritical.length}
                            icon={<AlertOctagon className="h-4 w-4 text-red-500" />}
                            colorClass="bg-white dark:bg-slate-900 border text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50 shadow-sm"
                            bgColor="bg-red-50 dark:bg-red-950/30"
                        />
                        <StatCard
                            title="New Issues"
                            value={report.newIssues.length}
                            icon={<PlusCircle className="h-4 w-4 text-blue-500" />}
                            colorClass="bg-white dark:bg-slate-900 border text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/50 shadow-sm"
                            bgColor="bg-blue-50 dark:bg-blue-950/30"
                        />
                        <StatCard
                            title="Resolved"
                            value={report.resolved.length}
                            icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                            colorClass="bg-white dark:bg-slate-900 border text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50 shadow-sm"
                            bgColor="bg-emerald-50 dark:bg-emerald-950/30"
                        />
                        <StatCard
                            title="De-escalated"
                            value={report.deescalated.length}
                            icon={<TrendingDown className="h-4 w-4 text-teal-500" />}
                            colorClass="bg-white dark:bg-slate-900 border text-teal-700 dark:text-teal-400 border-teal-100 dark:border-teal-900/50 shadow-sm"
                            bgColor="bg-teal-50 dark:bg-teal-950/30"
                        />
                    </div>

                    {/* Details Grid */}
                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* Left Column */}
                        <div className="space-y-6">
                            {report.newCritical.length > 0 && (
                                <ListSection title="Newly Critical" icon={<AlertOctagon className="w-4 h-4 text-red-500" />}>
                                    {report.newCritical.map(item => <ItemChangeCard key={item.id} item={item} variant="critical" />)}
                                </ListSection>
                            )}
                            {report.newIssues.length > 0 && (
                                <ListSection title="New Issues Detected" icon={<PlusCircle className="w-4 h-4 text-blue-500" />}>
                                    {report.newIssues.map(item => <NewItemCard key={item.id} item={item} />)}
                                </ListSection>
                            )}
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            {report.scoreChanges.length > 0 && (
                                <ListSection title="Significant Score Shifts" icon={<TrendingUp className="w-4 h-4 text-amber-500" />}>
                                    {report.scoreChanges.slice(0, 4).map(item => <ItemChangeCard key={item.id} item={item} variant="shift" />)}
                                </ListSection>
                            )}
                            {report.resolved.length > 0 && (
                                <ListSection title="Recently Resolved" icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}>
                                    {report.resolved.slice(0, 3).map(item => <ResolvedItemCard key={item.id} item={item} />)}
                                </ListSection>
                            )}
                            {/* Fallback if right column is too empty */}
                            {report.scoreChanges.length === 0 && report.resolved.length === 0 && (
                                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 rounded-lg text-slate-400">
                                    <Activity className="w-8 h-8 mb-2 opacity-50" />
                                    <p className="text-xs">No significant positive momentum.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

function StatCard({ title, value, icon, colorClass, bgColor }: { title: string, value: number, icon: React.ReactNode, colorClass: string, bgColor: string }) {
    return (
        <div className={`p-4 rounded-sm flex flex-col justify-between ${colorClass}`}>
            <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 rounded-md ${bgColor}`}>
                    {icon}
                </div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
            </div>
            <div className="text-3xl font-bold tracking-tight">
                {value}
            </div>
        </div>
    );
}

function ListSection({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3 px-1">
                {icon}
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{title}</h3>
            </div>
            <div className="space-y-2">
                {children}
            </div>
        </div>
    );
}

function ItemChangeCard({ item, variant }: { item: ScoreChange; variant: "critical" | "deescalated" | "shift" }) {
    const isCritical = variant === "critical";
    const bgClass = isCritical ? "bg-red-50/30 dark:bg-red-950/20 border-red-100 dark:border-red-900/40 hover:bg-red-50/60 dark:hover:bg-red-900/30"
        : variant === "deescalated" ? "bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/30"
            : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800";

    const deltaColor = item.delta > 0 ? "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50" : "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50";
    const deltaArrow = item.delta > 0 ? "↑" : "↓";

    return (
        <div className={`group flex flex-col px-4 py-3 rounded-sm border transition-colors ${bgClass}`}>
            <div className="flex items-start justify-between gap-3 mb-1">
                <p className={`text-sm font-medium leading-snug line-clamp-2 ${isCritical ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                    {item.title}
                </p>
                <div className="shrink-0 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-slate-400 font-mono">{item.oldScore}</span>
                        <span className="text-xs text-slate-400">→</span>
                    </div>
                    <span className={`text-base font-bold font-mono ${item.newScore > 55 ? "text-red-600 dark:text-red-400" : item.newScore >= 45 ? "text-amber-600 dark:text-amber-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {item.newScore}
                    </span>
                </div>
            </div>
            <div className="flex items-center justify-between mt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                    {item.region}
                </span>
                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-sm flex items-center gap-0.5 ${deltaColor}`}>
                    {deltaArrow}{Math.abs(item.delta).toFixed(0)}
                </span>
            </div>
        </div>
    );
}

function NewItemCard({ item }: { item: NewIssue }) {
    return (
        <div className="flex flex-col px-4 py-3 rounded-sm border border-blue-100 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 hover:bg-blue-50/60 dark:hover:bg-blue-900/30 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">{item.title}</p>
                <span className={`shrink-0 text-base font-bold font-mono ${item.label === "Critical" ? "text-red-600 dark:text-red-400" : item.label === "Attention Required" ? "text-amber-600 dark:text-amber-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {item.score}
                </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-300 dark:bg-blue-700"></span>
                {item.region}
            </span>
        </div>
    );
}

function ResolvedItemCard({ item }: { item: ResolvedIssue }) {
    return (
        <div className="flex items-center justify-between px-4 py-3 rounded-sm border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="min-w-0 pr-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 line-through truncate">{item.title}</p>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">{item.region}</span>
            </div>
            <CheckCircle2 className="shrink-0 w-4 h-4 text-emerald-400 dark:text-emerald-500" />
        </div>
    );
}
