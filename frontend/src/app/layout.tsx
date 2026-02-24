"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, LayoutDashboard, AlertCircle, CheckSquare, FileText, Search } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";

  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedRole = localStorage.getItem("role") || "officer"; // default fallback for preview
    const storedUserId = localStorage.getItem("userId") || "USR-UNASSIGNED";
    setRole(storedRole);
    setUserId(storedUserId);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    router.push("/login");
  };

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Issues", href: "/issues", icon: AlertCircle },
    { name: "Commitments", href: "/commitments", icon: CheckSquare },
    { name: "Briefs", href: "/briefs", icon: FileText, hideFor: "officer" },
    { name: "Ask Engine", href: "/ask", icon: Search },
  ];

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}>
        {isLoginPage ? (
          children
        ) : (
          <div className="flex min-h-screen">
            {/* Left Sidebar */}
            <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 hidden md:flex">
              <div className="h-16 flex items-center px-6 border-b border-slate-200">
                <h1 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">AI Governance Engine</h1>
              </div>
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
                          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                              ? "bg-slate-100 text-slate-900"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Top Bar */}
              <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center">
                  <h2 className="text-sm font-medium text-slate-600">Decision Support System</h2>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-slate-900">{userId}</span>
                    <span className="text-xs text-slate-500 capitalize">{role} Role</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </header>

              <main className="flex-1 overflow-auto p-6 md:p-8">
                <div className="max-w-7xl mx-auto">
                  {children}
                </div>
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
