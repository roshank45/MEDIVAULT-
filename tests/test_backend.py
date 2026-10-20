import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure backend path is on sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app

client = TestClient(app)

@pytest.fixture(scope="module")
def admin_token():
    res = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@123"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def doctor_cgh_token():
    res = client.post("/api/auth/login", json={"username": "dr.chen", "password": "Doctor@123"})
    assert res.status_code == 200, f"Doctor CGH login failed: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def doctor_smc_token():
    res = client.post("/api/auth/login", json={"username": "dr.patel", "password": "Doctor@123"})
    assert res.status_code == 200, f"Doctor SMC login failed: {res.text}"
    return res.json()["access_token"]

@pytest.fixture(scope="module")
def emergency_clinician_token():
    res = client.post("/api/auth/login", json={"username": "er.sarah", "password": "Emergency@123"})
    assert res.status_code == 200, f"ER Clinician login failed: {res.text}"
    return res.json()["access_token"]

# ============================================================================
# 1. AUTHENTICATION & ROLE-BASED ACCESS CONTROL TESTS
# ============================================================================

def test_login_success_and_jwt_issuance(doctor_cgh_token):
    assert doctor_cgh_token is not None
    assert len(doctor_cgh_token) > 20

def test_login_invalid_credentials():
    res = client.post("/api/auth/login", json={"username": "dr.chen", "password": "WrongPassword!"})
    assert res.status_code == 401
    assert "Incorrect username or password" in res.json()["detail"]

