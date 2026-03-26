"use client";

import React, { useEffect, useState, useRef } from "react";

interface RadialGaugeProps {
    score: number;
    maxScore?: number;
    size?: number;
    label?: string;
    sublabel?: string;
}

export default function RadialGauge({ score, maxScore = 100, size = 200, label, sublabel }: RadialGaugeProps) {
    const [animatedScore, setAnimatedScore] = useState(0);
    const requestRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);

    const radius = (size - 20) / 2;
    const circumference = 2 * Math.PI * radius;
    const normalizedScore = Math.min(score, maxScore);
    const percentage = normalizedScore / maxScore;

    // Color based on score
    const getColor = () => {
        if (score >= 70) return { stroke: "#10b981", glow: "rgba(16, 185, 129, 0.3)", label: "Healthy" };
        if (score >= 45) return { stroke: "#f59e0b", glow: "rgba(245, 158, 11, 0.3)", label: "Under Strain" };
        return { stroke: "#ef4444", glow: "rgba(239, 68, 68, 0.3)", label: "Critical" };
    };

    const color = getColor();

    // Animate on mount
    useEffect(() => {
        const duration = 1500;

        const animate = (timestamp: number) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const elapsed = timestamp - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setAnimatedScore(Math.round(eased * normalizedScore));

            if (progress < 1) {
                requestRef.current = requestAnimationFrame(animate);
            }
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [normalizedScore]);

    const animatedPercentage = animatedScore / maxScore;
    const offset = circumference * (1 - animatedPercentage);

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                    {/* Glow filter */}
                    <defs>
                        <filter id="gaugeGlow">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Background circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-slate-200 dark:text-slate-700"
                    />

                    {/* Progress circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={color.stroke}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        filter="url(#gaugeGlow)"
                        style={{
                            transition: "stroke 0.5s ease",
                        }}
                    />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold tracking-tight" style={{ color: color.stroke }}>
                        {animatedScore}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">/ {maxScore}</span>
                    <span
                        className="text-[10px] font-bold uppercase tracking-widest mt-1 px-2 py-0.5 rounded-full"
                        style={{
                            color: color.stroke,
                            backgroundColor: `${color.stroke}15`,
                        }}
                    >
                        {color.label}
                    </span>
                </div>
            </div>
            {label && (
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-2">
                    {label}
                </p>
            )}
            {sublabel && (
                <p className="text-[11px] text-slate-400 mt-0.5">{sublabel}</p>
            )}
        </div>
    );
}
