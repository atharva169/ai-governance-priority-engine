"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

interface Commitment {
    id: string;
    title: string;
    department: string;
    status: "Delayed" | "On Track" | "Completed" | "At Risk";
    daysPending: number;
    grievanceIds?: string[];
    linkedGrievanceIds?: string[];
}

export default function CommitmentsPage() {
    const [commitments, setCommitments] = useState<Commitment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchCommitments() {
            try {
                const token = localStorage.getItem("token") || "";
                const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
                const response = await fetch(`${API_BASE_URL}/api/commitments`, {
                    headers: { "Authorization": `Bearer ${token}` },
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch commitments ledger.");
                }

                const data = await response.json();
                const safeCommitments = Array.isArray(data?.commitments) ? data.commitments : [];

                // Sort by daysPending descending
                const sorted = [...safeCommitments].sort((a, b) => b.daysPending - a.daysPending);
                setCommitments(sorted);
            } catch (err) {
                setError("Unable to retrieve commitments. System connection may be interrupted.");
            } finally {
                setLoading(false);
            }
        }

        fetchCommitments();
    }, []);

    const getDelaySeverity = (days: number) => {
        if (days > 180) return { label: "High", classes: "bg-red-100 text-red-800 border-red-200" };
        if (days >= 90) return { label: "Medium", classes: "bg-amber-100 text-amber-800 border-amber-200" };
        return { label: "Low", classes: "bg-slate-100 text-slate-800 border-slate-200" };
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "Delayed":
            case "At Risk":
                return "bg-amber-50 text-amber-700 border border-amber-200";
            case "Completed":
            case "On Track":
                return "bg-emerald-50 text-emerald-700 border border-emerald-200";
            default:
                return "bg-slate-50 text-slate-700 border border-slate-200";
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
                    Loading Ledger Data...
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
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                    Commitments Register
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Tracking fulfillment of institutional pledges, operational delays, and associated grievances.
                </p>
            </div>

            <div className="rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left align-middle">
                        <thead className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th scope="col" className="px-6 py-4 font-semibold">Commitment Title</th>
                                <th scope="col" className="px-6 py-4 font-semibold text-center">Status</th>
                                <th scope="col" className="px-6 py-4 font-semibold text-right">Days Pending</th>
                                <th scope="col" className="px-6 py-4 font-semibold text-center">Delay Risk</th>
                                <th scope="col" className="px-6 py-4 font-semibold">Linked Grievances</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {commitments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        No commitments recorded.
                                    </td>
                                </tr>
                            ) : (
                                commitments.map((commitment) => {
                                    const severity = getDelaySeverity(commitment.daysPending);
                                    return (
                                        <tr key={commitment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900 dark:text-slate-100">{commitment.title}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">{commitment.department}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide ${getStatusBadge(commitment.status)}`}>
                                                    {commitment.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">{commitment.daysPending}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm border text-xs font-semibold uppercase ${severity.classes}`}>
                                                    {severity.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const ids = commitment.linkedGrievanceIds || commitment.grievanceIds || [];
                                                    return ids.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5 border-l-2 border-blue-200 pl-3">
                                                            {ids.map((gId) => (
                                                                <Link
                                                                    key={gId}
                                                                    href={`/issues?highlight=${gId}`}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono tracking-tighter bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 hover:border-blue-300 transition-colors cursor-pointer group"
                                                                >
                                                                    {gId}
                                                                    <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic pl-3 border-l-2 border-transparent">None</span>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
