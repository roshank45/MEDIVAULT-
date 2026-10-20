"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, User, ArrowRight, QrCode, Shield, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

function PatientSearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.patients.search(searchTerm);
      setResults(data);
      setSearched(true);
    } catch (err: any) {
      setError(err.message || "Failed to search patient directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Patient Directory Search
        </h1>
        <p className="text-xs text-slate-500">
          Search authorized records across participating hospitals by unique medical ID, name, or phone
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="mt-6">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Unique Patient ID (e.g. MV-2026-000001), name, or phone..."
              className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {/* Quick Suggestion Pills */}
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <span>Try Demo IDs:</span>
          <button
            type="button"
            onClick={() => {
              setQuery("MV-2026-000001");
              performSearch("MV-2026-000001");
            }}
            className="rounded bg-teal-50 px-2 py-0.5 font-mono text-teal-700 hover:bg-teal-100 border border-teal-200"
          >
            MV-2026-000001 (Harold Finch)
          </button>
          <button
            type="button"
            onClick={() => {
              setQuery("MV-2026-000002");
              performSearch("MV-2026-000002");
            }}
            className="rounded bg-teal-50 px-2 py-0.5 font-mono text-teal-700 hover:bg-teal-100 border border-teal-200"
          >
            MV-2026-000002 (Elena Rostova)
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Section */}
      <div className="mt-8">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Querying Oracle patient repository...
          </div>
        ) : results.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Patient ID</th>
                  <th className="px-6 py-3.5">Full Name</th>
                  <th className="px-6 py-3.5">DOB / Age</th>
                  <th className="px-6 py-3.5">Blood Group</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Allergy Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {results.map((patient) => (
                  <tr key={patient.patient_id} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono font-bold text-teal-800">
                      {patient.unique_patient_id}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {patient.first_name} {patient.last_name}
                      <span className="block text-[11px] font-normal text-slate-500">
                        {patient.gender}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {patient.date_of_birth}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">
                        {patient.blood_group || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      {patient.phone}
                    </td>
                    <td className="px-6 py-4">
                      {patient.allergies_recorded_status === "DOCUMENTED" ? (
                        <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
                          Documented
                        </span>
                      ) : patient.allergies_recorded_status === "NO_KNOWN_ALLERGIES" ? (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          No Known
                        </span>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          Not Recorded
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/patients/${patient.patient_id}`}
                          className="flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition"
                        >
                          <span>Medical History</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : searched ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <User className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-base font-bold text-slate-900">
              No Patient Records Found
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              No matching records for &quot;{query}&quot;. Verify the unique patient ID or register a new patient.
            </p>
            <div className="mt-6">
              <Link
                href="/patients/register"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700"
              >
                Register New Patient
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <Search className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-2 text-sm font-medium text-slate-600">
              Enter a search query above to look up patient records.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatientSearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading search...</div>}>
      <PatientSearchContent />
    </Suspense>
  );
}

