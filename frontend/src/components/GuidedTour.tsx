"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    LayoutDashboard,
    AlertCircle,
    CheckSquare,
    Search,
    Shield,
    ChevronRight,
    ChevronLeft,
    X,
    Sparkles,
} from "lucide-react";

interface TourStep {
    title: string;
    description: string;
    icon: React.ReactNode;
    href?: string;
    highlight?: string;
}

const TOUR_STEPS: TourStep[] = [
    {
        title: "Executive Dashboard",
        description:
            "Your command center. See the Governance Health Score, AI-generated insights, critical alerts, and a live map of Delhi's issues — all at a glance.",
        icon: <LayoutDashboard className="h-5 w-5" />,
        href: "/dashboard",
        highlight: "Governance Health Score tells you how well your system is performing overall.",
    },
    {
        title: "AI Priority Engine",
        description:
            "Every grievance is scored by a multi-factor AI model — severity, public sentiment, media coverage, and more. Click any row to see the full reasoning.",
        icon: <AlertCircle className="h-5 w-5" />,
        href: "/issues",
        highlight: "Issues are ranked with statistical confidence. Click to expand AI reasoning.",
    },
    {
        title: "Commitments Tracker",
        description:
            "Track government pledges and their linked grievances. Commitments are cross-linked to issues — click a grievance ID to jump directly to it.",
        icon: <CheckSquare className="h-5 w-5" />,
        href: "/commitments",
        highlight: "Blue grievance IDs are clickable — they navigate to the linked issue.",
    },
    {
        title: "Ask the AI Engine",
        description:
            "Natural language queries against your governance data. Ask questions like \"What are the top water issues in East Delhi?\" and get instant answers.",
        icon: <Search className="h-5 w-5" />,
        href: "/ask",
        highlight: "Powered by contextual AI analysis of your live data.",
    },
    {
        title: "Audit Trail",
        description:
            "Every action is logged. Full transparency and accountability — who did what, when, and from where. Government-grade auditability.",
        icon: <Shield className="h-5 w-5" />,
        href: "/audit",
        highlight: "Complete accountability trail for all user actions.",
    },
];

export default function GuidedTour({ onComplete }: { onComplete: () => void }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const router = useRouter();
    const step = TOUR_STEPS[currentStep];
    const isLast = currentStep === TOUR_STEPS.length - 1;
    const isFirst = currentStep === 0;

    useEffect(() => {
        // Animate in
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const handleNext = useCallback(() => {
        if (isLast) {
            setIsVisible(false);
            setTimeout(() => {
                localStorage.removeItem("showGuidedTour");
                onComplete();
            }, 300);
        } else {
            setCurrentStep((prev) => prev + 1);
        }
    }, [isLast, onComplete]);

    const handlePrev = useCallback(() => {
        if (!isFirst) setCurrentStep((prev) => prev - 1);
    }, [isFirst]);

    const handleSkip = useCallback(() => {
        setIsVisible(false);
        setTimeout(() => {
            localStorage.removeItem("showGuidedTour");
            onComplete();
        }, 300);
    }, [onComplete]);

    const handleNavigate = useCallback(() => {
        if (step.href) {
            localStorage.removeItem("showGuidedTour");
            onComplete();
            router.push(step.href);
        }
    }, [step.href, onComplete, router]);

    // Keyboard navigation
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
            else if (e.key === "ArrowLeft") handlePrev();
            else if (e.key === "Escape") handleSkip();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [handleNext, handlePrev, handleSkip]);

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300 ${isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleSkip} />

            {/* Tour Card */}
            <div className="relative z-10 w-full max-w-lg mx-4 animate-tour-in">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                    {/* Progress bar */}
                    <div className="h-1 bg-slate-100">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                            style={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
                        />
                    </div>

                    {/* Header */}
                    <div className="px-6 pt-5 pb-4 sm:px-8 sm:pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                                    {step.icon}
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    {currentStep + 1} of {TOUR_STEPS.length}
                                </span>
                            </div>
                            <button
                                onClick={handleSkip}
                                className="p-1.5 rounded-md hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{step.title}</h2>
                        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{step.description}</p>

                        {step.highlight && (
                            <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 leading-relaxed">{step.highlight}</p>
                            </div>
                        )}
                    </div>

                    {/* Step dots */}
                    <div className="flex justify-center gap-1.5 pb-4">
                        {TOUR_STEPS.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentStep(i)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep
                                    ? "w-6 bg-blue-500"
                                    : i < currentStep
                                        ? "w-1.5 bg-blue-200"
                                        : "w-1.5 bg-slate-200"
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="px-6 pb-5 sm:px-8 sm:pb-6 flex items-center justify-between gap-3">
                        <button
                            onClick={handleSkip}
                            className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            Skip tour
                        </button>

                        <div className="flex items-center gap-2">
                            {!isFirst && (
                                <button
                                    onClick={handlePrev}
                                    className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                    Back
                                </button>
                            )}

                            {step.href && (
                                <button
                                    onClick={handleNavigate}
                                    className="px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    Go to page →
                                </button>
                            )}

                            <button
                                onClick={handleNext}
                                className="flex items-center gap-1 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                {isLast ? "Start Exploring" : "Next"}
                                {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
