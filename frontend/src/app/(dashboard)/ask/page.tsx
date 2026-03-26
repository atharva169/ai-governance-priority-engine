"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Send, Brain, Zap, AlertTriangle, Clock } from "lucide-react";

const SUGGESTION_CHIPS = [
    { label: "What needs urgent attention?", icon: AlertTriangle },
    { label: "Which commitments are overdue?", icon: Clock },
    { label: "Which issues are likely to escalate?", icon: Zap },
];

interface ChatMessage {
    role: "user" | "ai";
    content: string;
    source?: string;
    dataContext?: { totalIssues: number; criticalCount: number };
    timestamp: Date;
}

export default function AskPage() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (queryText?: string) => {
        const q = queryText || query;
        if (!q.trim() || loading) return;

        const userMessage: ChatMessage = { role: "user", content: q, timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        setQuery("");
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem("token") || "";
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
            const response = await fetch(`${API_BASE_URL}/api/ask`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ query: q }),
            });

            if (response.status === 403) {
                setMessages(prev => [...prev, {
                    role: "ai",
                    content: "Access restricted. Your current clearance level does not permit this query.",
                    timestamp: new Date(),
                }]);
                return;
            }

            if (!response.ok) throw new Error("Query execution failed.");

            const data = await response.json();

            // Format response based on type
            let aiContent = "";
            if (data.answer) {
                aiContent = data.answer;
            } else if (data.results && Array.isArray(data.results)) {
                aiContent = `Found **${data.count}** result(s):\n\n` +
                    data.results.slice(0, 8).map((r: any, i: number) =>
                        `**${i + 1}. ${r.title || r.id}**${r.score ? ` — Score: ${r.score}/100` : ""}${r.region ? ` — ${r.region}` : ""}${r.daysPending ? ` — ${r.daysPending}d pending` : ""}${r.aiReasoning ? `\n   _${r.aiReasoning.substring(0, 120)}..._` : ""}`
                    ).join("\n\n");
            } else {
                aiContent = JSON.stringify(data, null, 2);
            }

            setMessages(prev => [...prev, {
                role: "ai",
                content: aiContent,
                source: data.source || (data.aiPowered ? "gemini" : "engine"),
                dataContext: data.dataContext,
                timestamp: new Date(),
            }]);
        } catch (err: any) {
            setError(err.message);
            setMessages(prev => [...prev, {
                role: "ai",
                content: "An error occurred while processing your query. Please try again.",
                timestamp: new Date(),
            }]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const renderMessage = (msg: ChatMessage, idx: number) => {
        if (msg.role === "user") {
            return (
                <div key={idx} className="flex justify-end animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                    <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-br-md bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 text-white shadow-lg">
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className="text-[10px] text-slate-400 mt-1.5 text-right">
                            {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div key={idx} className="flex justify-start animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                <div className="max-w-[85%]">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-md">
                            <Brain className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">AI Intelligence</span>
                        {msg.source && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-semibold">
                                {msg.source === "gemini" ? "⚡ Gemini AI" : msg.source === "cache" ? "📦 Cached" : "🔍 Engine"}
                            </span>
                        )}
                    </div>
                    <div className="px-5 py-4 rounded-2xl rounded-tl-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {msg.content.split(/\*\*(.*?)\*\*/g).map((part, i) =>
                                i % 2 === 1
                                    ? <strong key={i} className="text-slate-900 dark:text-white">{part}</strong>
                                    : <span key={i}>{part.split(/_(.*?)_/g).map((sub, j) =>
                                        j % 2 === 1
                                            ? <em key={j} className="text-slate-500 dark:text-slate-400">{sub}</em>
                                            : sub
                                    )}</span>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                            {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-5rem)] max-w-4xl">
            {/* Header */}
            <div className="pb-4 border-b border-slate-200 dark:border-slate-700 mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                        <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                            AI Intelligence Engine
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3 text-violet-500" />
                            Powered by Gemini AI — Ask anything about governance data
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-4 px-1">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/20 dark:to-purple-900/20 mb-4">
                            <Brain className="h-10 w-10 text-violet-500" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">Ask the AI Intelligence Engine</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
                            Query your governance data using natural language. The AI will analyze issues, commitments, and trends to provide actionable insights.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {SUGGESTION_CHIPS.map(({ label, icon: Icon }) => (
                                <button
                                    key={label}
                                    onClick={() => handleSubmit(label)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                    <Icon className="h-4 w-4 text-violet-500" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map(renderMessage)}

                {/* Typing indicator */}
                {loading && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                                <Brain className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex gap-1.5">
                                    <div className="typing-dot h-2 w-2 rounded-full bg-violet-500" />
                                    <div className="typing-dot h-2 w-2 rounded-full bg-violet-500" />
                                    <div className="typing-dot h-2 w-2 rounded-full bg-violet-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Suggestion chips when messages exist */}
            {messages.length > 0 && !loading && (
                <div className="flex gap-2 pb-3 overflow-x-auto">
                    {SUGGESTION_CHIPS.map(({ label, icon: Icon }) => (
                        <button
                            key={label}
                            onClick={() => handleSubmit(label)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-violet-900/20 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap"
                        >
                            <Icon className="h-3 w-3 text-violet-500" />
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* Input Area */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex gap-3">
                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask about governance issues, zone trends, escalation risks..."
                            disabled={loading}
                            className="w-full h-12 pl-4 pr-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all shadow-sm"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="h-12 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold flex items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg disabled:shadow-none"
                    >
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline text-sm">Send</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
