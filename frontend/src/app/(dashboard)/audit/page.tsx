"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    Shield,
    Activity,
    Users,
    Clock,
    Filter,
    RefreshCw,
    ChevronDown,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface AuditEntry {
    id: string;
    userId: string;
    userName: string;
    role: string;
    action: string;
    timestamp: string;
    ip: string;
}

// Pretty labels for action types
const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    VIEW_ISSUES: { label: "Viewed Issues", color: "bg-blue-100 text-blue-700" },
    VIEW_STATISTICS: { label: "Viewed Statistics", color: "bg-indigo-100 text-indigo-700" },
    VIEW_COMMITMENTS: { label: "Viewed Commitments", color: "bg-amber-100 text-amber-700" },
    VIEW_BRIEF: { label: "Viewed Brief", color: "bg-purple-100 text-purple-700" },
    VIEW_AUDIT_LOGS: { label: "Viewed Audit Logs", color: "bg-slate-100 text-slate-700" },
    ASK_QUERY: { label: "AI Query", color: "bg-emerald-100 text-emerald-700" },
};

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
    admin: { label: "Admin", color: "bg-red-100 text-red-700 border-red-200" },
    officer: { label: "Officer", color: "bg-blue-100 text-blue-700 border-blue-200" },
    leader: { label: "Leader", color: "bg-amber-100 text-amber-700 border-amber-200" },
};

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [actionFilter, setActionFilter] = useState("ALL");
    const [userFilter, setUserFilter] = useState("ALL");

    async function fetchLogs() {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("token") || "";
            const res = await fetch(`${API_BASE_URL}/api/audit`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to fetch audit logs");
                return;
            }
            const data = await res.json();
            setLogs(data.logs || []);
        } catch {
            setError("Network error fetching audit logs");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchLogs();
    }, []);

    // Derived data
    const uniqueActions = useMemo(() => [...new Set(logs.map((l) => l.action))], [logs]);
    const uniqueUsers = useMemo(() => {
        const map = new Map<string, string>();
        logs.forEach((l) => map.set(l.userId, l.userName || l.userId));
        return Array.from(map.entries()); // [userId, userName]
    }, [logs]);

    const filtered = useMemo(() => {
        return logs
            .filter((l) => actionFilter === "ALL" || l.action === actionFilter)
            .filter((l) => userFilter === "ALL" || l.userId === userFilter)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [logs, actionFilter, userFilter]);

    // Stats
    const totalActions = logs.length;
    const uniqueUserCount = new Set(logs.map((l) => l.userId)).size;
    const mostFrequentAction = useMemo(() => {
        const counts: Record<string, number> = {};
        logs.forEach((l) => { counts[l.action] = (counts[l.action] || 0) + 1; });
        let max = "";
        let maxCount = 0;
        for (const [action, count] of Object.entries(counts)) {
            if (count > maxCount) { max = action; maxCount = count; }
        }
        return { action: max, count: maxCount };
    }, [logs]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex items-center gap-3 text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading audit logs…</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Card className="max-w-md">
                    <CardContent className="p-6 text-center">
                        <Shield className="h-10 w-10 mx-auto mb-3 text-red-400" />
                        <h2 className="text-lg font-semibold text-slate-800 mb-1">Access Denied</h2>
                        <p className="text-sm text-slate-500">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 uppercase flex items-center gap-3">
                    <Shield className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                    Audit Trail
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Transparent record of every action taken in the system — accountability at every level.
                </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    icon={<Activity className="h-5 w-5 text-blue-500" />}
                    label="Total Actions"
                    value={totalActions}
                    sub="all recorded events"
                    bg="bg-blue-50"
                />
                <StatCard
                    icon={<Users className="h-5 w-5 text-emerald-500" />}
                    label="Active Users"
                    value={uniqueUserCount}
                    sub="unique users in log"
                    bg="bg-emerald-50"
                />
                <StatCard
                    icon={<Clock className="h-5 w-5 text-amber-500" />}
                    label="Most Frequent"
                    value={ACTION_LABELS[mostFrequentAction.action]?.label || mostFrequentAction.action || "—"}
                    sub={mostFrequentAction.count > 0 ? `${mostFrequentAction.count} occurrences` : "no actions yet"}
                    bg="bg-amber-50"
                    isText
                />
            </div>

            {/* Filters + Table */}
            <Card className="rounded-sm border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
                {/* Filter Bar */}
                <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <Filter className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Filters</span>
                    </div>

                    <SelectFilter
                        label="Action"
                        value={actionFilter}
                        onChange={setActionFilter}
                        options={[
                            { value: "ALL", label: "All Actions" },
                            ...uniqueActions.map((a) => ({
                                value: a,
                                label: ACTION_LABELS[a]?.label || a,
                            })),
                        ]}
                    />

                    <SelectFilter
                        label="User"
                        value={userFilter}
                        onChange={setUserFilter}
                        options={[
                            { value: "ALL", label: "All Users" },
                            ...uniqueUsers.map(([id, name]) => ({
                                value: id,
                                label: name,
                            })),
                        ]}
                    />

                    <button
                        onClick={fetchLogs}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-900 text-white">
                                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider">Timestamp</th>
                                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider">User</th>
                                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider">Role</th>
                                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider">Action</th>
                                <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                                        No audit logs match the current filters.
                                    </td>
                                </tr>
                            )}
                            {filtered.map((entry, idx) => {
                                const actionInfo = ACTION_LABELS[entry.action] || { label: entry.action, color: "bg-slate-100 text-slate-600" };
                                const roleInfo = ROLE_BADGES[entry.role] || { label: entry.role, color: "bg-slate-100 text-slate-600 border-slate-200" };
                                const rowBg = idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/30";

                                return (
                                    <tr key={entry.id} className={`${rowBg} hover:bg-slate-100/50 dark:hover:bg-slate-800/60 transition-colors`}>
                                        <td className="px-5 py-3">
                                            <div className="font-mono text-xs text-slate-600 dark:text-slate-400">
                                                {new Date(entry.timestamp).toLocaleDateString("en-IN", {
                                                    day: "2-digit", month: "short", year: "numeric",
                                                })}
                                            </div>
                                            <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                                {new Date(entry.timestamp).toLocaleTimeString("en-IN", {
                                                    hour: "2-digit", minute: "2-digit", second: "2-digit",
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{entry.userName || entry.userId}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${roleInfo.color}`}>
                                                {roleInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`inline-flex px-2.5 py-1 rounded-sm text-[11px] font-semibold ${actionInfo.color}`}>
                                                {actionInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="font-mono text-xs text-slate-500">{entry.ip || "—"}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-5 py-2.5 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                        Showing {filtered.length} of {logs.length} entries
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <Shield className="h-3 w-3" />
                        Immutable Governance Record
                    </span>
                </div>
            </Card>
        </div>
    );
}

function StatCard({ icon, label, value, sub, bg, isText }: {
    icon: React.ReactNode; label: string; value: number | string; sub: string; bg: string; isText?: boolean;
}) {
    return (
        <Card className="rounded-sm border border-slate-200/60 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="p-5 flex items-start gap-4">
                <div className={`p-2.5 rounded-sm ${bg}`}>{icon}</div>
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
                    <p className={`${isText ? "text-base" : "text-2xl"} font-bold text-slate-900 dark:text-slate-100 tracking-tight`}>{value}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function SelectFilter({ label, value, onChange, options }: {
    label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md pl-3 pr-8 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 transition-colors"
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>
    );
}
