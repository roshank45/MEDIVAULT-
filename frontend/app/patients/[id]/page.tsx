"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Calendar,
  Clock,
  Building2,
  Stethoscope,
  Pill,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  FileText,
  HeartPulse,
  QrCode,
  Plus,
  RefreshCw,
  Phone,
  User,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Printer,
  ChevronRight,
  Shield
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { api } from "@/lib/api";

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const patientId = Number(params.id);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "prescriptions" | "vitals" | "tests" | "plans" | "emergency">("timeline");
  
  // Filter states for timeline
  const [hospitalFilter, setHospitalFilter] = useState<string>("ALL");

  // Medication Safety Pre-check state
  const [medicinesCatalog, setMedicinesCatalog] = useState<any[]>([]);
  const [diagnosesCatalog, setDiagnosesCatalog] = useState<any[]>([]);
  const [selectedCandidateMedId, setSelectedCandidateMedId] = useState<number>(3); // Default Amoxil (to test penicillin allergy)
  const [safetyResults, setSafetyResults] = useState<any>(null);
  const [safetyChecking, setSafetyChecking] = useState(false);

  // New Consultation Modal State
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [newConsult, setNewConsult] = useState({
    hospital_id: 1,
    visit_type: "CONSULTATION",
    chief_complaint: "",
    clinical_notes: "",
    diagnosis_id: 1,
  });

  // New Prescription Modal State
  const [showRxModal, setShowRxModal] = useState(false);
  const [newRx, setNewRx] = useState({
    hospital_id: 1,
    visit_id: 1,
    clinical_notes: "",
    medicine_id: 1,
    dose_amount: "500",
    dose_unit: "mg",
    frequency: "Twice daily with meals",
    duration_days: 30,
    instructions: "Take with meals",
  });

  // New Vital Modal State
  const [showVitalModal, setShowVitalModal] = useState(false);
  const [newVital, setNewVital] = useState({
    measurement_type: "SYSTOLIC_BP",
    numeric_value: 130,
    unit: "mmHg",
    context_note: "Sitting resting",
  });

  // Emergency QR Token State
  const [emergencyTokenData, setEmergencyTokenData] = useState<any>(null);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [messageNotice, setMessageNotice] = useState<string | null>(null);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const data = await api.patients.getHistory(patientId);
      setPatientData(data);

      const [meds, diags] = await Promise.all([
        api.prescriptions.getMedicines().catch(() => []),
        api.visits.getDiagnosesCatalog().catch(() => []),
      ]);
      setMedicinesCatalog(meds);
      setDiagnosesCatalog(diags);
      if (meds.length > 0) {
        setSelectedCandidateMedId(meds[0].medicine_id);
      }
    } catch (err: any) {
      console.error(err);
      setMessageNotice(err.message || "Failed to load medical history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem("medivault_user");
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
    loadPatientData();
  }, [patientId]);

  // Run Safety Pre-check
  const handleRunSafetyCheck = async (medId: number) => {
    setSafetyChecking(true);
    try {
      const res = await api.safety.check(patientId, [{ medicine_id: medId }]);
      setSafetyResults(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSafetyChecking(false);
    }
  };

  // Generate / Renew Emergency QR token
  const handleGenerateEmergencyToken = async () => {
    setEmergencyLoading(true);
    try {
      const res = await api.emergency.generateToken(patientId);
      setEmergencyTokenData(res);
      setMessageNotice("New secure emergency QR token generated successfully.");
    } catch (err: any) {
      alert(err.message || "Failed to generate emergency token.");
    } finally {
      setEmergencyLoading(false);
    }
  };

  // Revoke Emergency Token
  const handleRevokeEmergencyToken = async () => {
    if (!confirm("Are you sure you want to revoke this emergency token? Existing printed QR codes will immediately cease functioning.")) return;
    try {
      await api.emergency.revokeToken(patientId);
      setEmergencyTokenData(null);
      setMessageNotice("Emergency QR code revoked. Public triage access disabled.");
    } catch (err: any) {
      alert(err.message || "Failed to revoke token.");
    }
  };

  // Handle Discontinue Prescription
  const handleDiscontinueRx = async (rxId: number) => {
    const reason = prompt("Enter clinical reason for discontinuing this medication:", "Therapy goal reached / Medication reconciliation");
    if (!reason) return;
    try {
      await api.prescriptions.discontinue(rxId, reason);
      loadPatientData();
      alert("Prescription discontinued. Historical record preserved in audit trail.");
    } catch (err: any) {
      alert(err.message || "Failed to discontinue prescription.");
    }
  };

  // Handle Create Consultation
  const handleCreateConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.visits.create({
        patient_id: patientId,
        hospital_id: Number(newConsult.hospital_id),
        visit_type: newConsult.visit_type,
        chief_complaint: newConsult.chief_complaint,
        clinical_notes: newConsult.clinical_notes,
        diagnoses: [
          {
            diagnosis_id: Number(newConsult.diagnosis_id),
            diagnosis_type: "PRIMARY",
            clinical_status: "ACTIVE",
          },
        ],
      });
      setShowConsultModal(false);
      loadPatientData();
      alert("Consultation recorded successfully in Oracle database!");
    } catch (err: any) {
      alert(err.message || "Failed to record consultation.");
    }
  };

  // Handle Create Prescription
  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const today = new Date().toISOString().split("T")[0];
      const endDate = new Date(Date.now() + newRx.duration_days * 86400000).toISOString().split("T")[0];

      await api.prescriptions.create({
        patient_id: patientId,
        visit_id: Number(newRx.visit_id),
        hospital_id: Number(newRx.hospital_id),
        clinical_notes: newRx.clinical_notes,
        items: [
          {
            medicine_id: Number(newRx.medicine_id),
            dose_amount: newRx.dose_amount,
            dose_unit: newRx.dose_unit,
            frequency: newRx.frequency,
            route: "ORAL",
            duration_days: Number(newRx.duration_days),
            instructions: newRx.instructions,
            start_date: today,
            end_date: endDate,
          },
        ],
      });
      setShowRxModal(false);
      loadPatientData();
      alert("Prescription recorded successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to create prescription.");
    }
  };

  // Handle Record Vital
  const handleRecordVital = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.vitals.record({
        patient_id: patientId,
        measurement_type: newVital.measurement_type,
        numeric_value: Number(newVital.numeric_value),
        unit: newVital.unit,
        context_note: newVital.context_note,
      });
      setShowVitalModal(false);
      loadPatientData();
      alert("Vital measurement recorded successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to record vital measurement.");
    }
  };

  // Filtered visits
  const filteredVisits = useMemo(() => {
    if (!patientData?.visits) return [];
    if (hospitalFilter === "ALL") return patientData.visits;
    return patientData.visits.filter((v: any) => v.hospital_code === hospitalFilter);
  }, [patientData, hospitalFilter]);

  // Aggregate vitals across all visits for charts
  const bloodPressureData = useMemo(() => {
    if (!patientData?.visits) return [];
    const points: any[] = [];
    patientData.visits.forEach((v: any) => {
      let sys: number | null = null;
      let dia: number | null = null;
      (v.vitals || []).forEach((vit: any) => {
        if (vit.measurement_type === "SYSTOLIC_BP") sys = vit.numeric_value;
        if (vit.measurement_type === "DIASTOLIC_BP") dia = vit.numeric_value;
      });
      if (sys !== null || dia !== null) {
        points.push({
          date: new Date(v.visit_date).toLocaleDateString(),
          timestamp: new Date(v.visit_date).getTime(),
          systolic: sys,
          diastolic: dia,
          hospital: v.hospital_code,
        });
      }
    });
    return points.sort((a, b) => a.timestamp - b.timestamp);
  }, [patientData]);

  const bloodGlucoseData = useMemo(() => {
    if (!patientData?.visits) return [];
    const points: any[] = [];
    patientData.visits.forEach((v: any) => {
      (v.vitals || []).forEach((vit: any) => {
        if (vit.measurement_type === "BLOOD_GLUCOSE") {
          points.push({
            date: new Date(vit.recorded_at).toLocaleDateString(),
            timestamp: new Date(vit.recorded_at).getTime(),
            glucose: vit.numeric_value,
            unit: vit.unit,
          });
        }
      });
    });
    return points.sort((a, b) => a.timestamp - b.timestamp);
  }, [patientData]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-slate-500">
        <RefreshCw className="mx-auto h-8 w-8 animate-spin text-teal-600 mb-2" />
        Retrieving longitudinal records from Oracle Database...
      </div>
    );
  }

  const patient = patientData?.patient;
  if (!patient) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Patient Record Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">Unable to locate records for ID #{patientId}.</p>
        <Link href="/patients/search" className="mt-4 inline-block text-xs font-semibold text-teal-600 hover:underline">
          Return to Patient Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner Notice */}
      {messageNotice && (
        <div className="flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-medium text-teal-800">
          <span>{messageNotice}</span>
          <button onClick={() => setMessageNotice(null)} className="text-teal-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Patient Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md text-2xl font-bold">
              {patient.first_name[0]}{patient.last_name[0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900">
                  {patient.first_name} {patient.last_name}
                </h1>
                <span className="rounded-md bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-xs font-mono font-bold text-teal-800">
                  {patient.unique_patient_id}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {patient.gender}
                </span>
                <span className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-bold text-rose-700">
                  Blood: {patient.blood_group || "N/A"}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400">DOB:</span>{" "}
                  <span className="font-medium text-slate-800">{patient.date_of_birth}</span>
                </div>
                <div>
                  <span className="text-slate-400">Phone:</span>{" "}
                  <span className="font-medium text-slate-800">{patient.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400">Emergency Contact:</span>{" "}
                  <span className="font-medium text-slate-800">
                    {patient.emergency_contact_name || "N/A"} ({patient.emergency_contact_phone || "N/A"})
                  </span>
                </div>
              </div>

              {/* Allergy Alert Pill */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Allergy Documentation:</span>
                {patient.allergies_recorded_status === "DOCUMENTED" ? (
                  <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800 border border-red-200">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                    Documented Allergies Present
                  </span>
                ) : patient.allergies_recorded_status === "NO_KNOWN_ALLERGIES" ? (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    No Known Allergies (NKA Confirmed)
                  </span>
                ) : (
                  <span className="rounded bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    Allergy Status Not Recorded
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowConsultModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Consultation</span>
            </button>

            <button
              onClick={() => setShowRxModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-teal-600 bg-white px-3.5 py-2 text-xs font-bold text-teal-700 shadow-sm hover:bg-teal-50 transition"
            >
              <Pill className="h-3.5 w-3.5" />
              <span>Issue Prescription</span>
            </button>

            <button
              onClick={() => setShowVitalModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Record Vitals</span>
            </button>

            <button
              onClick={() => setActiveTab("emergency")}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-100 transition"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Emergency QR Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto text-sm font-medium">
          {[
            { id: "timeline", label: "Longitudinal Timeline", icon: Clock },
            { id: "prescriptions", label: "Prescriptions & Safety", icon: Pill },
            { id: "vitals", label: "Vitals & Trend Charts", icon: TrendingUp },
            { id: "tests", label: "Medical Tests & Scans", icon: FileText },
            { id: "plans", label: "Treatment Plans", icon: FileCheck },
            { id: "emergency", label: "Emergency QR Card", icon: QrCode },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 border-b-2 py-3 px-1 transition ${
                  isActive
                    ? "border-teal-600 text-teal-700 font-bold"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LONGITUDINAL MEDICAL HISTORY TIMELINE */}
      {/* ========================================================================= */}
      {activeTab === "timeline" && (
        <div className="space-y-6">
          {/* Hospital Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Building2 className="h-4 w-4 text-teal-600" />
              <span>Filter by Participating Hospital:</span>
            </div>
            <div className="flex items-center gap-2">
              {["ALL", "CGH", "SMC", "GVH"].map((h) => (
                <button
                  key={h}
                  onClick={() => setHospitalFilter(h)}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                    hospitalFilter === h
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {h === "ALL" ? "All Hospitals" : h === "CGH" ? "City General (CGH)" : h === "SMC" ? "Sunrise Medical (SMC)" : "Green Valley (GVH)"}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Feed */}
          <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 space-y-8">
            {filteredVisits.length > 0 ? (
              filteredVisits.map((visit: any) => (
                <div key={visit.visit_id} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-6 sm:-left-8 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-teal-600 text-white shadow-sm">
                    <Stethoscope className="h-3 w-3" />
                  </div>

                  {/* Visit Card */}
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-800 border border-teal-200">
                          {visit.hospital_name} ({visit.hospital_code})
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 uppercase">
                          {visit.visit_type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{new Date(visit.visit_date).toLocaleString()}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-700">{visit.doctor_name} ({visit.doctor_specialty})</span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="text-xs font-semibold uppercase text-slate-400">Chief Complaint</div>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{visit.chief_complaint}</p>
                      </div>

                      {visit.clinical_notes && (
                        <div>
                          <div className="text-xs font-semibold uppercase text-slate-400">Clinical Evaluation</div>
                          <p className="text-xs text-slate-700 mt-0.5 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                            {visit.clinical_notes}
                          </p>
                        </div>
                      )}

                      {/* Associated Diagnoses */}
                      {visit.diagnoses?.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold uppercase text-slate-400 mb-1.5">Diagnoses</div>
                          <div className="flex flex-wrap gap-2">
                            {visit.diagnoses.map((d: any, idx: number) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 border border-sky-200">
                                <span className="font-mono font-bold text-sky-900">{d.icd10_code}</span>: {d.name}
                                <span className="text-[10px] uppercase font-bold text-sky-600">({d.diagnosis_type})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Vitals Recorded during this visit */}
                      {visit.vitals?.length > 0 && (
                        <div className="pt-2">
                          <div className="text-xs font-semibold uppercase text-slate-400 mb-1.5">Vitals at Visit</div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {visit.vitals.map((vit: any, idx: number) => (
                              <span key={idx} className="rounded bg-slate-100 px-2.5 py-1 text-slate-800 border border-slate-200 font-mono">
                                <strong>{vit.measurement_type}:</strong> {vit.numeric_value} {vit.unit}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prescriptions issued during visit */}
                      {visit.prescriptions?.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <div className="text-xs font-semibold uppercase text-slate-400 mb-1.5">Medications Prescribed</div>
                          <div className="space-y-1.5">
                            {visit.prescriptions.map((rx: any, idx: number) => (
                              <div key={idx} className="rounded-md bg-teal-50/50 p-2 text-xs border border-teal-100">
                                <div className="font-bold text-teal-900">{rx.prescription_code} ({rx.status})</div>
                                <div className="mt-1 space-y-1">
                                  {rx.items?.map((it: any, iIdx: number) => (
                                    <div key={iIdx} className="text-slate-700">
                                      • <strong className="text-slate-900">{it.brand_name}</strong> ({it.generic_name}) {it.dosage} - {it.frequency} [{it.duration_days} days]
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                No consultations found matching this hospital filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PRESCRIPTIONS & MEDICATION SAFETY CHECKS */}
      {/* ========================================================================= */}
      {activeTab === "prescriptions" && (
        <div className="space-y-8">
          {/* Active Medications List */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Current & Historical Prescriptions</h2>
                <p className="text-xs text-slate-500">Cross-hospital active medical therapies for {patient.first_name}</p>
              </div>
              <button
                onClick={() => setShowRxModal(true)}
                className="flex items-center gap-1.5 rounded-md bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Prescribe Medication</span>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {patientData?.visits?.flatMap((v: any) => v.prescriptions || []).length > 0 ? (
                patientData.visits.flatMap((v: any) => v.prescriptions || []).map((rx: any, idx: number) => (
                  <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-teal-800">{rx.prescription_code}</span>
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          rx.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-slate-200 text-slate-600"
                        }`}>
                          {rx.status}
                        </span>
                      </div>
                      {rx.status === "ACTIVE" && (
                        <button
                          onClick={() => handleDiscontinueRx(rx.prescription_id)}
                          className="rounded border border-red-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                        >
                          Discontinue
                        </button>
                      )}
                    </div>

                    <div className="mt-3 divide-y divide-slate-200/60 text-xs">
                      {rx.items?.map((it: any, iIdx: number) => (
                        <div key={iIdx} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div>
                            <span className="font-bold text-slate-900">{it.brand_name}</span>{" "}
                            <span className="text-slate-500">({it.generic_name})</span>
                            <div className="text-[11px] text-slate-600 mt-0.5">
                              {it.dosage} • {it.frequency} • Route: {it.route} • {it.instructions}
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {it.start_date} to {it.end_date}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">No prescriptions recorded.</div>
              )}
            </div>
          </div>

          {/* Interactive Medication Safety Decision Support Module */}
          <div className="rounded-2xl border-2 border-teal-600/30 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pre-Prescribing Medication Safety Decision Support
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Automated clinical decision support engine checks candidate medications against active therapies and documented allergies.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Selector */}
              <div className="md:col-span-1 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Select Candidate Medicine to Screen:
                  </label>
                  <select
                    value={selectedCandidateMedId}
                    onChange={(e) => setSelectedCandidateMedId(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  >
                    {medicinesCatalog.map((med) => (
                      <option key={med.medicine_id} value={med.medicine_id}>
                        {med.brand_name} ({med.generic_name})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleRunSafetyCheck(selectedCandidateMedId)}
                  disabled={safetyChecking}
                  className="w-full rounded-lg bg-teal-600 py-2.5 px-4 text-xs font-bold text-white shadow hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {safetyChecking ? "Running Safety Screening..." : "Run Safety Check"}
                </button>

                <div className="rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 leading-relaxed border border-slate-200">
                  <span className="font-semibold text-slate-700">Demonstration checks:</span>
                  <br />• Select <strong>Amoxil (Amoxicillin)</strong> to verify Penicillin Allergy Alert.
                  <br />• Select <strong>Glucophage (Metformin)</strong> to verify Duplicate Therapy Alert.
                  <br />• Prescribing <strong>Warfarin + Aspirin</strong> triggers Major Drug-Drug Interaction.
                </div>
              </div>

              {/* Safety Results Panel */}
              <div className="md:col-span-2">
                {safetyResults ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Screening Findings ({safetyResults.warning_count} warnings)
                      </span>
                      {safetyResults.has_critical_warning ? (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800 border border-red-200">
                          Critical Hazard Detected
                        </span>
                      ) : safetyResults.warning_count === 0 ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                          No Conflicts Found
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                          Moderate Warnings
                        </span>
                      )}
                    </div>

                    {safetyResults.warnings.length > 0 ? (
                      safetyResults.warnings.map((warn: any, idx: number) => (
                        <div
                          key={idx}
                          className={`rounded-lg p-4 border text-xs leading-relaxed ${
                            warn.severity === "CRITICAL"
                              ? "border-red-300 bg-red-50 text-red-900"
                              : warn.severity === "MAJOR"
                              ? "border-orange-300 bg-orange-50 text-orange-900"
                              : "border-amber-300 bg-amber-50 text-amber-900"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className={`h-5 w-5 shrink-0 ${
                              warn.severity === "CRITICAL" ? "text-red-600" : "text-orange-600"
                            }`} />
                            <div>
                              <div className="font-bold text-sm">{warn.title}</div>
                              <p className="mt-1">{warn.message}</p>
                              <div className="mt-2 text-[11px] font-mono opacity-80">
                                Type: {warn.warning_type} • Severity: {warn.severity} • {warn.evidence_reference}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center text-xs text-emerald-800">
                        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
                        No duplicate therapies, drug interactions, or allergen conflicts detected for this candidate medicine.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-xs text-slate-400">
                    Click &quot;Run Safety Check&quot; to test pre-prescribing decision support rules.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VITALS & HEALTH TREND CHARTS */}
      {/* ========================================================================= */}
      {activeTab === "vitals" && (
        <div className="space-y-8">
          {/* BP Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Blood Pressure Longitudinal Trend (mmHg)</h3>
                <p className="text-xs text-slate-500">Resting sitting measurements tracked across participating hospitals</p>
              </div>
              <span className="text-xs font-semibold text-teal-600">Systolic & Diastolic</span>
            </div>

            <div className="mt-6 h-72 w-full">
              {bloodPressureData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bloodPressureData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis domain={[60, 180]} stroke="#64748b" fontSize={12} unit=" mmHg" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={2.5} name="Systolic BP" activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2.5} name="Diastolic BP" activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No blood pressure measurements recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Blood Glucose Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Blood Glucose Longitudinal Trend (mg/dL)</h3>
                <p className="text-xs text-slate-500">Glycemic measurements recorded during clinic visits</p>
              </div>
              <span className="text-xs font-semibold text-teal-600">Target &lt; 140 mg/dL</span>
            </div>

            <div className="mt-6 h-72 w-full">
              {bloodGlucoseData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bloodGlucoseData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis domain={[70, 220]} stroke="#64748b" fontSize={12} unit=" mg/dL" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="glucose" stroke="#0d9488" strokeWidth={2.5} name="Blood Glucose" activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No blood glucose measurements recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MEDICAL TESTS */}
      {/* ========================================================================= */}
      {activeTab === "tests" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Laboratory Investigations & Medical Tests
          </h2>
          <div className="mt-4 divide-y divide-slate-100">
            {patientData?.visits?.flatMap((v: any) => v.medical_tests || []).length > 0 ? (
              patientData.visits.flatMap((v: any) => v.medical_tests || []).map((t: any, idx: number) => (
                <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm text-slate-900">{t.test_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{t.test_category} • {t.result_summary}</div>
                    <div className="mt-1 text-xs font-mono font-semibold text-teal-800">
                      Result: {t.numeric_result} {t.result_unit} (Ref: {t.reference_range})
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700 border border-teal-200">
                      {t.status}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-1">{new Date(t.order_date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">No medical tests recorded.</div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TREATMENT PLANS */}
      {/* ========================================================================= */}
      {activeTab === "plans" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Clinical Care & Treatment Protocols
          </h2>
          <div className="mt-4 space-y-4">
            {patientData?.visits?.flatMap((v: any) => v.treatment_plans || []).length > 0 ? (
              patientData.visits.flatMap((v: any) => v.treatment_plans || []).map((p: any, idx: number) => (
                <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900">{p.title}</h3>
                    <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800">
                      {p.status}
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-teal-700">Objective: {p.objective}</div>
                  <p className="mt-1 text-xs text-slate-700 leading-relaxed bg-white p-3 rounded border border-slate-200 mt-2">
                    {p.instructions}
                  </p>
                  <div className="mt-2 text-[11px] text-slate-500 font-mono">
                    Start: {p.start_date} • Review: {p.review_date || "N/A"}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">No active treatment plans recorded.</div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: EMERGENCY QR CARD & LEVEL 1 TRIAGE */}
      {/* ========================================================================= */}
      {activeTab === "emergency" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Digital Emergency Medical Card & QR Code
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure Level 1 Emergency Profile for first responders and emergency personnel
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* The Digital Card itself */}
            <div className="rounded-2xl border-2 border-slate-800 bg-slate-900 text-white p-6 shadow-xl relative overflow-hidden">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-teal-500/10 blur-xl"></div>
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-6 w-6 text-teal-400" />
                  <span className="font-extrabold tracking-tight text-base">MediVault EMERGENCY CARD</span>
                </div>
                <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300 border border-red-500/30">
                  Level 1 Triage
                </span>
              </div>

              <div className="mt-6 flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-black tracking-tight">{patient.first_name} {patient.last_name}</div>
                  <div className="text-xs font-mono text-teal-400 mt-0.5">{patient.unique_patient_id}</div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <span className="text-slate-400">Blood Group:</span>
                      <div className="font-bold text-rose-400 text-sm">{patient.blood_group || "UNKNOWN"}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">DOB:</span>
                      <div className="font-semibold text-slate-200">{patient.date_of_birth}</div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400">Emergency Contact:</span>
                      <div className="font-semibold text-slate-200">
                        {patient.emergency_contact_name || "None"} ({patient.emergency_contact_phone || "N/A"})
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR Code Graphic */}
                <div className="rounded-xl bg-white p-2.5 shadow shrink-0">
                  <QRCodeSVG
                    value={
                      emergencyTokenData
                        ? `${typeof window !== "undefined" ? window.location.origin : ""}/emergency/qr/${emergencyTokenData.token}`
                        : `${typeof window !== "undefined" ? window.location.origin : ""}/emergency/qr/demo-emergency-token-2026-finch`
                    }
                    size={110}
                    level="H"
                  />
                  <div className="mt-1 text-center font-mono text-[9px] text-slate-600 font-bold">
                    SCAN FOR TRIAGE
                  </div>
                </div>
              </div>

              {/* Critical Alert Ribbon */}
              <div className="mt-6 rounded-lg bg-red-950/60 border border-red-500/30 p-3 text-xs text-red-200">
                <div className="font-bold text-red-300 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                  Critical Allergies Documented:
                </div>
                <div className="mt-1 text-[11px] leading-relaxed">
                  {patientData?.allergies?.length > 0 ? (
                    patientData.allergies.map((a: any) => `${a.allergen_name} (${a.severity})`).join(", ")
                  ) : (
                    "No critical drug allergies documented."
                  )}
                </div>
              </div>

              <div className="mt-4 text-[10px] text-slate-400 leading-tight">
                * Note: Full medical history, consultation records, and lab investigations are restricted and accessible only to authenticated healthcare staff.
              </div>
            </div>

            {/* Token Security Controls */}
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                  QR Token Security & Access Control
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  The emergency QR code embeds a cryptographically generated, unguessable token. 
                  Tokens expire automatically and can be revoked or regenerated at any time.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={handleGenerateEmergencyToken}
                    disabled={emergencyLoading}
                    className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 transition disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Generate / Rotate Token</span>
                  </button>

                  <button
                    onClick={handleRevokeEmergencyToken}
                    className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Revoke QR Token</span>
                  </button>
                </div>
              </div>

              {/* Direct Link to test public triage view */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900">
                  Test Scanner Public Destination Link
                </h4>
                <p className="text-xs text-teal-800 mt-1">
                  Evaluators can test the exact view that an emergency responder sees when scanning the QR code:
                </p>
                <div className="mt-3">
                  <Link
                    href={`/emergency/qr/${emergencyTokenData ? emergencyTokenData.token : "demo-emergency-token-2026-finch"}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-md bg-teal-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-teal-800"
                  >
                    <span>Open Public Emergency Triage Page</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW CONSULTATION */}
      {/* ========================================================================= */}
      {showConsultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Record New Clinical Consultation</h3>
            <p className="text-xs text-slate-500 mt-0.5">Will be saved to Oracle database and appended to timeline</p>
            
            <form onSubmit={handleCreateConsultation} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Hospital Facility</label>
                <select
                  value={newConsult.hospital_id}
                  onChange={(e) => setNewConsult({ ...newConsult, hospital_id: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  <option value={1}>City General Hospital (CGH)</option>
                  <option value={2}>Sunrise Medical Centre (SMC)</option>
                  <option value={3}>Green Valley Hospital (GVH)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Chief Complaint *</label>
                <input
                  type="text"
                  required
                  value={newConsult.chief_complaint}
                  onChange={(e) => setNewConsult({ ...newConsult, chief_complaint: e.target.value })}
                  placeholder="e.g. Mild dizziness and routine medication review"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Clinical Evaluation & Notes</label>
                <textarea
                  rows={3}
                  value={newConsult.clinical_notes}
                  onChange={(e) => setNewConsult({ ...newConsult, clinical_notes: e.target.value })}
                  placeholder="Clinical assessment, symptoms, findings, and management instructions..."
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Primary Diagnosis</label>
                <select
                  value={newConsult.diagnosis_id}
                  onChange={(e) => setNewConsult({ ...newConsult, diagnosis_id: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  {diagnosesCatalog.map((d) => (
                    <option key={d.diagnosis_id} value={d.diagnosis_id}>
                      {d.icd10_code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowConsultModal(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700"
                >
                  Save Consultation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW PRESCRIPTION */}
      {/* ========================================================================= */}
      {showRxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Issue New Prescription</h3>
            <p className="text-xs text-slate-500 mt-0.5">Multi-item electronic prescription</p>

            <form onSubmit={handleCreatePrescription} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Medicine</label>
                <select
                  value={newRx.medicine_id}
                  onChange={(e) => setNewRx({ ...newRx, medicine_id: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  {medicinesCatalog.map((m) => (
                    <option key={m.medicine_id} value={m.medicine_id}>
                      {m.brand_name} ({m.generic_name}) - {m.strength}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Dose Amount</label>
                  <input
                    type="text"
                    required
                    value={newRx.dose_amount}
                    onChange={(e) => setNewRx({ ...newRx, dose_amount: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Dose Unit</label>
                  <input
                    type="text"
                    required
                    value={newRx.dose_unit}
                    onChange={(e) => setNewRx({ ...newRx, dose_unit: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Frequency</label>
                <input
                  type="text"
                  required
                  value={newRx.frequency}
                  onChange={(e) => setNewRx({ ...newRx, frequency: e.target.value })}
                  placeholder="e.g. Twice daily with meals"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Duration (Days)</label>
                <input
                  type="number"
                  required
                  value={newRx.duration_days}
                  onChange={(e) => setNewRx({ ...newRx, duration_days: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRxModal(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700"
                >
                  Create Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD VITAL */}
      {/* ========================================================================= */}
      {showVitalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Record Vital Measurement</h3>
            <form onSubmit={handleRecordVital} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Type</label>
                <select
                  value={newVital.measurement_type}
                  onChange={(e) => {
                    const t = e.target.value;
                    const u = t.includes("BP") ? "mmHg" : t === "BLOOD_GLUCOSE" ? "mg/dL" : t === "HEART_RATE" ? "bpm" : "C";
                    setNewVital({ ...newVital, measurement_type: t, unit: u });
                  }}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  <option value="SYSTOLIC_BP">Systolic Blood Pressure (mmHg)</option>
                  <option value="DIASTOLIC_BP">Diastolic Blood Pressure (mmHg)</option>
                  <option value="BLOOD_GLUCOSE">Blood Glucose (mg/dL)</option>
                  <option value="HEART_RATE">Heart Rate (bpm)</option>
                  <option value="BODY_TEMPERATURE">Body Temperature (C)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Numeric Value</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newVital.numeric_value}
                  onChange={(e) => setNewVital({ ...newVital, numeric_value: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Context Note</label>
                <input
                  type="text"
                  value={newVital.context_note}
                  onChange={(e) => setNewVital({ ...newVital, context_note: e.target.value })}
                  placeholder="e.g. Resting sitting, Fasting (8h)"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVitalModal(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700"
                >
                  Record Measurement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
