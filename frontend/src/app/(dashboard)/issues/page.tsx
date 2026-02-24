"use client";

import React, { useEffect, useState } from "react";

interface Issue {
    id: string;
    title: string;
    region: string;
    label: "Critical" | "Attention Required" | "Stable";
    escalationRisk: number;
    explanation: string;
    score: number;
    daysPending: number;
}

export default function IssuesPage() {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function fetchIssues() {
            try {
                const userId = localStorage.getItem("userId") || "unknown";
                const response = await fetch("http://localhost:4000/api/issues", {
                    headers: { "x-user-id": userId },
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch system issues.");
                }

                const data = await response.json();
                const parsedIssues = Array.isArray(data?.issues) ? data.issues : [];

                // Sort by score descending
                const sortedIssues = [...parsedIssues].sort((a, b) => b.score - a.score);
                setIssues(sortedIssues);
            } catch (err) {
                setError("Unable to retrieve priority issues. The data service may be unavailable.");
            } finally {
                setLoading(false);
            }
        }

        fetchIssues();
    }, []);

    const toggleRow = (id: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const getBadgeStyle = (label: string) => {
        switch (label) {
            case "Critical":
                return "bg-red-100 text-red-800";
            case "Attention Required":
                return "bg-amber-100 text-amber-800";
            case "Stable":
                return "bg-emerald-100 text-emerald-800";
            default:
                return "bg-slate-100 text-slate-800";
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
                    Compiling Issue Manifest...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 border border-red-200 bg-red-50 rounded-sm">
                <h3 className="text-sm font-semibold text-red-900 uppercase tracking-wide">System Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 uppercase">
                    Priority Issues
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Cross-departmental flags requiring executive attention, sorted by algorithmic priority score.
                </p>
            </div>

            <div className="rounded-sm border border-slate-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-semibold">Priority</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Flagged Issue</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Jurisdiction</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Days Pending</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Escalation Risk</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {issues.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        No priority issues currently recorded in the active ledger.
                                    </td>
                                </tr>
                            ) : (
                                issues.map((issue) => (
                                    <React.Fragment key={issue.id}>
                                        <tr
                                            className={`hover:bg-slate-50 transition-colors cursor-pointer ${expandedRows.has(issue.id) ? "bg-slate-50" : ""}`}
                                            onClick={() => toggleRow(issue.id)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium uppercase ${getBadgeStyle(issue.label)}`}>
                                                    {issue.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                {issue.title}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 uppercase tracking-wide text-xs">
                                                {issue.region}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                                {issue.daysPending ?? 0}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-900 font-medium">{issue.escalationRisk}/10</span>
                                                    {issue.escalationRisk >= 4 && (
                                                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {expandedRows.has(issue.id) && (
                                            <tr className="bg-slate-50/50">
                                                <td colSpan={5} className="px-6 py-4 border-t border-slate-100">
                                                    <div className="pl-4 border-l-2 border-slate-300">
                                                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                                                            Why is this prioritized?
                                                        </h4>
                                                        <p className="text-slate-700 leading-relaxed max-w-4xl">
                                                            {issue.explanation}
                                                        </p>
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
