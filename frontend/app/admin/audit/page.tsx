"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Shield,
  ShieldAlert,
  ArrowLeft,
  Filter,
  RefreshCw,
  Clock,
  User,
  Building2,
  Lock
} from "lucide-react";
import { api } from "@/lib/api";

export default function AuditTrailPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const data = await api.audit.getLogs(100);
      setLogs(data);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem("medivault_user");
    if (!userStr) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== "ADMIN") {
      alert("Access restricted to System Administrators.");
      router.push("/");
      return;
    }
    setCurrentUser(user);
    loadAuditLogs();
  }, [router]);

  const filteredLogs = logs.filter((log) => {
    if (filterType === "ALL") return true;
    if (filterType === "BREAK_GLASS") return log.event_type.includes("BREAK_GLASS");
    if (filterType === "AUTH") return log.event_type.includes("LOGIN") || log.event_type.includes("LOGOUT");
    if (filterType === "ACCESS") return log.event_type.includes("ACCESSED") || log.event_type.includes("QR");
    if (filterType === "CLINICAL") return log.event_type.includes("VISIT") || log.event_type.includes("PRESCRIPTION");
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs font-semibold text-teal-600 hover:underline flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Administration</span>
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-teal-600" />
            Security & Clinical Audit Trail Log
          </h1>
          <p className="text-xs text-slate-500">
            Immutable Oracle database audit records tracking logins, patient history lookups, break-glass events, and clinical modifications
          </p>
        </div>

        <button
          onClick={loadAuditLogs}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-teal-600" : ""}`} />
          <span>Refresh Audit Records</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 pl-2 pr-1">Filter:</span>
        {[
          { id: "ALL", label: "All Audit Events" },
          { id: "BREAK_GLASS", label: "Break-Glass Overrides" },
          { id: "ACCESS", label: "Patient Record Lookups" },
          { id: "CLINICAL", label: "Clinical & Rx Modifications" },
          { id: "AUTH", label: "Sign-in / Authentication" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterType(f.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              filterType === f.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Audit Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Fetching audit logs from Oracle AUDIT_LOG table...
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Log ID / Timestamp</th>
                  <th className="px-4 py-3.5">Actor User</th>
                  <th className="px-4 py-3.5">Event Type</th>
                  <th className="px-4 py-3.5">Entity / Target</th>
                  <th className="px-4 py-3.5">Hospital Facility</th>
                  <th className="px-4 py-3.5">Clinical Reason / Justification</th>
                  <th className="px-4 py-3.5">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLogs.map((log) => {
                  const isBreakGlass = log.event_type.includes("BREAK_GLASS");
                  const isAuthFail = log.event_type.includes("FAILED");

                  return (
                    <tr
                      key={log.log_id}
                      className={`hover:bg-slate-50 transition ${
                        isBreakGlass
                          ? "bg-red-50/50"
                          : isAuthFail
                          ? "bg-amber-50/40"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono">
                        <div className="font-bold text-slate-900">#{log.log_id}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {log.actor_name || (log.actor_user_id ? `User #${log.actor_user_id}` : "System / Anonymous")}
                        </div>
                        <span className="inline-block mt-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                          {log.actor_role || "PUBLIC"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${
                            isBreakGlass
                              ? "bg-red-100 text-red-800 border-red-300"
                              : log.event_type.includes("SUCCESS")
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : isAuthFail
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : "bg-teal-50 text-teal-800 border-teal-200"
                          }`}
                        >
                          {log.event_type}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px]">
                        <span className="font-bold text-slate-800">{log.target_entity}</span>
                        {log.target_id && <span className="text-slate-500"> #{log.target_id}</span>}
                        {log.patient_name && (
                          <div className="text-[10px] font-sans text-teal-700 font-semibold mt-0.5">
                            Patient: {log.patient_name}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {log.hospital_name || (log.hospital_id ? `Hospital #${log.hospital_id}` : "Federated")}
                      </td>

                      <td className="px-4 py-3">
                        {log.access_reason ? (
                          <span
                            className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                              isBreakGlass ? "bg-red-100 text-red-900 font-bold" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {log.access_reason}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None specified</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-[11px] text-slate-600 max-w-xs truncate" title={log.details}>
                        {log.details || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-slate-400">
            No audit logs found for the selected filter.
          </div>
        )}
      </div>
    </div>
  );
}
