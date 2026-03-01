"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { generateBriefPDF } from "@/lib/generateBriefPDF";
import { Download, Loader2 } from "lucide-react";

interface SummaryPoint {
    title: string;
    content: string;
}

interface BriefData {
    topCriticalIssues: any[];
    mostDelayedCommitments: any[];
    highEscalationRisks: any[];
    executiveSummary: SummaryPoint[];
}

export default function BriefsPage() {
    const [data, setData] = useState<BriefData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRestricted, setIsRestricted] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    useEffect(() => {
        async function fetchBriefs() {
            try {
                const token = localStorage.getItem("token") || "";
                const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
                const response = await fetch(`${API_BASE_URL}/api/briefs`, {
                    headers: { "Authorization": `Bearer ${token}` },
                });

                if (response.status === 403) {
                    setIsRestricted(true);
                    setLoading(false);
                    return;
                }

                if (!response.ok) {
                    throw new Error("Failed to fetch executive brief.");
                }

                const briefData = await response.json();
                setData(briefData);
            } catch (err) {
                setError("Unable to retrieve briefing data. System connection may be interrupted.");
            } finally {
                setLoading(false);
            }
        }

        fetchBriefs();
    }, []);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
                    Compiling Executive Brief...
                </p>
            </div>
        );
    }

    if (isRestricted) {
        return (
            <div className="flex h-64 items-center justify-center p-6">
                <div className="text-center max-w-lg">
                    <h2 className="text-lg font-semibold text-slate-900 uppercase tracking-widest mb-2">Restricted Access</h2>
                    <p className="text-sm text-slate-600">
                        Access restricted to leadership. Your current clearance level does not permit viewing of aggregated strategic briefs.
                    </p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-4 border border-red-200 bg-red-50 rounded-sm">
                <h3 className="text-sm font-semibold text-red-900 uppercase tracking-wide">System Error</h3>
                <p className="mt-1 text-sm text-red-700">{error || "Failed to load data"}</p>
            </div>
        );
    }

    const handleDownloadPDF = () => {
        setIsGeneratingPDF(true);
        // Wait a tick so the UI updates to show the loading state
        setTimeout(() => {
            try {
                generateBriefPDF(data, 68); // Passing a hardcoded mock health score for the brief, or could fetch it
            } catch (error) {
                console.error("Failed to generate PDF:", error);
            } finally {
                setIsGeneratingPDF(false);
            }
        }, 500);
    };

    return (
        <div className="space-y-12 pb-12 max-w-4xl">
            <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                        Executive Intelligence Brief
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Aggregated strategic overview for senior leadership command. Generated {new Date().toLocaleDateString()}.
                    </p>
                </div>
                <button
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-xs font-semibold uppercase tracking-widest ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:focus-visible:ring-slate-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 dark:bg-slate-100 text-slate-50 dark:text-slate-900 hover:bg-slate-900/90 dark:hover:bg-slate-200 h-9 px-4 py-2 shrink-0"
                >
                    {isGeneratingPDF ? (
                        <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Download className="h-3.5 w-3.5" />
                            Download PDF
                        </>
                    )}
                </button>
            </div>

            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-slate-100">
                    Executive Summary
                </h2>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm">
                    <ul className="space-y-4">
                        {data.executiveSummary.map((point, index) => (
                            <li key={index} className="text-sm text-slate-800 dark:text-slate-300 leading-relaxed">
                                <span className="font-bold text-slate-900 dark:text-slate-100 mr-2">{point.title}:</span>{point.content}
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-slate-100">
                    Top Critical Issues
                </h2>
                {data.topCriticalIssues && data.topCriticalIssues.length > 0 ? (
                    <div className="space-y-3">
                        {data.topCriticalIssues.map((issue: any) => (
                            <Card key={issue.id} className="rounded-sm shadow-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{issue.title}</h3>
                                        <span className="text-xs font-medium bg-red-100 text-red-800 px-2 py-0.5 rounded-sm uppercase">Critical</span>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{issue.explanation}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 italic">No critical issues on record.</p>
                )}
            </section>

            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-slate-100">
                    Most Delayed Commitments
                </h2>
                {data.mostDelayedCommitments && data.mostDelayedCommitments.length > 0 ? (
                    <div className="space-y-3">
                        {data.mostDelayedCommitments.map((commitment: any) => (
                            <Card key={commitment.id} className="rounded-sm shadow-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{commitment.title}</h3>
                                            <p className="text-xs text-slate-500 uppercase mt-1 tracking-wide">{commitment.department}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{commitment.daysPending} <span className="text-xs font-normal text-slate-500 uppercase">Days</span></div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 italic">No delayed commitments on record.</p>
                )}
            </section>

            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900 dark:text-slate-100">
                    High Escalation Risks
                </h2>
                {data.highEscalationRisks && data.highEscalationRisks.length > 0 ? (
                    <div className="space-y-3">
                        {data.highEscalationRisks.map((risk: any) => (
                            <Card key={risk.id} className="rounded-sm shadow-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">{risk.title}</h3>
                                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">Risk Level: {risk.escalationRisk}/10</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 italic">No high escalation risks detected.</p>
                )}
            </section>

        </div>
    );
}
