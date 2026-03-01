"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Shield, MapPin, Loader2, Zap, ChevronDown } from "lucide-react";

if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  throw new Error("API base URL not configured");
}
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface State {
    code: string;
    name: string;
    constituencies: { code: string; name: string }[];
}

export default function LoginPage() {
    const router = useRouter();

    // Form state
    const [selectedState, setSelectedState] = useState("");
    const [selectedConstituency, setSelectedConstituency] = useState("");
    const [role, setRole] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // UI state
    const [states, setStates] = useState<State[]>([]);
    const [loadingStates, setLoadingStates] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [showCredentials, setShowCredentials] = useState(false);
    const [demoLoading, setDemoLoading] = useState(false);

    // Fetch states on mount
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/auth/states`)
            .then((res) => res.json())
            .then((data) => {
                setStates(data.states || []);
                setLoadingStates(false);
            })
            .catch(() => {
                setError("Failed to load geographic data. Is the backend running?");
                setLoadingStates(false);
            });
    }, []);

    // Get constituencies for selected state
    const constituencies = useMemo(() => {
        if (!selectedState) return [];
        const stateObj = states.find((s) => s.code === selectedState);
        return stateObj?.constituencies || [];
    }, [selectedState, states]);

    // Reset constituency when state changes
    useEffect(() => {
        setSelectedConstituency("");
    }, [selectedState]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!selectedState || !selectedConstituency || !role || !username || !password) {
            setError("All fields are required.");
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username,
                    password,
                    state: selectedState,
                    constituency: selectedConstituency,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Login failed. Please check your credentials.");
                setSubmitting(false);
                return;
            }

            // Store session
            localStorage.setItem("token", data.token);
            localStorage.setItem("userId", data.user.id);
            localStorage.setItem("userName", data.user.name);
            localStorage.setItem("role", data.user.role);
            localStorage.setItem("state", data.user.state);
            localStorage.setItem("stateName", data.user.stateName);
            localStorage.setItem("constituency", data.user.constituency);
            localStorage.setItem("constituencyName", data.user.constituencyName);

            router.push("/dashboard");
        } catch {
            setError("Cannot reach the server. Ensure the backend is running on port 4000.");
            setSubmitting(false);
        }
    };

    const handleDemoLogin = async () => {
        setError("");
        setDemoLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: "rajesh.kumar",
                    password: "admin123",
                    state: "DL",
                    constituency: "DL-ALL",
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Demo login failed.");
                setDemoLoading(false);
                return;
            }

            // Store session
            localStorage.setItem("token", data.token);
            localStorage.setItem("userId", data.user.id);
            localStorage.setItem("userName", data.user.name);
            localStorage.setItem("role", data.user.role);
            localStorage.setItem("state", data.user.state);
            localStorage.setItem("stateName", data.user.stateName);
            localStorage.setItem("constituency", data.user.constituency);
            localStorage.setItem("constituencyName", data.user.constituencyName);
            localStorage.setItem("showGuidedTour", "true");

            router.push("/dashboard");
        } catch {
            setError("Cannot reach the server. Ensure the backend is running on port 4000.");
            setDemoLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Left branding panel */}
            <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
                {/* Subtle background pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }} />

                <div className="relative z-10">
                    {/* Ashoka Chakra-inspired icon */}
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-10 h-10 rounded-full border-2 border-slate-400 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-slate-300" />
                        </div>
                        <div>
                            <span className="text-xs font-semibold tracking-[0.2em] text-slate-400 uppercase block">
                                Government of India
                            </span>
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-white leading-tight tracking-tight mb-4">
                        AI Governance<br />
                        Priority &amp; Accountability<br />
                        Engine
                    </h1>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                        Decision-support platform for public governance offices.
                        Prioritize issues, track commitments, surface accountability risks.
                    </p>
                </div>

                <div className="relative z-10 space-y-6">
                    <div className="flex items-start gap-3">
                        <div className="w-1 h-8 bg-slate-700 rounded-full mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Restricted System</p>
                            <p className="text-slate-500 text-xs mt-1">
                                Authorized personnel only. All access is audited.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right login form panel */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile-only header */}
                    <div className="lg:hidden mb-8 text-center">
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <Shield className="w-5 h-5 text-slate-700" />
                            <span className="text-xs font-semibold tracking-[0.15em] text-slate-500 uppercase">
                                Govt. of India
                            </span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            AI Governance Engine
                        </h1>
                    </div>

                    <Card className="border-slate-300 shadow-sm bg-white rounded-sm">
                        <CardHeader className="pb-4 px-6 pt-6 sm:px-8 sm:pt-8 border-b border-slate-100">
                            <CardTitle className="text-sm font-bold tracking-wide text-slate-900 uppercase">
                                System Authenticated Access
                            </CardTitle>
                            <CardDescription className="text-slate-500 text-xs mt-1">
                                Authorized personnel only. Select your jurisdiction and enter credentials.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
                            {error && (
                                <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Geographic section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        <MapPin className="w-3.5 h-3.5" />
                                        Jurisdiction
                                    </div>

                                    {/* State */}
                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor="state"
                                            className="text-sm font-medium text-slate-700"
                                        >
                                            State / Union Territory
                                        </label>
                                        <select
                                            id="state"
                                            required
                                            value={selectedState}
                                            onChange={(e) => setSelectedState(e.target.value)}
                                            disabled={loadingStates}
                                            className="flex h-10 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="">
                                                {loadingStates ? "Loading states…" : "Select State / UT"}
                                            </option>
                                            {states.map((s) => (
                                                <option key={s.code} value={s.code}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Constituency */}
                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor="constituency"
                                            className="text-sm font-medium text-slate-700"
                                        >
                                            Constituency
                                        </label>
                                        <select
                                            id="constituency"
                                            required
                                            value={selectedConstituency}
                                            onChange={(e) =>
                                                setSelectedConstituency(e.target.value)
                                            }
                                            disabled={!selectedState || constituencies.length === 0}
                                            className="flex h-10 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="">
                                                {!selectedState
                                                    ? "Select a state first"
                                                    : "Select Constituency"}
                                            </option>
                                            {constituencies.map((c) => (
                                                <option key={c.code} value={c.code}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-slate-100 my-1" />

                                {/* Credentials section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        <Shield className="w-3.5 h-3.5" />
                                        Credentials
                                    </div>

                                    {/* Role */}
                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor="role"
                                            className="text-sm font-medium text-slate-700"
                                        >
                                            Access Role
                                        </label>
                                        <select
                                            id="role"
                                            required
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            className="flex h-10 w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent"
                                        >
                                            <option value="">Select Role</option>
                                            <option value="admin">Administrator</option>
                                            <option value="officer">Officer</option>
                                            <option value="leader">Leader (Read-Only)</option>
                                        </select>
                                    </div>

                                    {/* Username */}
                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor="username"
                                            className="text-sm font-medium text-slate-700"
                                        >
                                            Username
                                        </label>
                                        <Input
                                            id="username"
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="e.g. rajesh.kumar"
                                            autoComplete="username"
                                            className="rounded-sm border-slate-300 focus-visible:ring-2 focus-visible:ring-blue-800 focus-visible:ring-offset-0 focus-visible:border-transparent"
                                        />
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor="password"
                                            className="text-sm font-medium text-slate-700"
                                        >
                                            Password
                                        </label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                required
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Enter password"
                                                autoComplete="current-password"
                                                className="rounded-sm border-slate-300 pr-10 focus-visible:ring-2 focus-visible:ring-blue-800 focus-visible:ring-offset-0 focus-visible:border-transparent"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Submit */}
                                <div className="pt-2 space-y-3">
                                    <Button
                                        type="submit"
                                        disabled={submitting || demoLoading}
                                        className="w-full h-10 rounded-sm bg-slate-900 text-white hover:bg-slate-800 font-bold tracking-wide text-xs uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submitting ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Authenticating…
                                            </span>
                                        ) : (
                                            "Sign In"
                                        )}
                                    </Button>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-slate-200" />
                                        </div>
                                        <div className="relative flex justify-center text-xs">
                                            <span className="bg-white px-2 text-slate-400 uppercase tracking-wider font-medium">or</span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleDemoLogin}
                                        disabled={submitting || demoLoading}
                                        className="w-full h-10 rounded-sm bg-blue-900 border border-blue-950 text-white hover:bg-blue-800 font-bold tracking-wide text-xs uppercase flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {demoLoading ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                ESTABLISHING CONNECTION…
                                            </span>
                                        ) : (
                                            <>
                                                <Shield className="h-4 w-4" />
                                                SECURE DEMO LOGIN (ADMIN)
                                            </>
                                        )}
                                    </button>
                                    <p className="text-[10px] text-center text-slate-500 mt-2 font-mono">
                                        SYSTEM UID: rajesh.kumar | LEVEL: 0 (ROOT)
                                    </p>
                                </div>
                            </form>

                            {/* Collapsible demo credentials */}
                            <div className="mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCredentials(!showCredentials)}
                                    className="flex items-center justify-between w-full p-3 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors text-left"
                                >
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Manual Login Credentials</span>
                                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showCredentials ? "rotate-180" : ""}`} />
                                </button>
                                {showCredentials && (
                                    <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-md">
                                        <p className="text-[10px] text-slate-400 mb-3">
                                            All users are under Delhi state. Select the matching constituency when logging in.
                                        </p>
                                        <div className="space-y-1 text-xs text-slate-600">
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pt-1">System Admin — All Delhi</p>
                                            <div className="flex justify-between">
                                                <span className="font-medium">Rajesh Kumar</span>
                                                <span className="font-mono text-slate-500">rajesh.kumar / admin123</span>
                                            </div>
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pt-2">Officers — Delhi Zones</p>
                                            <div className="flex justify-between">
                                                <span className="font-medium">North Delhi</span>
                                                <span className="font-mono text-slate-500">anjali.gupta / officer123</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">South Delhi</span>
                                                <span className="font-mono text-slate-500">kavita.reddy / officer123</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">East Delhi</span>
                                                <span className="font-mono text-slate-500">priya.sharma / officer123</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">West Delhi</span>
                                                <span className="font-mono text-slate-500">vikram.tomar / officer123</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">Central Delhi</span>
                                                <span className="font-mono text-slate-500">suresh.yadav / officer123</span>
                                            </div>
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pt-2">Leaders — Delhi Zones</p>
                                            <div className="flex justify-between">
                                                <span className="font-medium">North Delhi</span>
                                                <span className="font-mono text-slate-500">sunita.devi / leader123</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">South Delhi</span>
                                                <span className="font-mono text-slate-500">meena.chaudhary / leader123</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">East Delhi</span>
                                                <span className="font-mono text-slate-500">rakesh.mehta / leader123</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">West Delhi</span>
                                                <span className="font-mono text-slate-500">arun.jaitley / leader123</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">Central Delhi</span>
                                                <span className="font-mono text-slate-500">dinesh.mohan / leader123</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <p className="mt-6 text-center text-xs text-slate-400">
                        All sessions are monitored and audited. Unauthorized access is prohibited.
                    </p>
                </div>
            </div>
        </div>
    );
}
