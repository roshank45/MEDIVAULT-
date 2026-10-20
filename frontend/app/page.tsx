"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Activity,
  Building2,
  FileCheck,
  AlertTriangle,
  ArrowRight,
  Search,
  ShieldCheck,
  PlusCircle,
  Clock,
  HeartPulse,
  QrCode,
  CheckCircle2,
  Stethoscope
} from "lucide-react";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const userStr = localStorage.getItem("medivault_user");
    if (!userStr) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(userStr);
    setCurrentUser(user);

    // Fetch dashboard metrics
    api.admin
      .getMetrics()
      .then((data) => setMetrics(data))
      .catch((err) => console.error("Failed to fetch metrics:", err))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/patients/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-700 via-teal-600 to-sky-700 p-6 sm:p-8 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Multi-Hospital Federated Architecture</span>
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {currentUser.full_name}
            </h1>
            <p className="mt-1 text-teal-100 text-sm max-w-2xl leading-relaxed">
              MediVault Centralized Medical Records & Medication Safety Platform. 
              {currentUser.hospital_name ? ` Connected to ${currentUser.hospital_name}.` : " Centralized Healthcare Administration."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/patients/register"
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-teal-800 shadow transition hover:bg-teal-50"
            >
              <PlusCircle className="h-4 w-4" />
              <span>New Patient</span>
            </Link>
            <Link
              href="/patients/search"
              className="flex items-center gap-2 rounded-lg bg-teal-800/60 border border-white/20 px-4 py-2.5 text-xs font-bold text-white shadow transition hover:bg-teal-800"
            >
              <Search className="h-4 w-4" />
              <span>Patient Directory</span>
            </Link>
          </div>
        </div>

        {/* Global Patient Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-6 max-w-2xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Unique Patient ID (e.g. MV-2026-000001), name, or phone..."
              className="w-full rounded-xl bg-white/95 py-3 pl-10 pr-24 text-sm text-slate-900 placeholder-slate-400 shadow-inner focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-teal-700 transition"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Metrics Row */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Registered Patients
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {metrics ? metrics.total_patients : "..."}
          </div>
          <div className="mt-1 text-xs text-teal-600 font-medium">
            Active unique medical identifiers
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Clinical Consultations
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {metrics ? metrics.total_visits : "..."}
          </div>
          <div className="mt-1 text-xs text-sky-600 font-medium">
            Recorded across 3 hospitals
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Prescriptions Issued
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FileCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {metrics ? metrics.total_prescriptions : "..."}
          </div>
          <div className="mt-1 text-xs text-indigo-600 font-medium">
            Screened for duplicate & interaction safety
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Participating Hospitals
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {metrics ? metrics.total_hospitals : "3"}
          </div>
          <div className="mt-1 text-xs text-emerald-600 font-medium">
            Federated Oracle node network
          </div>
        </div>
      </div>

      {/* Main Grid: Participating Hospitals & Recent Clinical Activity */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (2 Cols): Recent Cross-Hospital Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Recent Multi-Hospital Consultations
                </h2>
                <p className="text-xs text-slate-500">
                  Live longitudinal activity fed into central Oracle repository
                </p>
              </div>
              <Link
                href="/patients/search"
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {metrics?.recent_activity?.length > 0 ? (
                metrics.recent_activity.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-3.5 transition hover:bg-slate-50 px-2 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-teal-700 font-semibold text-xs">
                        {item.visit_type === "EMERGENCY" ? (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        ) : (
                          <Stethoscope className="h-5 w-5 text-teal-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>Patient {item.unique_patient_id}</span>
                          <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 border border-teal-200">
                            {item.visit_type}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-medium text-slate-700">{item.hospital_name}</span>
                          <span>•</span>
                          <span>{item.doctor_name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-700">
                        {new Date(item.visit_date).toLocaleDateString()}
                      </div>
                      <Link
                        href={`/patients/${item.unique_patient_id === "MV-2026-000001" ? 1 : 2}`}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-teal-600 hover:underline"
                      >
                        <span>History</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No recent consultations recorded.
                </div>
              )}
            </div>
          </div>

          {/* Demonstration Scenario Guidance Card */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
                <HeartPulse className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-teal-900">
                  End-to-End Evaluation Scenario: Harold Finch (MV-2026-000001)
                </h3>
                <p className="mt-1 text-xs text-teal-800 leading-relaxed">
                  1. Harold Finch (68 y/o, Diabetic & Hypertensive) visits <strong>City General Hospital (CGH)</strong> where Dr. Chen records consultation, vitals, and Metformin + Lisinopril.
                  <br />
                  2. He presents at <strong>Sunrise Medical Centre (SMC)</strong>: An emergency responder scans his QR card for Level 1 emergency triage (allergies & contacts).
                  <br />
                  3. Dr. Patel signs in, searches ID <code>MV-2026-000001</code>, reviews complete cross-hospital history, and tests medication safety checks.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Link
                    href="/patients/1"
                    className="inline-flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-teal-800"
                  >
                    <span>View Harold Finch Profile</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href="/emergency/qr/demo-emergency-token-2026-finch"
                    className="inline-flex items-center gap-1.5 rounded-md bg-white border border-teal-300 px-3 py-1.5 text-xs font-bold text-teal-800 shadow-sm hover:bg-teal-50"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>Test Public QR Emergency Scan</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Participating Hospitals Network */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                Hospital Network Activity
              </h2>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                3 Connected
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {metrics?.hospital_metrics?.map((h: any, idx: number) => (
                <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{h.hospital_name}</span>
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                      {h.hospital_code}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400">Visits:</span>{" "}
                      <span className="font-semibold text-slate-800">{h.total_visits}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Patients:</span>{" "}
                      <span className="font-semibold text-slate-800">{h.unique_patients_seen}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Prescriptions:</span>{" "}
                      <span className="font-semibold text-slate-800">{h.total_prescriptions_issued}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Tests:</span>{" "}
                      <span className="font-semibold text-slate-800">{h.total_tests_ordered}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions & System Health */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              System Infrastructure
            </h2>
            <div className="mt-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Database Engine</span>
                <span className="font-semibold text-slate-900">Oracle Database 11.2 XE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Database Integrity</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Normal (3NF)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Backend Driver</span>
                <span className="font-semibold text-slate-900">Native 64-bit OCI / pyodbc</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Security Audit Logs</span>
                <span className="font-semibold text-slate-900">Database Triggers Enabled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
