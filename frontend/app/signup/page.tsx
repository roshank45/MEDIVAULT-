"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HeartPulse,
  User,
  Lock,
  Mail,
  Phone,
  Building2,
  Stethoscope,
  Award,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Activity
} from "lucide-react";
import { api } from "@/lib/api";

const SPECIALTY_OPTIONS = [
  "Cardiology",
  "Internal Medicine",
  "Emergency Medicine",
  "Neurology",
  "Pediatrics",
  "General Surgery",
  "Endocrinology",
  "Oncology",
  "Orthopedics",
  "Pulmonology",
  "Family Medicine",
  "Other Specialty"
];

export default function DoctorSignUpPage() {
  const router = useRouter();

  // Form states
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("DOCTOR");
  const [hospitalId, setHospitalId] = useState<number | "">("");
  const [specialty, setSpecialty] = useState("Cardiology");
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdDoctor, setCreatedDoctor] = useState<any>(null);

  // Fetch active hospitals
  useEffect(() => {
    async function loadHospitals() {
      try {
        const list = await api.auth.getPublicHospitals();
        setHospitals(list || []);
        if (list && list.length > 0) {
          setHospitalId(list[0].hospital_id);
        }
      } catch (err: any) {
        console.error("Failed to load hospitals:", err);
        // Fallback demo hospitals if offline/unreachable
        setHospitals([
          { hospital_id: 1, name: "City General Hospital", code: "CGH", city: "Metro City" },
          { hospital_id: 2, name: "Sunrise Medical Centre", code: "SMC", city: "Eastview" },
          { hospital_id: 3, name: "Green Valley Hospital", code: "GVH", city: "Greenfield" },
        ]);
        setHospitalId(1);
      } finally {
        setLoadingHospitals(false);
      }
    }
    loadHospitals();
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic client validations
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both password fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (!hospitalId) {
      setError("Please select a hospital affiliation.");
      return;
    }

    const effectiveSpecialty = specialty === "Other Specialty"
      ? (customSpecialty.trim() || "General Medicine")
      : specialty;

    if (!licenseNumber.trim()) {
      setError("Medical license number is required for clinician registration.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        hospital_id: Number(hospitalId),
        specialty: effectiveSpecialty,
        license_number: licenseNumber.trim().toUpperCase(),
        role: role,
        password: password,
      };

      const res = await api.auth.doctorSignup(payload);
      setCreatedDoctor(res);
      setSuccess(true);

      // Auto-login: store authentication tokens
      localStorage.setItem("medivault_token", res.access_token);
      localStorage.setItem("medivault_user", JSON.stringify(res));

      // Redirect after 2.5 seconds
      setTimeout(() => {
        router.push("/");
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Failed to create doctor account. Please check your information.");
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
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md">
              <HeartPulse className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Medi<span className="text-teal-600">Vault</span>
            </span>
          </Link>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Healthcare Professional Registration
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create an authorized clinical account to access centralized patient records and conduct medication safety checks.
          </p>

          {/* Registration Role Switcher Tabs */}
          <div className="mt-6 inline-flex rounded-xl bg-slate-200/80 p-1 text-xs font-semibold">
            <div className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-teal-700 shadow-sm font-bold">
              <Stethoscope className="h-4 w-4 text-teal-600" />
              <span>Doctor / Clinician Sign Up</span>
            </div>
            <Link
              href="/admin/signup"
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-slate-600 transition hover:text-slate-900"
            >
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              <span>Administrator Sign Up</span>
            </Link>
          </div>
        </div>

        {/* Success Card */}
        {success && createdDoctor ? (
          <div className="mt-8 rounded-xl border border-emerald-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Account Successfully Created!</h2>
            <p className="mt-2 text-sm text-slate-600">
              Welcome, <span className="font-semibold text-slate-900">{createdDoctor.full_name}</span>. Your clinical profile has been registered in the centralized Oracle Database under <span className="font-semibold text-teal-700">{createdDoctor.hospital_name}</span>.
            </p>
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-left max-w-md mx-auto space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Username:</span>
                <span className="font-mono font-semibold text-slate-800">{createdDoctor.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Role:</span>
                <span className="font-semibold text-teal-700">{createdDoctor.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Affiliated Hospital:</span>
                <span className="font-semibold text-slate-800">{createdDoctor.hospital_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Audit Status:</span>
                <span className="font-semibold text-emerald-600">Logged (DOCTOR_SELF_REGISTERED)</span>
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition"
              >
                <span>Proceed to Clinical Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Redirecting automatically in a moment...
            </p>
          </div>
        ) : (
          /* Registration Form Card */
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSignUp} className="space-y-6">
              {/* Section 1: Clinical Identification */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-4">
                  <Stethoscope className="h-4 w-4" />
                  Clinical & Professional Details
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Legal & Medical Name *
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
                        placeholder="e.g. Dr. Alexander Wright, MD"
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Medical License Number *
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Award className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="e.g. MD-2026-8841"
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm uppercase text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Used for regulatory verification and audit logging.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Professional Role *
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    >
                      <option value="DOCTOR">Attending / Consulting Doctor</option>
                      <option value="EMERGENCY_CLINICIAN">Emergency / Trauma Clinician</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Primary Hospital Affiliation *
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={hospitalId}
                        onChange={(e) => setHospitalId(Number(e.target.value))}
                        disabled={loadingHospitals}
                        className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                      >
                        {hospitals.map((h) => (
                          <option key={h.hospital_id} value={h.hospital_id}>
                            {h.name} ({h.code}) — {h.city}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Clinical Specialty *
                    </label>
                    <select
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    >
                      {SPECIALTY_OPTIONS.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  </div>

                  {specialty === "Other Specialty" && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Specify Specialty
                      </label>
                      <input
                        type="text"
                        required
                        value={customSpecialty}
                        onChange={(e) => setCustomSpecialty(e.target.value)}
                        placeholder="e.g. Pediatric Cardiology"
                        className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Contact Information */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-4">
                  <Mail className="h-4 w-4" />
                  Contact Information
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hospital / Professional Email *
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
                        placeholder="doctor@hospital.org"
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Direct Telephone / Extension
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Phone className="h-4 w-4" />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1-555-0199"
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Account Credentials */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-4">
                  <ShieldCheck className="h-4 w-4" />
                  Account Security & Credentials
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Login Username *
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
                        placeholder="e.g. dr.wright"
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm lowercase text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Unique identifier used to sign in to the MediVault portal.
                    </span>
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
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Minimum 6 characters. Bcrypt hashed.
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
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Informational Callout */}
              <div className="rounded-lg border border-teal-200 bg-teal-50/70 p-3.5 text-xs text-teal-800 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-teal-600 mt-0.5" />
                <span>
                  <strong>Clinical Authorization Notice:</strong> By submitting this registration, you confirm you are an authorized healthcare practitioner. Your clinical actions, consultation notes, and prescriptions will be cryptographically attributed to your account and logged in the immutable Oracle audit trail.
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 py-3 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:opacity-50"
              >
                {submitting ? (
                  <span>Registering Clinician in Oracle DB...</span>
                ) : (
                  <>
                    <span>Complete Doctor Registration</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Link back to login */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-600">
                  Already have an authorized doctor or clinician account?{" "}
                  <Link href="/login" className="font-semibold text-teal-600 hover:text-teal-700 underline">
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
