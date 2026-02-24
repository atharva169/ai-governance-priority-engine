"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
    const router = useRouter();
    const [userId, setUserId] = useState("");
    const [role, setRole] = useState("admin");

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || !role) return;

        localStorage.setItem("role", role);
        localStorage.setItem("userId", userId);
        router.push("/dashboard");
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
            <Card className="w-full max-w-md rounded-sm border-slate-300 shadow-none bg-white">
                <CardHeader className="space-y-2 pb-6 text-center border-b border-slate-200 mb-6 px-8 pt-8">
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 uppercase">
                        System Access
                    </CardTitle>
                    <CardDescription className="text-slate-600 text-sm">
                        Provide credentials to access the Governance Engine
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label
                                htmlFor="userId"
                                className="text-xs font-bold text-slate-900 uppercase tracking-widest"
                            >
                                User ID
                            </label>
                            <Input
                                id="userId"
                                required
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                placeholder="Enter unique identifier"
                                className="rounded-sm border-slate-300 focus-visible:ring-0 focus-visible:border-slate-900"
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="role"
                                className="text-xs font-bold text-slate-900 uppercase tracking-widest"
                            >
                                Role Delegation
                            </label>
                            <select
                                id="role"
                                required
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="flex h-10 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-slate-900 focus-visible:ring-0 text-slate-900"
                            >
                                <option value="admin">Admin</option>
                                <option value="officer">Officer</option>
                                <option value="leader">Leader</option>
                            </select>
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                className="w-full rounded-sm bg-slate-900 text-white hover:bg-slate-800 h-10 font-bold tracking-widest uppercase"
                            >
                                Authenticate
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
