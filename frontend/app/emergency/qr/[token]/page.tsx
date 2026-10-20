"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  HeartPulse,
  AlertTriangle,
  Phone,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Lock,
  ArrowRight,
  Pill,
  User,
  ShieldCheck
} from "lucide-react";
import { api } from "@/lib/api";

export default function PublicEmergencyQRPage() {
  const params = useParams();
  const token = params.token as string;

  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.emergency
      .getPublicProfile(token)
      .then((data) => setProfile(data))
      .catch((err) => {
        setError(err.message || "Emergency profile unavailable or expired.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <header className="mx-auto w-full max-w-2xl border-b border-slate-800 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight text-white">
              Medi<span className="text-teal-400">Vault</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-teal-400 font-bold">
              Emergency Medical Response Network
            </div>
          </div>
        </div>

        <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-400 border border-red-500/40 animate-pulse">
          Level 1 Triage
        </span>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-2xl my-6 flex-1">
        {loading ? (
          <div className="py-20 text-center text-sm text-slate-400">
            Validating cryptographic emergency token with Oracle security gateway...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-8 text-center backdrop-blur shadow-2xl">
            <ShieldAlert className="mx-auto h-16 w-16 text-red-500 mb-3" />
            <h2 className="text-xl font-bold text-white">Emergency Token Invalid or Expired</h2>
            <p className="mt-2 text-xs text-red-300 max-w-md mx-auto leading-relaxed">
              {error} This token may have been revoked by the patient, rotated, or surpassed its validity window.
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-700"
              >
                <Lock className="h-4 w-4" />
                <span>Authorized Clinician Login</span>
              </Link>
            </div>
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Disclaimer Callout */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 p-4 text-xs leading-relaxed text-amber-200 backdrop-blur">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">EMERGENCY FIRST-RESPONDER PROFILE:</span>{" "}
                  {profile.disclaimer}
                </div>
              </div>
            </div>

            {/* Patient Identity Badge */}
            <div className="rounded-2xl border border-slate-800 bg-slate-800/80 p-6 shadow-xl backdrop-blur">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Patient Name
                  </span>
                  <h1 className="text-2xl font-black text-white tracking-tight">
                    {profile.patient_name}
                  </h1>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-400">
                      {profile.unique_patient_id}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-300 font-medium capitalize">
                      {profile.gender}
                    </span>
                  </div>
                </div>

                {/* Blood Group Highlight */}
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-4 text-center shrink-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                    Blood Group
                  </div>
                  <div className="text-2xl font-black text-rose-400">
                    {profile.blood_group}
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Allergies Box (Most Important) */}
            <div className="rounded-2xl border-2 border-red-500/50 bg-red-950/30 p-6 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between border-b border-red-500/20 pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-red-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  Critical Allergies & Hypersensitivities
                </h2>
                <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300 border border-red-500/30">
                  {profile.allergies_status}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {profile.critical_allergies && profile.critical_allergies.length > 0 ? (
                  profile.critical_allergies.map((allergy: string, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-red-500/30 bg-red-900/30 p-3 text-xs font-semibold text-red-100"
                    >
                      • {allergy}
                    </div>
                  ))
                ) : profile.allergies_status === "NO_KNOWN_ALLERGIES" ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 p-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>No Known Drug Allergies (NKA explicitly documented)</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic p-2">
                    Allergy documentation not formally recorded. Exercise standard clinical precaution.
                  </div>
                )}
              </div>
            </div>

            {/* Current Active Medications */}
            <div className="rounded-2xl border border-slate-800 bg-slate-800/80 p-6 shadow-xl backdrop-blur">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700 pb-3 flex items-center gap-2">
                <Pill className="h-4 w-4 text-teal-400" />
                Verified Active Medications
              </h2>

              <div className="mt-4 space-y-2 text-xs">
                {profile.active_medications && profile.active_medications.length > 0 ? (
                  profile.active_medications.map((med: string, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-slate-200"
                    >
                      {med}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic text-xs">
                    No active prescriptions recorded in central registry.
                  </div>
                )}
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="rounded-2xl border border-slate-800 bg-slate-800/80 p-6 shadow-xl backdrop-blur">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-700 pb-3 flex items-center gap-2">
                <Phone className="h-4 w-4 text-teal-400" />
                Emergency Contact
              </h2>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-sm text-white">
                    {profile.emergency_contact_name || "No Emergency Contact Listed"}
                  </div>
                  <div className="text-slate-400 mt-0.5">
                    Relationship: {profile.emergency_contact_relation || "N/A"}
                  </div>
                </div>

                {profile.emergency_contact_phone && (
                  <a
                    href={`tel:${profile.emergency_contact_phone}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 font-bold text-white shadow hover:bg-teal-700 transition"
                  >
                    <Phone className="h-4 w-4" />
                    <span>Call: {profile.emergency_contact_phone}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Transition to Level 2 Authenticated Access */}
            <div className="rounded-2xl border border-teal-500/30 bg-teal-950/30 p-6 backdrop-blur">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-sm text-teal-200 flex items-center gap-1.5">
                    <Lock className="h-4 w-4 text-teal-400" />
                    Need Full Longitudinal Medical History?
                  </div>
                  <p className="mt-1 text-xs text-teal-300 leading-relaxed">
                    Full consultation notes, laboratory tests, vitals trends, and prescription updates require clinician login or Break-Glass emergency override.
                  </p>
                </div>

                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-bold text-slate-900 shadow hover:bg-slate-100 shrink-0"
                >
                  <span>Clinician Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-2xl border-t border-slate-800 pt-4 text-center text-[11px] text-slate-500">
        MediVault Emergency Care Service • All access events recorded in Oracle security audit log
      </footer>
    </div>
  );
}
