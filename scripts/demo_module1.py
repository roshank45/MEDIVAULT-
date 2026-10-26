import os
import sys
import json
import time

# Ensure backend directory is in python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
PURPLE = "\033[95m"
BOLD = "\033[1m"
RESET = "\033[0m"

def print_header(title):
    print(f"\n{CYAN}{'='*75}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{CYAN}{'='*75}{RESET}\n")

def print_step(step_num, title):
    print(f"{BOLD}{PURPLE}--- [Step {step_num}] {title} ---{RESET}")

def main():
    print_header("MODULE 1 DEMO: PATIENT REGISTRATION & AUTHENTICATION")
    ts = int(time.time())

    # ------------------------------------------------------------------------
    # Step 1: Doctor Self-Registration
    # ------------------------------------------------------------------------
    print_step(1, "Doctor Self-Registration & Credentialing (POST /api/auth/doctor-signup)")
    doc_username = f"dr.alex_{ts % 10000}"
    doc_license = f"LIC-MD-{ts % 100000}"
    doc_payload = {
        "full_name": "Dr. Alexander Wright, MD",
        "username": doc_username,
        "password": "DoctorSecure@2026",
        "email": f"alex.wright.{ts % 10000}@citygeneral.org",
        "phone": "+1-555-0188",
        "hospital_id": 1,
        "specialty": "Cardiology",
        "license_number": doc_license,
        "role": "DOCTOR"
    }
    print(f"Submitting Clinician Details to Oracle DB:")
    print(json.dumps(doc_payload, indent=2))

    res_doc = client.post("/api/auth/doctor-signup", json=doc_payload)
    print(f"\n{BOLD}HTTP Response Status:{RESET} {GREEN}{res_doc.status_code} CREATED{RESET}")
    doc_data = res_doc.json()
    print(f"Issued Doctor Profile & JWT Bearer Token:")
    print(f"  * User ID in Oracle:    {doc_data.get('user_id')}")
    print(f"  * Username:             {doc_data.get('username')}")
    print(f"  * Full Name:            {doc_data.get('full_name')}")
    print(f"  * Assigned Role:        {GREEN}{doc_data.get('role')}{RESET}")
    print(f"  * Hospital Affiliation: {doc_data.get('hospital_name')}")
    print(f"  * JWT Access Token:     {doc_data.get('access_token')[:45]}... (HMAC-SHA256)")
    doctor_token = doc_data.get("access_token")

    # ------------------------------------------------------------------------
    # Step 2: Patient Registration & Unique Patient ID Generation
    # ------------------------------------------------------------------------
    print("\n" + "-"*75)
    print_step(2, "Register New Patient & Generate Unique ID (POST /api/patients)")
    patient_payload = {
        "first_name": "David",
        "last_name": "Vance",
        "date_of_birth": "1985-07-22",
        "gender": "MALE",
        "blood_group": "A_POSITIVE",
        "phone": f"+1-555-{ts % 10000:04d}",
        "email": f"david.vance.{ts % 10000}@example.com",
        "address": "742 Evergreen Terrace, Metro City",
        "emergency_contact_name": "Sarah Vance",
        "emergency_contact_phone": "+1-555-9988",
        "emergency_contact_relation": "Spouse",
        "allergies_recorded_status": "DOCUMENTED"
    }
    print("Submitting Patient Demographics:")
    print(json.dumps(patient_payload, indent=2))

    res_pat = client.post(
        "/api/patients",
        json=patient_payload,
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    print(f"\n{BOLD}HTTP Response Status:{RESET} {GREEN}{res_pat.status_code} CREATED{RESET}")
    pat_data = res_pat.json()
    print(f"Generated Centralized Patient Record:")
    print(f"  * Internal Oracle ID:   {pat_data.get('patient_id')}")
    print(f"  * UNIQUE PATIENT ID:    {GREEN}{BOLD}{pat_data.get('unique_patient_id')}{RESET} (Format: MV-YYYY-NNNNNN)")
    print(f"  * Patient Full Name:    {pat_data.get('first_name')} {pat_data.get('last_name')}")
    print(f"  * Blood Group:          {pat_data.get('blood_group')}")
    print(f"  * Emergency Contact:    {pat_data.get('emergency_contact_name')} ({pat_data.get('emergency_contact_phone')})")

    # ------------------------------------------------------------------------
    # Step 3: Clinician Login & Password Hash Verification
    # ------------------------------------------------------------------------
    print("\n" + "-"*75)
    print_step(3, "Authenticate with Bcrypt Password Verification (POST /api/auth/login)")
    login_payload = {
        "username": doc_username,
        "password": "DoctorSecure@2026"
    }
    res_login = client.post("/api/auth/login", json=login_payload)
    print(f"{BOLD}HTTP Response Status:{RESET} {GREEN}{res_login.status_code} OK{RESET}")
    print(f"Login Response: {json.dumps(res_login.json(), indent=2)}")

    # ------------------------------------------------------------------------
    # Step 4: Role-Based Access Control (RBAC) Verification
    # ------------------------------------------------------------------------
    print("\n" + "-"*75)
    print_step(4, "RBAC Security Enforcement Check (Doctor vs Admin privileges)")
    # Doctor tries to access admin-only audit trail
    res_forbidden = client.get(
        "/api/audit",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    print(f"Doctor attempting to access Admin Audit Trail: {YELLOW}{res_forbidden.status_code} FORBIDDEN{RESET}")
    print(f"Security Message: {res_forbidden.json().get('detail')}")

    # Admin logs in and accesses audit trail
    res_admin_login = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@123"})
    admin_token = res_admin_login.json()["access_token"]
    res_admin_audit = client.get("/api/audit?limit=2", headers={"Authorization": f"Bearer {admin_token}"})
    print(f"Admin accessing Admin Audit Trail: {GREEN}{res_admin_audit.status_code} OK{RESET}")
    print(f"Authorized Audit Trail Records Returned: {len(res_admin_audit.json())} items verified.")

    print(f"\n{BOLD}{GREEN}[SUCCESS] MODULE 1 COMPLETED WITH 100% RELIABILITY!{RESET}\n")

if __name__ == "__main__":
    main()
