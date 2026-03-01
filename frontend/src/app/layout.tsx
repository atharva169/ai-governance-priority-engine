"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, LayoutDashboard, AlertCircle, CheckSquare, FileText, Search, Shield, MapPin, Menu, X, Sun, Moon } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";

  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [stateName, setStateName] = useState<string | null>(null);
  const [constituencyName, setConstituencyName] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize dark mode from localStorage or system pref
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  useEffect(() => {
    setIsMounted(true);
    const storedRole = localStorage.getItem("role");
    const storedUserName = localStorage.getItem("userName");
    const storedStateName = localStorage.getItem("stateName");
    const storedConstituencyName = localStorage.getItem("constituencyName");
    const storedToken = localStorage.getItem("token");

    // If not on login page and no token, redirect to login
    if (!isLoginPage && !storedToken) {
      router.push("/login");
      return;
    }

    setRole(storedRole);
    setUserName(storedUserName);
    setStateName(storedStateName);
    setConstituencyName(storedConstituencyName);
  }, [isLoginPage, router]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Logout even if API call fails
    }

    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("role");
    localStorage.removeItem("state");
    localStorage.removeItem("stateName");
    localStorage.removeItem("constituency");
    localStorage.removeItem("constituencyName");
    router.push("/login");
  };

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Issues", href: "/issues", icon: AlertCircle },
    { name: "Commitments", href: "/commitments", icon: CheckSquare },
    { name: "Briefs", href: "/briefs", icon: FileText, hideFor: "officer" },
    { name: "Ask Engine", href: "/ask", icon: Search },
    { name: "Audit Trail", href: "/audit", icon: Shield, hideFor: "officer" },
  ];

  // Shared sidebar content used in both desktop and mobile
  const sidebarContent = (
    <>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navLinks.map((link) => {
            if (link.hideFor === role) return null;
            const isActive = pathname?.startsWith(link.href);
            const Icon = link.icon;
            return (
              <li key={link.name}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-colors ${isActive
                    ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
                    }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {link.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Jurisdiction info */}
      {stateName && constituencyName && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <MapPin className="h-3 w-3" />
            <span className="font-semibold uppercase tracking-wider">Jurisdiction</span>
          </div>
          <p className="text-xs text-slate-700 font-medium">{constituencyName}</p>
          <p className="text-xs text-slate-500">{stateName}</p>
        </div>
      )}
    </>
  );

  if (!isMounted) {
    return (
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}>
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200`}>
        {isLoginPage ? (
          children
        ) : (
          <div className="flex min-h-screen">
            {/* ─── Desktop Sidebar (md+) ─── */}
            <aside className="w-64 border-r border-slate-300 bg-slate-50 flex-col shrink-0 hidden md:flex dark:bg-slate-900 dark:border-slate-700 transition-colors duration-200">
              <div className="h-16 flex items-center px-6 border-b border-slate-300 bg-slate-900 dark:bg-slate-950 dark:border-slate-800">
                <Shield className="h-5 w-5 text-slate-300 mr-2" />
                <h1 className="text-xs font-bold tracking-widest text-white uppercase mt-0.5">Government of India</h1>
              </div>
              {sidebarContent}
            </aside>

            {/* ─── Mobile Sidebar Overlay ─── */}
            {mobileMenuOpen && (
              <div className="fixed inset-0 z-50 md:hidden">
                {/* Backdrop */}
                <div
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                  onClick={() => setMobileMenuOpen(false)}
                />
                {/* Drawer */}
                <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-2xl flex flex-col animate-slide-in dark:bg-slate-900 dark:border-r dark:border-slate-800">
                  <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800">
                    <h1 className="text-sm font-semibold tracking-wide text-slate-900 uppercase dark:text-slate-100">Government of India</h1>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    </button>
                  </div>
                  {sidebarContent}

                  {/* Mobile user info + logout at drawer bottom */}
                  <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{userName || "Unknown"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{role || "—"}</p>
                      </div>
                      <button
                        onClick={toggleDarkMode}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
                      >
                        {isDarkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors px-2 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                  </div>
                </aside>
              </div>
            )}

            {/* ─── Main Content ─── */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Top Bar */}
              <header className="h-14 md:h-16 border-b border-slate-300 bg-white flex items-center justify-between md:justify-end px-4 md:px-6 shrink-0 dark:bg-slate-900 dark:border-slate-700 transition-colors duration-200 shadow-sm">
                {/* Hamburger button (mobile only) */}
                <button
                  className="md:hidden p-1.5 -ml-1 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                </button>

                {/* Mobile: show app name center */}
                <span className="md:hidden text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Shield className="h-4 w-4" /> AI Gov Engine
                </span>

                {/* Desktop: Official App Header center/left on desktop, right aligned user info */}
                <div className="hidden md:flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-blue-800 dark:bg-blue-600 rounded-full" />
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest leading-tight">Priority & Accountability Engine</h2>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Government of India • Authorized Access Mode</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end border-r border-slate-200 dark:border-slate-700 pr-5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">{userName || "Unknown"}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">{role || "—"}</span>
                    </div>

                    <button
                      onClick={toggleDarkMode}
                      className="p-1.5 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      title="Toggle Display Mode"
                    >
                      {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-sm border border-slate-200 dark:border-slate-700"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Exit
                    </button>
                  </div>
                </div>

                {/* Mobile: theme toggle + sign out icons only */}
                <div className="md:hidden flex items-center gap-1">
                  <button
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={toggleDarkMode}
                  >
                    {isDarkMode ? <Sun className="h-4.5 w-4.5 text-slate-400" /> : <Moon className="h-4.5 w-4.5 text-slate-600" />}
                  </button>
                  <button
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4.5 w-4.5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
              </header>

              <main className="flex-1 overflow-auto p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                  {children}
                </div>
              </main>
            </div>
          </div>
        )}
      </body>
    </html >
  );
}
