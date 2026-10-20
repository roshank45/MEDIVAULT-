"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, Lock, User, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

const DEMO_ACCOUNTS = [
  {
    role: "Doctor (Hospital A - CGH)",
    username: "dr.chen",
    password: "Doctor@123",
    name: "Dr. Marcus Chen",
    badge: "Cardiologist",
  },
  {
    role: "Doctor (Hospital B - SMC)",
    username: "dr.patel",
    password: "Doctor@123",
    name: "Dr. Priya Patel",
    badge: "Endocrinologist",
  },
  {
    role: "Emergency Clinician",
    username: "er.sarah",
    password: "Emergency@123",
    name: "Dr. Sarah Connor",
    badge: "Trauma Care",
  },
  {
    role: "System Administrator",
    username: "admin",
    password: "Admin@123",
    name: "Eleanor Vance",
    badge: "Security & Hospital Admin",
  },
  {
    role: "Patient",
    username: "patient.finch",
    password: "Patient@123",
    name: "Harold Finch",
    badge: "Patient Portal",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.auth.login({ username, password });
      localStorage.setItem("medivault_token", res.access_token);
      localStorage.setItem("medivault_user", JSON.stringify(res));

      if (res.role === "PATIENT") {
        router.push("/patients/1");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setError(null);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
          <HeartPulse className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
          Medi<span className="text-teal-600">Vault</span>
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Centralized Patient Medical Records & Medication Safety System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          {error && (
            <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Username
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="e.g. dr.chen or admin"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 py-2.5 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? (
                "Authenticating..."
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Selector */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              One-Click Demonstration Logins
            </div>
            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map((acc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectDemoAccount(acc)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                    username === acc.username
                      ? "border-teal-500 bg-teal-50/60 ring-1 ring-teal-500"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-800">
                      {acc.name}{" "}
                      <span className="text-[11px] font-normal text-slate-500">({acc.username})</span>
                    </div>
                    <div className="text-[11px] text-teal-700">{acc.role}</div>
                  </div>
                  <span className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                    {acc.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
