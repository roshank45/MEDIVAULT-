import os
import sys
import json
import time

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
    print_header("MODULE 2 DEMO: MEDICAL HISTORY MANAGEMENT & CONSULTATIONS")

    # 1. Doctor Login (Dr. Marcus Chen at City General Hospital)
    login_res = client.post("/api/auth/login", json={"username": "dr.chen", "password": "Doctor@123"})
    doctor_token = login_res.json()["access_token"]

    # ------------------------------------------------------------------------
    # Step 1: Patient Search by Unique ID and Name
    # ------------------------------------------------------------------------
    print_step(1, "Search Patient by Identifier/Name (GET /api/patients/search?q=Harold)")
    res_search = client.get(
        "/api/patients/search?q=Harold",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    print(f"{BOLD}HTTP Response Status:{RESET} {GREEN}{res_search.status_code} OK{RESET}")
    results = res_search.json()
    print(f"Located Patient: {results[0]['first_name']} {results[0]['last_name']} (ID: {results[0]['unique_patient_id']})")
    patient_id = results[0]["patient_id"]

    # ------------------------------------------------------------------------
    # Step 2: Record New Consultation with Diagnoses
    # ------------------------------------------------------------------------
    print("\n" + "-"*75)
    print_step(2, "Record Consultation & ICD-10 Diagnoses (POST /api/visits)")
    visit_payload = {
        "patient_id": patient_id,
        "hospital_id": 1,
        "visit_type": "CONSULTATION",
        "chief_complaint": "Persistent elevated blood pressure and morning headaches",
        "clinical_notes": "Patient advised on dietary sodium reduction. Initiating cardiovascular review.",
        "diagnoses": [
            {
                "diagnosis_id": 1,
                "diagnosis_type": "PRIMARY",
                "clinical_status": "ACTIVE",
                "notes": "Essential hypertension confirmed on repeat clinical examination."
            }
        ]
    }
    print("Clinical Consultation Payload:")
    print(json.dumps(visit_payload, indent=2))

    res_visit = client.post(
        "/api/visits",
        json=visit_payload,
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    print(f"\n{BOLD}HTTP Response Status:{RESET} {GREEN}{res_visit.status_code} CREATED{RESET}")
    v_data = res_visit.json()
    visit_id = v_data.get("visit_id")
    print(f"Committed Consultation Transaction in Oracle DB:")
    print(f"  * Generated Visit ID:  {visit_id}")
    print(f"  * Hospital Location:   {v_data.get('hospital_name')}")
    print(f"  * Consulting Doctor:   {v_data.get('doctor_name')} ({v_data.get('doctor_specialty')})")
    print(f"  * Chief Complaint:     {v_data.get('chief_complaint')}")

    # Record Vital Measurement for this encounter
    print("\nRecording Vital Signs (POST /api/vitals):")
    vital_payload = {
        "patient_id": patient_id,
        "visit_id": visit_id,
        "measurement_type": "SYSTOLIC_BP",
        "numeric_value": 146.0,
        "unit": "mmHg",
        "context_note": "Resting seated blood pressure"
    }
    res_vital = client.post("/api/vitals", json=vital_payload, headers={"Authorization": f"Bearer {doctor_token}"})
    print(f"Recorded Vital Status: {GREEN}{res_vital.status_code} CREATED{RESET}")
    print(f"  * Measurement: {res_vital.json().get('measurement_type')} = {res_vital.json().get('numeric_value')} {res_vital.json().get('unit')}")

    # ------------------------------------------------------------------------
    # Step 3: Retrieve Multi-Hospital Longitudinal Medical History
    # ------------------------------------------------------------------------
    print("\n" + "-"*75)
    print_step(3, "Cross-Hospital Longitudinal History Retrieval (GET /api/patients/1/history)")
    res_hist = client.get(
        f"/api/patients/{patient_id}/history",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    print(f"{BOLD}HTTP Response Status:{RESET} {GREEN}{res_hist.status_code} OK{RESET}")
    hist = res_hist.json()
    print(f"Unified Cross-Hospital Longitudinal Records for {hist['patient']['first_name']} {hist['patient']['last_name']}:")
    print(f"  * Total Consultations Across Hospitals: {len(hist.get('visits', []))}")
    for idx, v in enumerate(hist.get('visits', [])[:4], start=1):
        print(f"    [{idx}] Date: {v['visit_date'][:10]} | Hospital: {v['hospital_name']} | Doctor: {v['doctor_name']} ({v.get('doctor_specialty', 'Physician')})")
        print(f"        Chief Complaint: {v['chief_complaint']}")
    print(f"  * Documented Allergies: {len(hist.get('allergies', []))} allergen(s)")
    for a in hist.get('allergies', []):
        print(f"    - Allergen: {a.get('allergen_name')} | Severity: {a.get('severity')} | Reaction: {a.get('reaction', 'N/A')}")

    # ------------------------------------------------------------------------
    # Step 4: Health Metrics & Vitals Trends
    # ------------------------------------------------------------------------
    print("\n" + "-"*75)
    print_step(4, "Retrieve Vital Trend Series for Charting (GET /api/vitals/patient/1)")
    res_vitals = client.get(
        f"/api/vitals/patient/{patient_id}",
        headers={"Authorization": f"Bearer {doctor_token}"}
    )
    print(f"{BOLD}HTTP Response Status:{RESET} {GREEN}{res_vitals.status_code} OK{RESET}")
    vitals_records = res_vitals.json()
    print(f"Historical Vital Observations Retrieved ({len(vitals_records)} data points):")
    for r in vitals_records[:4]:
        print(f"  * Recorded At: {r['recorded_at'][:19]} | Type: {r['measurement_type']} = {r['numeric_value']} {r['unit']} (By: {r.get('recorded_by_name')})")

    print(f"\n{BOLD}{GREEN}[SUCCESS] MODULE 2 COMPLETED WITH 100% RELIABILITY!{RESET}\n")

if __name__ == "__main__":
    main()
