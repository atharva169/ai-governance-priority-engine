"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface NlpSentiment {
    rawScore: number;
    comparative: number;
    severity: number;
    label: string;
    emoji: string;
    keywords: string[];
}

interface LiveGrievance {
    id: string;
    title: string;
    region: string;
    category: string;
    issueType: string;
    complaintsCount: number;
    daysPending: number;
    sentimentSeverity: number;
    escalationRisk: number;
    score: number;
    label: "Critical" | "Attention Required" | "Stable";
    confidence: string;
    nlpSentiment?: NlpSentiment;
}

interface ZoneSentimentTrend {
    zone: string;
    avgSeverity: number;
    avgComparative: number;
    trend: "rising" | "falling" | "stable";
    trendArrow: string;
    changePercent: number;
    dataPoints: number;
    label: string;
    emoji: string;
}

interface LiveMessage {
    type: "new-grievance" | "init" | "heartbeat";
    grievance?: LiveGrievance;
    totalCount?: number;
    topIssuesNow?: { id: string; title: string; region: string; score: number; label: string; issueType: string }[];
    recentGrievances?: LiveGrievance[];
    stats?: { totalIngested: number; activeListeners: number; bufferSize: number };
    zoneSentimentTrends?: { zones: ZoneSentimentTrend[]; global: { avgSeverity: number; totalDataPoints: number; label: string } };
    timestamp: string;
}

interface UseLiveStreamReturn {
    updates: LiveGrievance[];
    totalCount: number;
    topIssues: { id: string; title: string; region: string; score: number; label: string; issueType: string }[];
    isConnected: boolean;
    messageRate: number;
    lastEventAt: string | null;
    zoneSentimentTrends: ZoneSentimentTrend[];
    globalSentiment: { avgSeverity: number; totalDataPoints: number; label: string } | null;
}

const MAX_UPDATES = 10;

export function useLiveStream(): UseLiveStreamReturn {
    const [updates, setUpdates] = useState<LiveGrievance[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [topIssues, setTopIssues] = useState<UseLiveStreamReturn["topIssues"]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [lastEventAt, setLastEventAt] = useState<string | null>(null);
    const [zoneSentimentTrends, setZoneSentimentTrends] = useState<ZoneSentimentTrend[]>([]);
    const [globalSentiment, setGlobalSentiment] = useState<UseLiveStreamReturn["globalSentiment"]>(null);

    const messageTimestamps = useRef<number[]>([]);
    const [messageRate, setMessageRate] = useState(0);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(() => {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
        const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

        if (!userId) return;

        // EventSource doesn't support custom headers, pass userId as query param
        const url = `${API_BASE_URL}/api/live-stream?userId=${userId}`;

        try {
            const es = new EventSource(url);
            eventSourceRef.current = es;

            es.onopen = () => {
                setIsConnected(true);
            };

            es.onmessage = (event) => {
                try {
                    const data: LiveMessage = JSON.parse(event.data);

                    // Skip heartbeats
                    if (data.type === "heartbeat") return;

                    // Track message rate
                    const now = Date.now();
                    messageTimestamps.current.push(now);
                    messageTimestamps.current = messageTimestamps.current.filter(
                        (t) => now - t < 60000
                    );
                    setMessageRate(
                        Math.round((messageTimestamps.current.length / 60) * 100) / 100
                    );

                    if (data.type === "init") {
                        // Initial state from server
                        if (data.totalCount) setTotalCount(data.totalCount);
                        if (data.recentGrievances) {
                            setUpdates(data.recentGrievances.slice(0, MAX_UPDATES));
                        }
                        if (data.zoneSentimentTrends) {
                            setZoneSentimentTrends(data.zoneSentimentTrends.zones || []);
                            setGlobalSentiment(data.zoneSentimentTrends.global || null);
                        }
                        setLastEventAt(data.timestamp);
                    } else if (data.type === "new-grievance" && data.grievance) {
                        // New grievance arrived
                        setUpdates((prev) => [data.grievance!, ...prev].slice(0, MAX_UPDATES));
                        if (data.totalCount) setTotalCount(data.totalCount);
                        if (data.topIssuesNow) setTopIssues(data.topIssuesNow);
                        if (data.zoneSentimentTrends) {
                            setZoneSentimentTrends(data.zoneSentimentTrends.zones || []);
                            setGlobalSentiment(data.zoneSentimentTrends.global || null);
                        }
                        setLastEventAt(data.timestamp);
                    }
                } catch {
                    // Ignore parse errors
                }
            };

            es.onerror = () => {
                setIsConnected(false);
                es.close();

                // Reconnect after 5 seconds
                reconnectTimer.current = setTimeout(() => {
                    connect();
                }, 5000);
            };
        } catch {
            setIsConnected(false);
        }
    }, []);

    useEffect(() => {
        connect();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (reconnectTimer.current) {
                clearTimeout(reconnectTimer.current);
            }
        };
    }, [connect]);

    return { updates, totalCount, topIssues, isConnected, messageRate, lastEventAt, zoneSentimentTrends, globalSentiment };
}
