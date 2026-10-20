"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Shield,
  Search,
  UserPlus,
  Building2,
  FileText,
  AlertTriangle,
  LogOut,
  User,
  HeartPulse
} from "lucide-react";
import BreakGlassModal from "./BreakGlassModal";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showBreakGlass, setShowBreakGlass] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("medivault_user");
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error(e);
      }
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("medivault_token");
    localStorage.removeItem("medivault_user");
    setCurrentUser(null);
    router.push("/login");
  };

  // Hide Navbar on public emergency QR view and login page
  if (pathname.startsWith("/emergency/qr/") || pathname === "/login") {
    return null;
  }

  const role = currentUser?.role;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm">
                <HeartPulse className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  Medi<span className="text-teal-600">Vault</span>
                </span>
                <span className="hidden sm:inline-block ml-2 rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-teal-700 uppercase">
                  Centralized Health Records
                </span>
              </div>
            </Link>

            {/* Navigation links */}
            {currentUser && (
              <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
                <Link
                  href="/"
                  className={`flex items-center gap-1.5 rounded-md px-3 py-2 transition ${
                    pathname === "/"
                      ? "bg-teal-50 text-teal-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  Dashboard
                </Link>

                {(role === "DOCTOR" || role === "ADMIN" || role === "EMERGENCY_CLINICIAN") && (
                  <>
                    <Link
                      href="/patients/search"
                      className={`flex items-center gap-1.5 rounded-md px-3 py-2 transition ${
                        pathname.startsWith("/patients/search")
                          ? "bg-teal-50 text-teal-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Search className="h-4 w-4" />
                      Search Patient
                    </Link>

                    <Link
                      href="/patients/register"
                      className={`flex items-center gap-1.5 rounded-md px-3 py-2 transition ${
                        pathname === "/patients/register"
                          ? "bg-teal-50 text-teal-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <UserPlus className="h-4 w-4" />
                      Register Patient
                    </Link>
                  </>
                )}

                {role === "ADMIN" && (
                  <>
                    <Link
                      href="/admin"
                      className={`flex items-center gap-1.5 rounded-md px-3 py-2 transition ${
                        pathname === "/admin"
                          ? "bg-teal-50 text-teal-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Building2 className="h-4 w-4" />
                      Administration
                    </Link>

                    <Link
                      href="/admin/audit"
                      className={`flex items-center gap-1.5 rounded-md px-3 py-2 transition ${
                        pathname === "/admin/audit"
                          ? "bg-teal-50 text-teal-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      Audit Trail
                    </Link>
                  </>
                )}
              </nav>
            )}
          </div>

          {/* Right actions & User Profile */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                {(role === "DOCTOR" || role === "EMERGENCY_CLINICIAN") && (
                  <button
                    onClick={() => setShowBreakGlass(true)}
                    className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100"
                    title="Initiate Break-Glass Emergency Clinical Access"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Break-Glass Access</span>
                  </button>
                )}

                <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-semibold text-slate-800 leading-tight">
                      {currentUser.full_name}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center justify-end gap-1">
                      <span className="font-medium text-teal-600">{currentUser.role}</span>
                      {currentUser.hospital_name && (
                        <span>• {currentUser.hospital_name}</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-red-600"
                    title="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
              >
                <User className="h-4 w-4" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Break Glass Modal */}
      {showBreakGlass && (
        <BreakGlassModal onClose={() => setShowBreakGlass(false)} />
      )}
    </>
  );
}
