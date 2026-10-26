"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HeartPulse,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Lock,
  Mail,
  Phone,
  Building2,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Stethoscope
} from "lucide-react";
import { api } from "@/lib/api";

const DEPARTMENTS = [
  "Central Health Informatics & Security",
  "Hospital Operations & Governance",
  "Clinical Quality & Audit Directorate",
  "Healthcare IT Infrastructure",
  "Regulatory Compliance Office"
];

export default function AdminSignUpPage() {
  const router = useRouter();

  // Form states
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [hospitalId, setHospitalId] = useState<number | "">("");
  const [adminSecretKey, setAdminSecretKey] = useState("MEDIVAULT_ADMIN_2026");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdAdmin, setCreatedAdmin] = useState<any>(null);

  // Fetch active hospitals
  useEffect(() => {
    async function loadHospitals() {
      try {
        const list = await api.auth.getPublicHospitals();
        setHospitals(list || []);
      } catch (err: any) {
        console.error("Failed to load hospitals:", err);
      } finally {
        setLoadingHospitals(false);
      }
    }
    loadHospitals();
  }, []);

  const handleAdminSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter both password fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (!adminSecretKey.trim()) {
      setError("Administrative Master Key is required for security verification.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        department: department,
        hospital_id: hospitalId ? Number(hospitalId) : undefined,
        admin_secret_key: adminSecretKey.trim(),
        password: password,
      };

      const res = await api.auth.adminSignup(payload);
      setCreatedAdmin(res);
      setSuccess(true);

      // Auto-login: store admin tokens
      localStorage.setItem("medivault_token", res.access_token);
      localStorage.setItem("medivault_user", JSON.stringify(res));

      // Redirect to administration portal after 2.5s
      setTimeout(() => {
        router.push("/admin");
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Failed to register administrator account. Please verify your master key.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header Branding */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 transition hover:opacity-90">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-700 text-white shadow-md shadow-purple-700/20">
              <Shield className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Medi<span className="text-purple-700">Vault</span>
            </span>
          </Link>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            System Administrator Registration
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Provision authorized governance credentials to manage participating hospitals, staff accounts, and security audit trails.
          </p>

          {/* Registration Role Switcher Tabs */}
          <div className="mt-6 inline-flex rounded-xl bg-slate-200/80 p-1 text-xs font-semibold">
            <Link
              href="/signup"
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-slate-600 transition hover:text-slate-900"
            >
              <Stethoscope className="h-4 w-4 text-teal-600" />
              <span>Doctor / Clinician Sign Up</span>
            </Link>
            <div className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-purple-700 shadow-sm font-bold">
              <Shield className="h-4 w-4 text-purple-600" />
              <span>Administrator Sign Up</span>
            </div>
          </div>
        </div>

        {/* Success Card */}
        {success && createdAdmin ? (
          <div className="mt-8 rounded-xl border border-emerald-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Administrator Registered Successfully!</h2>
            <p className="mt-2 text-sm text-slate-600">
              Welcome, <span className="font-semibold text-slate-900">{createdAdmin.full_name}</span>. Your system administration profile is active in the central Oracle Database with full administrative permissions.
            </p>
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-left max-w-md mx-auto space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Admin Username:</span>
                <span className="font-mono font-semibold text-slate-800">{createdAdmin.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">System Role:</span>
                <span className="font-semibold text-purple-700">{createdAdmin.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scope:</span>
                <span className="font-semibold text-slate-800">{createdAdmin.hospital_name || "Central Health Authority"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Security Audit:</span>
                <span className="font-semibold text-emerald-600">Logged (ADMIN_ACCOUNT_REGISTERED)</span>
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => router.push("/admin")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-purple-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-800 transition"
              >
                <span>Proceed to Admin Console</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Redirecting automatically to Admin Console...
            </p>
          </div>
        ) : (
          /* Admin Registration Form Card */
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAdminSignUp} className="space-y-6">
              {/* Section 1: Administrative Identification */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-4">
                  <ShieldCheck className="h-4 w-4" />
                  Administrative Profile & Directorate
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Legal Name *
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Eleanor Vance"
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Department / Directorate *
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Affiliated Hospital (Optional Scope)
                    </label>
                    <select
                      value={hospitalId}
                      onChange={(e) => setHospitalId(e.target.value ? Number(e.target.value) : "")}
                      disabled={loadingHospitals}
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                    >
                      <option value="">Central System (All Participating Hospitals)</option>
                      {hospitals.map((h) => (
                        <option key={h.hospital_id} value={h.hospital_id}>
                          {h.name} ({h.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Contact Information */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-4">
                  <Mail className="h-4 w-4" />
                  Institutional Contact Information
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Institutional / Official Email *
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@medivault.gov"
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Direct Telephone / Secure Line
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Phone className="h-4 w-4" />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1-555-0100"
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Credentials & Master Passkey */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-4">
                  <KeyRound className="h-4 w-4" />
                  Security Authorization & Master Passkey
                </h3>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Administrative Master Authorization Key *
                      </label>
                      <button
                        type="button"
                        onClick={() => setAdminSecretKey("MEDIVAULT_ADMIN_2026")}
                        className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 underline"
                      >
                        Auto-fill Demo Key (MEDIVAULT_ADMIN_2026)
                      </button>
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={adminSecretKey}
                        onChange={(e) => setAdminSecretKey(e.target.value)}
                        placeholder="e.g. MEDIVAULT_ADMIN_2026"
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm font-mono uppercase text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Required to verify privilege authority and prevent unauthorized administrative role creation.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Admin Login Username *
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <User className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="e.g. admin.vance"
                          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm lowercase text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Password *
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Lock className="h-4 w-4" />
                        </div>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Minimum 6 characters. Stored with bcrypt hash.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                          <Lock className="h-4 w-4" />
                        </div>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informational Governance Notice */}
              <div className="rounded-lg border border-purple-200 bg-purple-50/70 p-3.5 text-xs text-purple-900 flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 shrink-0 text-purple-700 mt-0.5" />
                <span>
                  <strong>Separation of Duties Notice:</strong> System Administrators possess configuration, hospital onboarding, and audit log inspection rights. In accordance with healthcare privacy standards, administrators do not receive automatic unrestricted clinical access to patient histories without proper emergency authorization.
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-700 py-3 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 disabled:opacity-50"
              >
                {submitting ? (
                  <span>Registering Administrator in Oracle DB...</span>
                ) : (
                  <>
                    <span>Complete Administrator Registration</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Link back to login */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-600">
                  Already have an administrator account?{" "}
                  <Link href="/login" className="font-semibold text-purple-700 hover:text-purple-800 underline">
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
