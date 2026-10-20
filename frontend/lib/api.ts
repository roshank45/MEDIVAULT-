// MediVault API Client

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("medivault_token");
  }
  return null;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.detail || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

export const api = {
  auth: {
    login: (credentials: any) =>
      apiRequest<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      }),
    me: () => apiRequest<any>("/auth/me"),
    logout: () => apiRequest<any>("/auth/logout", { method: "POST" }),
  },
  patients: {
    register: (data: any) =>
      apiRequest<any>("/patients", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    search: (query: string) =>
      apiRequest<any[]>(`/patients/search?q=${encodeURIComponent(query)}`),
    getById: (id: number | string) =>
      apiRequest<any>(`/patients/${id}`),
    getHistory: (id: number | string) =>
      apiRequest<any>(`/patients/${id}/history`),
  },
  visits: {
    create: (data: any) =>
      apiRequest<any>("/visits", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getById: (id: number | string) =>
      apiRequest<any>(`/visits/${id}`),
    getDiagnosesCatalog: () =>
      apiRequest<any[]>("/visits/diagnoses/catalog"),
  },
  prescriptions: {
    create: (data: any) =>
      apiRequest<any>("/prescriptions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getByPatient: (patientId: number | string) =>
      apiRequest<any[]>(`/prescriptions/patient/${patientId}`),
    discontinue: (rxId: number | string, reason?: string) =>
      apiRequest<any>(`/prescriptions/${rxId}/discontinue?reason=${encodeURIComponent(reason || "Discontinued")}`, {
        method: "PATCH",
      }),
    getMedicines: () =>
      apiRequest<any[]>("/prescriptions/medicines"),
  },
  safety: {
    check: (patientId: number | string, candidateMedicines: any[]) =>
      apiRequest<any>("/safety/check", {
        method: "POST",
        body: JSON.stringify({
          patient_id: Number(patientId),
          candidate_medicines: candidateMedicines,
        }),
      }),
    getInteractions: () =>
      apiRequest<any>("/safety/interactions"),
  },
  vitals: {
    record: (data: any) =>
      apiRequest<any>("/vitals", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getByPatient: (patientId: number | string, type?: string) =>
      apiRequest<any[]>(`/vitals/patient/${patientId}${type ? `?measurement_type=${type}` : ""}`),
    recordAllergy: (data: any) =>
      apiRequest<any>("/vitals/allergies", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getAllergies: (patientId: number | string) =>
      apiRequest<any[]>(`/vitals/allergies/patient/${patientId}`),
  },
  clinicalCare: {
    recordTest: (data: any) =>
      apiRequest<any>("/clinical-care/tests", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getTests: (patientId: number | string) =>
      apiRequest<any[]>(`/clinical-care/tests/patient/${patientId}`),
    createPlan: (data: any) =>
      apiRequest<any>("/clinical-care/treatment-plans", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getPlans: (patientId: number | string) =>
      apiRequest<any[]>(`/clinical-care/treatment-plans/patient/${patientId}`),
  },
  emergency: {
    generateToken: (patientId: number | string) =>
      apiRequest<any>(`/emergency/generate/${patientId}`, { method: "POST" }),
    revokeToken: (patientId: number | string) =>
      apiRequest<any>(`/emergency/revoke/${patientId}`, { method: "POST" }),
    getPublicProfile: (token: string) =>
      apiRequest<any>(`/emergency/public/${token}`),
    breakGlass: (data: any) =>
      apiRequest<any>("/emergency/break-glass", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  admin: {
    getHospitals: () => apiRequest<any[]>("/admin/hospitals"),
    createHospital: (data: any) =>
      apiRequest<any>("/admin/hospitals", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getUsers: () => apiRequest<any[]>("/admin/users"),
    createUser: (data: any) =>
      apiRequest<any>("/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    toggleUserStatus: (userId: number, isActive: number) =>
      apiRequest<any>(`/admin/users/${userId}/status?is_active=${isActive}`, {
        method: "PATCH",
      }),
    getMetrics: () => apiRequest<any>("/admin/metrics"),
  },
  audit: {
    getLogs: (limit = 50, eventType?: string) =>
      apiRequest<any[]>(`/audit?limit=${limit}${eventType ? `&event_type=${eventType}` : ""}`),
  },
};
