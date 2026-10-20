"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Shield,
  PlusCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Activity,
  ArrowRight
} from "lucide-react";
import { api } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Hospital Modal
  const [showHospModal, setShowHospModal] = useState(false);
  const [newHosp, setNewHosp] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "NY",
    phone: "",
    email: "",
  });

  // New User Modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    hospital_id: 1,
    username: "",
    password: "",
    full_name: "",
    email: "",
    phone: "",
    role: "DOCTOR",
    specialty: "",
    license_number: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [hList, uList] = await Promise.all([
        api.admin.getHospitals(),
        api.admin.getUsers(),
      ]);
      setHospitals(hList);
      setUsers(uList);
    } catch (err: any) {
      console.error(err);
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
    loadData();
  }, [router]);

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.admin.createHospital(newHosp);
      setShowHospModal(false);
      setNewHosp({ name: "", code: "", address: "", city: "", state: "NY", phone: "", email: "" });
      loadData();
      alert("Hospital registered successfully in Oracle repository!");
    } catch (err: any) {
      alert(err.message || "Failed to register hospital.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.admin.createUser(newUser);
      setShowUserModal(false);
      setNewUser({
        hospital_id: 1,
        username: "",
        password: "",
        full_name: "",
        email: "",
        phone: "",
        role: "DOCTOR",
        specialty: "",
        license_number: "",
      });
      loadData();
      alert("Staff user account created successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to create user account.");
    }
  };

  const handleToggleStatus = async (userId: number, currentStatus: number) => {
    const nextStatus = currentStatus === 1 ? 0 : 1;
    try {
      await api.admin.toggleUserStatus(userId, nextStatus);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update user status.");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-slate-500">
        Loading administration directory...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Administration & Hospital Federation
          </h1>
          <p className="text-xs text-slate-500">
            Manage participating institutions, doctor staff accounts, and security privileges
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/audit"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" />
            <span>Audit Trail Viewer</span>
          </Link>
          <button
            onClick={() => setShowHospModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700"
          >
            <Building2 className="h-4 w-4" />
            <span>Add Hospital</span>
          </button>
          <button
            onClick={() => setShowUserModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800"
          >
            <Users className="h-4 w-4" />
            <span>Add Staff Account</span>
          </button>
        </div>
      </div>

      {/* Section 1: Participating Hospitals */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-teal-600" />
          Participating Hospital Facilities ({hospitals.length})
        </h2>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {hospitals.map((h) => (
            <div key={h.hospital_id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{h.name}</span>
                <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-mono font-bold text-teal-800">
                  {h.code}
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-600 space-y-1">
                <div>{h.address}, {h.city}, {h.state}</div>
                <div>Phone: {h.phone}</div>
                <div>Email: {h.email || "N/A"}</div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Federated Oracle Node Active</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Authorized Staff Users */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-teal-600" />
          Authorized Healthcare & System Accounts ({users.length})
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Affiliated Hospital</th>
                <th className="px-4 py-3">Specialty / License</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.map((u) => (
                <tr key={u.user_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">{u.full_name}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-800">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">{u.hospital_name || "Federated System"}</td>
                  <td className="px-4 py-3">
                    {u.specialty ? `${u.specialty} (${u.license_number})` : "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active === 1 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                        <XCircle className="h-3.5 w-3.5" /> Deactivated
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleStatus(u.user_id, u.is_active)}
                      className={`rounded px-2.5 py-1 text-[11px] font-semibold border ${
                        u.is_active === 1
                          ? "border-red-300 text-red-600 hover:bg-red-50"
                          : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {u.is_active === 1 ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Hospital */}
      {showHospModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Register Participating Hospital</h3>
            <form onSubmit={handleCreateHospital} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Hospital Name</label>
                <input
                  type="text"
                  required
                  value={newHosp.name}
                  onChange={(e) => setNewHosp({ ...newHosp, name: e.target.value })}
                  placeholder="e.g. St. Jude Regional Hospital"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Hospital Code (Unique)</label>
                  <input
                    type="text"
                    required
                    value={newHosp.code}
                    onChange={(e) => setNewHosp({ ...newHosp, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SJH"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">City</label>
                  <input
                    type="text"
                    required
                    value={newHosp.city}
                    onChange={(e) => setNewHosp({ ...newHosp, city: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Address</label>
                <input
                  type="text"
                  required
                  value={newHosp.address}
                  onChange={(e) => setNewHosp({ ...newHosp, address: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Phone</label>
                <input
                  type="text"
                  required
                  value={newHosp.phone}
                  onChange={(e) => setNewHosp({ ...newHosp, phone: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowHospModal(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add User Account */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Create Healthcare Staff Account</h3>
            <form onSubmit={handleCreateUser} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    placeholder="e.g. Dr. Jane Doe"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Username</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="e.g. dr.jane"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="DOCTOR">Doctor</option>
                    <option value="EMERGENCY_CLINICIAN">Emergency Clinician</option>
                    <option value="ADMIN">System Administrator</option>
                    <option value="PATIENT">Patient</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Hospital Facility</label>
                  <select
                    value={newUser.hospital_id}
                    onChange={(e) => setNewUser({ ...newUser, hospital_id: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    {hospitals.map((h) => (
                      <option key={h.hospital_id} value={h.hospital_id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Specialty</label>
                  <input
                    type="text"
                    value={newUser.specialty}
                    onChange={(e) => setNewUser({ ...newUser, specialty: e.target.value })}
                    placeholder="e.g. Cardiology"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">License Number</label>
                  <input
                    type="text"
                    value={newUser.license_number}
                    onChange={(e) => setNewUser({ ...newUser, license_number: e.target.value })}
                    placeholder="MD-NY-1234"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow hover:bg-slate-800"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
