"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ShieldAlert, X, ArrowRight, Lock } from "lucide-react";
import { api } from "@/lib/api";

interface BreakGlassModalProps {
  onClose: () => void;
  defaultPatientId?: number;
}

export default function BreakGlassModal({ onClose, defaultPatientId }: BreakGlassModalProps) {
  const router = useRouter();
  const [patientIdInput, setPatientIdInput] = useState(defaultPatientId ? String(defaultPatientId) : "1");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!patientIdInput.trim()) {
      setError("Please specify a Patient ID.");
      return;
    }

    if (reason.trim().length < 15) {
      setError("Break-glass justification must be detailed (at least 15 characters).");
      return;
    }

    try {
      setLoading(true);
      const res = await api.emergency.breakGlass({
        patient_id: Number(patientIdInput),
        reason: reason.trim(),
        access_type: "EMERGENCY_BREAK_GLASS",
      });

      onClose();
      // Navigate to patient medical history
      router.push(`/patients/${res.patient_id}`);
    } catch (err: any) {
      setError(err.message || "Failed to execute break-glass access.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl border border-red-200 bg-white p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Warning Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Emergency Break-Glass Override
            </h3>
            <p className="text-xs text-slate-500">
              Direct Clinical Emergency Access Protocol
            </p>
          </div>
        </div>

        {/* Warning callout */}
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-bold">AUDIT NOTICE:</span> Invoking Break-Glass bypasses routine authorization. 
              This event is immutably logged with your digital identity, timestamp, IP address, and stated justification in the Oracle database security audit trail.
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700">
              Patient Database ID
            </label>
            <input
              type="number"
              value={patientIdInput}
              onChange={(e) => setPatientIdInput(e.target.value)}
              placeholder="e.g. 1"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Harold Finch is ID 1 (MV-2026-000001).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700">
              Mandatory Clinical Justification
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe clinical emergency condition (e.g., Unconscious patient admitted to ER. Patient unable to provide history. Immediate check required for allergies and active medicines)..."
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? (
                "Authorizing..."
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>Authorize & View History</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