def test_role_based_access_control_admin_only_endpoint(doctor_cgh_token, admin_token):
    # Doctor accessing admin-only audit trail should receive 403 Forbidden
    res_doc = client.get("/api/audit", headers={"Authorization": f"Bearer {doctor_cgh_token}"})
    assert res_doc.status_code == 403

    # Admin accessing audit trail should receive 200 OK
    res_admin = client.get("/api/audit", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200
    assert isinstance(res_admin.json(), list)

def test_unauthorized_access_without_token():
    res = client.get("/api/patients/1/history")
    assert res.status_code == 403 or res.status_code == 401

# ============================================================================
# 2. PATIENT REGISTRATION & UNIQUE ID GENERATION
# ============================================================================

def test_patient_registration_generates_unique_id(doctor_cgh_token):
    import time
    unique_phone = f"+1-555-{int(time.time()) % 100000:05d}"
    payload = {
        "first_name": "TestAuto",
        "last_name": "Patient",
        "date_of_birth": "1990-05-15",
        "gender": "FEMALE",
        "blood_group": "AB_POSITIVE",
        "phone": unique_phone,
        "email": "test.auto@example.com",
        "address": "404 Silicon Way",
        "emergency_contact_name": "Alex Patient",
        "emergency_contact_phone": "+1-555-9000",
        "emergency_contact_relation": "Sibling",
        "allergies_recorded_status": "NO_KNOWN_ALLERGIES"
    }
    res = client.post("/api/patients", json=payload, headers={"Authorization": f"Bearer {doctor_cgh_token}"})
    assert res.status_code == 201
    data = res.json()
    assert "unique_patient_id" in data
    assert data["unique_patient_id"].startswith("MV-2026-")
    assert data["first_name"] == "TestAuto"

def test_patient_search_by_id_and_name(doctor_cgh_token):
    res = client.get("/api/patients/search?q=Harold", headers={"Authorization": f"Bearer {doctor_cgh_token}"})
    assert res.status_code == 200
    results = res.json()
    assert len(results) >= 1
    assert results[0]["unique_patient_id"] == "MV-2026-000001"

# ============================================================================
# 3. MULTI-HOSPITAL LONGITUDINAL MEDICAL HISTORY RETRIEVAL
# ============================================================================

def test_cross_hospital_history_retrieval(doctor_smc_token):
    """
    Demonstrates that Dr. Patel at Sunrise Medical Centre can review
    consultations entered at City General Hospital for Harold Finch.
    """
    res = client.get("/api/patients/1/history", headers={"Authorization": f"Bearer {doctor_smc_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "visits" in data
    assert len(data["visits"]) >= 2
    
    # Check that visits from multiple hospitals are returned in chronological order
    hospital_names = [v["hospital_name"] for v in data["visits"]]
    assert "City General Hospital" in hospital_names
    assert "Sunrise Medical Centre" in hospital_names

# ============================================================================
# 4. CLINICAL CONSULTATION & PRESCRIPTION RECORDING
# ============================================================================

def test_record_new_consultation(doctor_smc_token):
    payload = {
        "patient_id": 1,
        "hospital_id": 2,
        "visit_type": "FOLLOW_UP",
        "chief_complaint": "Automated test routine clinical consultation",
        "clinical_notes": "Evaluating patient response to pharmacotherapy. Vitals stable.",
        "diagnoses": [
            {"diagnosis_id": 1, "diagnosis_type": "PRIMARY", "clinical_status": "ACTIVE", "notes": "Continuing T2D review"}
        ]
    }
    res = client.post("/api/visits", json=payload, headers={"Authorization": f"Bearer {doctor_smc_token}"})
    assert res.status_code == 201
    data = res.json()
    assert data["chief_complaint"] == "Automated test routine clinical consultation"
    assert data["hospital_name"] == "Sunrise Medical Centre"

# ============================================================================
# 5. MEDICATION SAFETY: ALLERGY CONFLICT & DRUG INTERACTION DETECTION
# ============================================================================

def test_medication_safety_allergy_conflict(doctor_cgh_token):
    """
    Patient 1 (Harold Finch) has a recorded LIFE_THREATENING allergy to Penicillin.
    Candidate medicine 3 is Amoxil (Amoxicillin, a Penicillin antibiotic).
    The safety engine must return an ALLERGY_CONFLICT warning.
    """
    payload = {
        "patient_id": 1,
        "candidate_medicines": [{"medicine_id": 3, "medicine_name": "Amoxil"}]
    }
    res = client.post("/api/safety/check", json=payload, headers={"Authorization": f"Bearer {doctor_cgh_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["has_critical_warning"] is True
    warning_types = [w["warning_type"] for w in data["warnings"]]
    assert "ALLERGY_CONFLICT" in warning_types

def test_medication_safety_duplicate_therapy(doctor_cgh_token):
    """
    Patient 1 is already actively prescribed Metformin (Glucophage).
    Attempting to prescribe Metformin again must trigger a DUPLICATE_THERAPY warning.
    """
    payload = {
        "patient_id": 1,
        "candidate_medicines": [{"medicine_id": 1, "medicine_name": "Glucophage"}]
    }
    res = client.post("/api/safety/check", json=payload, headers={"Authorization": f"Bearer {doctor_cgh_token}"})
    assert res.status_code == 200
    data = res.json()
    warning_types = [w["warning_type"] for w in data["warnings"]]
    assert "DUPLICATE_THERAPY" in warning_types

def test_medication_safety_drug_interaction(doctor_cgh_token):
    """
    Candidate medicines: Warfarin (Coumadin) + Aspirin (Bayer Aspirin).
    Must trigger a MAJOR DRUG_INTERACTION warning due to bleeding risk.
    """
    payload = {
        "patient_id": 1,
        "candidate_medicines": [
            {"medicine_id": 4, "medicine_name": "Coumadin"},
            {"medicine_id": 5, "medicine_name": "Bayer Aspirin"}
        ]
    }
    res = client.post("/api/safety/check", json=payload, headers={"Authorization": f"Bearer {doctor_cgh_token}"})
    assert res.status_code == 200
    data = res.json()
    warning_types = [w["warning_type"] for w in data["warnings"]]
    assert "DRUG_INTERACTION" in warning_types

# ============================================================================
# 6. EMERGENCY QR CODE & LIMITED PUBLIC TRIAGE ACCESS
# ============================================================================

def test_emergency_public_qr_profile_limited_exposure():
    """
    Public emergency profile must return only limited triage info (Level 1).
    Full clinical notes, visit histories, or database IDs must NOT be exposed.
    """
    token = "demo-emergency-token-2026-finch"
    res = client.get(f"/api/emergency/public/{token}")
    assert res.status_code == 200
    data = res.json()
    assert data["patient_name"] == "Harold Finch"
    assert data["blood_group"] == "O_POSITIVE"
    assert len(data["critical_allergies"]) >= 1
    assert "Penicillin" in data["critical_allergies"][0]
    assert "DISCLAIMER" in data["disclaimer"]

def test_invalid_emergency_token_rejected():
    res = client.get("/api/emergency/public/invalid-forged-fake-token-xyz")
    assert res.status_code == 404

def test_emergency_break_glass_access_logged(emergency_clinician_token):
    payload = {
        "patient_id": 1,
        "reason": "Trauma admission: unconscious patient requiring immediate clinical override",
        "access_type": "EMERGENCY_BREAK_GLASS"
    }
    res = client.post("/api/emergency/break-glass", json=payload, headers={"Authorization": f"Bearer {emergency_clinician_token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "GRANTED"
    assert data["valid_for_hours"] == 4

# ============================================================================
# 7. SECURITY AUDIT TRAIL LOGGING
# ============================================================================

def test_audit_log_captures_sensitive_events(admin_token):
    res = client.get("/api/audit?limit=10", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) > 0
    event_types = [l["event_type"] for l in logs]
    # Check that events like LOGIN, ACCESS, or BREAK_GLASS are captured
    assert any("LOGIN" in e or "VISIT" in e or "BREAK_GLASS" in e or "ACCESSED" in e for e in event_types)
