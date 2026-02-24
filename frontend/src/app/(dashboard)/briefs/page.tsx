"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface BriefData {
    topCriticalIssues: any[];
    mostDelayedCommitments: any[];
    highEscalationRisks: any[];
    executiveSummary: string;
}

export default function BriefsPage() {
    const [data, setData] = useState<BriefData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRestricted, setIsRestricted] = useState(false);

    useEffect(() => {
        async function fetchBriefs() {
            try {
                const userId = localStorage.getItem("userId") || "unknown";
                const response = await fetch("http://localhost:4000/api/briefs", {
                    headers: { "x-user-id": userId },
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

    return (
        <div className="space-y-12 pb-12 max-w-4xl">
            <div className="border-b border-slate-200 pb-6">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 uppercase">
                    Executive Intelligence Brief
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Aggregated strategic overview for senior leadership command. Generated {new Date().toLocaleDateString()}.
                </p>
            </div>

            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">
                    Executive Summary
                </h2>
                <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-sm">
                    <p className="text-base text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {data.executiveSummary}
                    </p>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">
                    Top Critical Issues
                </h2>
                {data.topCriticalIssues && data.topCriticalIssues.length > 0 ? (
                    <div className="space-y-3">
                        {data.topCriticalIssues.map((issue: any) => (
                            <Card key={issue.id} className="rounded-sm shadow-none border-slate-200">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-sm font-semibold text-slate-900">{issue.title}</h3>
                                        <span className="text-xs font-medium bg-red-100 text-red-800 px-2 py-0.5 rounded-sm uppercase">Critical</span>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1">{issue.explanation}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 italic">No critical issues logged at this time.</p>
                )}
            </section>

            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">
                    Most Delayed Commitments
                </h2>
                {data.mostDelayedCommitments && data.mostDelayedCommitments.length > 0 ? (
                    <div className="space-y-3">
                        {data.mostDelayedCommitments.map((commitment: any) => (
                            <Card key={commitment.id} className="rounded-sm shadow-none border-slate-200">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900">{commitment.title}</h3>
                                            <p className="text-xs text-slate-500 uppercase mt-1 tracking-wide">{commitment.department}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-slate-900">{commitment.daysPending} <span className="text-xs font-normal text-slate-500 uppercase">Days</span></div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 italic">No delayed commitments recorded.</p>
                )}
            </section>

            <section className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">
                    High Escalation Risks
                </h2>
                {data.highEscalationRisks && data.highEscalationRisks.length > 0 ? (
                    <div className="space-y-3">
                        {data.highEscalationRisks.map((risk: any) => (
                            <Card key={risk.id} className="rounded-sm shadow-none border-slate-200">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-medium text-slate-900">{risk.title}</h3>
                                        <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">Risk Level: {risk.escalationRisk}/10</span>
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
