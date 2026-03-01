"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SUPPORTED_QUERIES = [
    "What needs urgent attention today?",
    "Which commitments are overdue?",
    "Which issues are likely to escalate?",
];

export default function AskPage() {
    const [selectedQuery, setSelectedQuery] = useState<string>(SUPPORTED_QUERIES[0]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isRestricted, setIsRestricted] = useState(false);
    const [hasQueried, setHasQueried] = useState(false);

    const handleQuery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQuery) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setIsRestricted(false);
        setHasQueried(true);

        try {
            const token = localStorage.getItem("token") || "";

            if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
              throw new Error("API base URL not configured");
            }
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
            const response = await fetch(`${API_BASE_URL}/api/ask`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ query: selectedQuery }),
            });

            if (response.status === 403) {
                setIsRestricted(true);
                return;
            }

            if (!response.ok) {
                throw new Error("Query execution failed. The data service may be temporarily unavailable.");
            }

            const data = await response.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred while processing the intelligence query.");
        } finally {
            setLoading(false);
        }
    };

    const renderResultContent = (data: any) => {
        if (!data) return null;

        if (Array.isArray(data)) {
            if (data.length === 0) {
                return <p className="text-sm text-slate-500 italic">No corresponding records found for this query.</p>;
            }
            return (
                <ul className="space-y-4">
                    {data.map((item, index) => (
                        <li key={index} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                            {typeof item === "object" ? (
                                <div className="space-y-1">
                                    {Object.entries(item).map(([key, value]) => (
                                        <div key={key} className="flex flex-col sm:flex-row sm:gap-4 md:items-baseline">
                                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 w-32 shrink-0">{key}:</span>
                                            <span className="text-sm text-slate-900 dark:text-slate-100">{String(value)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-sm text-slate-900 dark:text-slate-100">{String(item)}</span>
                            )}
                        </li>
                    ))}
                </ul>
            );
        }

        if (typeof data === "object") {
            // Specifically handle the "answer" / text string objects some backends return.
            if (data.answer) {
                return <p className="text-sm text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{data.answer}</p>;
            }

            return (
                <div className="space-y-6">
                    {Object.entries(data).map(([sectionTitle, sectionContent]) => (
                        <div key={sectionTitle}>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-100 mb-3 border-b border-slate-200 dark:border-slate-700 pb-1">
                                {sectionTitle.replace(/([A-Z])/g, " $1").trim()}
                            </h3>
                            {renderResultContent(sectionContent)}
                        </div>
                    ))}
                </div>
            );
        }

        return <p className="text-sm text-slate-800 dark:text-slate-300">{String(data)}</p>;
    };

    return (
        <div className="space-y-8 pb-12 max-w-4xl">
            <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                    Intelligent Query Engine
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Execute structured intelligence queries against indexed institutional ledgers.
                </p>
            </div>

            <Card className="rounded-sm shadow-none border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                <CardContent className="p-6">
                    <form onSubmit={handleQuery} className="space-y-6">
                        <div className="space-y-3">
                            <label
                                htmlFor="querySelect"
                                className="block text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-100"
                            >
                                Select System Query
                            </label>
                            <select
                                id="querySelect"
                                value={selectedQuery}
                                onChange={(e) => setSelectedQuery(e.target.value)}
                                className="flex h-10 w-full rounded-sm border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-slate-900 dark:focus-visible:border-slate-500 focus-visible:ring-0 text-slate-900 dark:text-slate-100"
                                disabled={loading}
                            >
                                {SUPPORTED_QUERIES.map((query) => (
                                    <option key={query} value={query}>
                                        {query}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto rounded-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 h-10 font-bold tracking-widest uppercase px-8"
                        >
                            Execute Query
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {hasQueried && !loading && (
                <div className="mt-8">
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-1">
                        Intelligence Report
                    </h2>
                    {result?.zone && (
                        <p className="text-xs text-slate-400 mb-4">
                            Zone: <span className="font-medium text-slate-600">{result.zone}</span>
                            {result.user && <> — Queried by <span className="font-medium text-slate-600">{result.user}</span> ({result.role})</>}
                        </p>
                    )}

                    {isRestricted ? (
                        <div className="p-6 border border-amber-200 bg-amber-50 rounded-sm">
                            <h3 className="text-sm font-bold text-amber-900 uppercase tracking-widest mb-1">Clearance Alert</h3>
                            <p className="text-sm text-amber-800">This intelligence view is restricted. Your current delegation profile does not have clearance for this execution.</p>
                        </div>
                    ) : error ? (
                        <div className="p-6 border border-red-200 bg-red-50 rounded-sm">
                            <h3 className="text-sm font-bold text-red-900 uppercase tracking-widest mb-1">Execution Failure</h3>
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    ) : result ? (
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-sm border border-slate-200 dark:border-slate-700 shadow-sm">
                            {result.count !== undefined && (
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                                    {result.count} result{result.count !== 1 ? "s" : ""} found
                                </p>
                            )}
                            {renderResultContent(result.results || result)}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
