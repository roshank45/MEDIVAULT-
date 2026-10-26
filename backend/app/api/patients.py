from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request
from app.core.database import query_all, query_one, execute_cmd
from app.core.security import get_current_user, require_roles
from app.models.schemas import PatientCreate, PatientOut
from app.services.audit_service import record_audit
from app.services.emergency_service import generate_emergency_token

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def register_patient(
    patient_in: PatientCreate,
    current_user: dict = Depends(require_roles(["ADMIN", "DOCTOR", "EMERGENCY_CLINICIAN"]))
):
    """
    Atomically registers a new patient in Oracle DB.
    Generates a unique patient identifier (e.g. MV-2026-000004) backed by PATIENT_SEQ.
    """
    # Comprehensive duplicate validation: prevent duplicate Name+DOB and duplicate Phone
    first = patient_in.first_name.strip()
    last = patient_in.last_name.strip()
    phone = patient_in.phone.strip()
    dob = patient_in.date_of_birth

    # 1. Prevent duplicate patient with same First Name, Last Name, and Date of Birth
    existing_name_dob = query_one(
        "SELECT patient_id, unique_patient_id, first_name, last_name FROM PATIENT WHERE "
        "LOWER(TRIM(first_name)) = LOWER(?) AND LOWER(TRIM(last_name)) = LOWER(?) "
        "AND date_of_birth = TO_DATE(?, 'YYYY-MM-DD')",
        (first, last, dob)
    )
    if existing_name_dob:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate patient detected: '{first} {last}' (DOB: {dob}) is already registered with ID {existing_name_dob['unique_patient_id']}."
        )

    # 2. Prevent duplicate patient with same Phone Number
    existing_phone = query_one(
        "SELECT patient_id, unique_patient_id, first_name, last_name FROM PATIENT WHERE phone = ?",
        (phone,)
    )
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate phone detected: Phone {phone} is already registered under patient {existing_phone['unique_patient_id']} ({existing_phone['first_name']} {existing_phone['last_name']})."
        )

    # Fetch next sequence value
    seq_row = query_one("SELECT PATIENT_SEQ.NEXTVAL as val FROM DUAL")
    next_id = int(seq_row["val"])
    year_str = datetime.now().strftime("%Y")
    unique_id = f"MV-{year_str}-{str(next_id).zfill(6)}"

    insert_sql = (
        "INSERT INTO PATIENT (PATIENT_ID, UNIQUE_PATIENT_ID, FIRST_NAME, LAST_NAME, DATE_OF_BIRTH, "
        "GENDER, BLOOD_GROUP, PHONE, EMAIL, ADDRESS, EMERGENCY_CONTACT_NAME, EMERGENCY_CONTACT_PHONE, "
        "EMERGENCY_CONTACT_RELATION, ALLERGIES_RECORDED_STATUS, CREATED_AT, UPDATED_AT) "
        "VALUES (?, ?, ?, ?, TO_DATE(?, 'YYYY-MM-DD'), ?, ?, ?, ?, ?, ?, ?, ?, ?, SYSTIMESTAMP, SYSTIMESTAMP)"
    )

    execute_cmd(insert_sql, (
        next_id,
        unique_id,
        patient_in.first_name.strip(),
        patient_in.last_name.strip(),
        patient_in.date_of_birth,
        patient_in.gender.upper(),
        patient_in.blood_group,
        patient_in.phone.strip(),
        patient_in.email.strip() if patient_in.email else None,
        patient_in.address,
        patient_in.emergency_contact_name,
        patient_in.emergency_contact_phone,
        patient_in.emergency_contact_relation,
        patient_in.allergies_recorded_status or "NOT_RECORDED"
    ))

    # Auto-generate initial emergency profile token for the patient
    generate_emergency_token(next_id)

    # Record registration in Audit Log
    record_audit(
        actor_user_id=current_user["user_id"],
        actor_role=current_user["role"],
        event_type="PATIENT_REGISTERED",
        target_entity="PATIENT",
        target_id=str(next_id),
        hospital_id=current_user.get("hospital_id"),
        patient_id=next_id,
        details=f"Registered patient {unique_id} ({patient_in.first_name} {patient_in.last_name})."
    )

    created = query_one("SELECT * FROM PATIENT WHERE patient_id = ?", (next_id,))
    return PatientOut(**created)

@router.get("/search", response_model=List[PatientOut])
def search_patients(
    q: str = Query(..., min_length=1, description="Unique Patient ID, name, or phone number"),
    current_user: dict = Depends(require_roles(["ADMIN", "DOCTOR", "EMERGENCY_CLINICIAN"]))
):
    query_param = f"%{q.strip().lower()}%"
    patients = query_all(
        "SELECT * FROM PATIENT WHERE LOWER(unique_patient_id) LIKE ? "
        "OR LOWER(first_name || ' ' || last_name) LIKE ? "
        "OR phone LIKE ? ORDER BY patient_id DESC",
        (query_param, query_param, query_param)
    )
    return [PatientOut(**p) for p in patients]

@router.get("/{patient_id}", response_model=PatientOut)
def get_patient_by_id(
    patient_id: int,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    # Patient role can only view their own record
    if current_user["role"] == "PATIENT":
        patient_user = query_one("SELECT user_id FROM PATIENT WHERE patient_id = ?", (patient_id,))
        if not patient_user or patient_user.get("user_id") != current_user["user_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this patient profile.")

    patient = query_one("SELECT * FROM PATIENT WHERE patient_id = ?", (patient_id,))
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient record not found.")

    client_ip = request.client.host if request.client else "127.0.0.1"
    record_audit(
        actor_user_id=current_user["user_id"],
        actor_role=current_user["role"],
        event_type="PATIENT_RECORD_ACCESSED",
        target_entity="PATIENT",
        target_id=str(patient_id),
        hospital_id=current_user.get("hospital_id"),
        patient_id=patient_id,
        details=f"Demographics accessed for patient {patient['unique_patient_id']}",
        ip_address=client_ip
    )

    return PatientOut(**patient)

@router.get("/{patient_id}/history")
def get_patient_longitudinal_history(
    patient_id: int,
    request: Request,
    current_user: dict = Depends(require_roles(["ADMIN", "DOCTOR", "PATIENT", "EMERGENCY_CLINICIAN"]))
):
    """
    Returns full longitudinal history across ALL participating hospitals:
    Chronologically organized by visit, including diagnoses, vitals, prescriptions, tests, plans.
    """
    # Role validation: Patient can only view their own history
    if current_user["role"] == "PATIENT":
        p_row = query_one("SELECT user_id FROM PATIENT WHERE patient_id = ?", (patient_id,))
        if not p_row or p_row.get("user_id") != current_user["user_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    patient = query_one("SELECT * FROM PATIENT WHERE patient_id = ?", (patient_id,))
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    # Record longitudinal access in audit trail
    client_ip = request.client.host if request.client else "127.0.0.1"
    record_audit(
        actor_user_id=current_user["user_id"],
        actor_role=current_user["role"],
        event_type="LONGITUDINAL_HISTORY_ACCESSED",
        target_entity="PATIENT_HISTORY",
        target_id=str(patient_id),
        hospital_id=current_user.get("hospital_id"),
        patient_id=patient_id,
        details=f"Cross-hospital clinical history retrieved for {patient['unique_patient_id']}",
        access_reason="CLINICAL_REVIEW",
        ip_address=client_ip
    )

    # 1. Fetch all visits
    visits = query_all(
        "SELECT v.visit_id, v.visit_date, v.visit_type, v.chief_complaint, v.clinical_notes, v.status, "
        "h.hospital_id, h.name as hospital_name, h.code as hospital_code, "
        "doc.user_id as doctor_id, doc.full_name as doctor_name, doc.specialty as doctor_specialty "
        "FROM VISIT v "
        "JOIN HOSPITAL h ON v.hospital_id = h.hospital_id "
        "JOIN APP_USER doc ON v.doctor_id = doc.user_id "
        "WHERE v.patient_id = ? "
        "ORDER BY v.visit_date DESC",
        (patient_id,)
    )

    # 2. Enrich visits with diagnoses, prescriptions, vitals, tests, plans
    for v in visits:
        v_id = v["visit_id"]
        # Diagnoses
        v["diagnoses"] = query_all(
            "SELECT d.diagnosis_id, d.icd10_code, d.name, d.category, vd.diagnosis_type, vd.clinical_status, vd.notes "
            "FROM VISIT_DIAGNOSIS vd JOIN DIAGNOSIS d ON vd.diagnosis_id = d.diagnosis_id "
            "WHERE vd.visit_id = ?",
            (v_id,)
        )
        # Prescriptions
        rx_list = query_all(
            "SELECT rx.prescription_id, rx.prescription_code, rx.status, rx.clinical_notes, rx.created_at "
            "FROM PRESCRIPTION rx WHERE rx.visit_id = ?",
            (v_id,)
        )
        for rx in rx_list:
            rx["items"] = query_all(
                "SELECT rxi.item_id, m.brand_name, m.generic_name, m.drug_class, "
                "rxi.dose_amount || ' ' || rxi.dose_unit as dosage, rxi.frequency, rxi.route, "
                "rxi.duration_days, rxi.instructions, rxi.start_date, rxi.end_date, rxi.status "
                "FROM PRESCRIPTION_ITEM rxi JOIN MEDICINE m ON rxi.medicine_id = m.medicine_id "
                "WHERE rxi.prescription_id = ?",
                (rx["prescription_id"],)
            )
        v["prescriptions"] = rx_list

        # Vitals recorded during this visit
        v["vitals"] = query_all(
            "SELECT vital_id, measurement_type, numeric_value, unit, context_note, recorded_at "
            "FROM VITAL_RECORD WHERE visit_id = ? ORDER BY recorded_at ASC",
            (v_id,)
        )

        # Tests
        v["medical_tests"] = query_all(
            "SELECT test_id, test_name, test_category, order_date, completion_date, result_summary, "
            "numeric_result, result_unit, reference_range, status FROM MEDICAL_TEST WHERE visit_id = ?",
            (v_id,)
        )

        # Plans
        v["treatment_plans"] = query_all(
            "SELECT plan_id, title, objective, instructions, status, start_date, review_date FROM TREATMENT_PLAN WHERE visit_id = ?",
            (v_id,)
        )

    # Also fetch patient's documented allergies
    allergies = query_all(
        "SELECT a.allergy_id, a.allergen_name, a.allergen_type, a.reaction, a.severity, a.status, a.recorded_at, "
        "doc.full_name as recorded_by_name "
        "FROM ALLERGY a JOIN APP_USER doc ON a.recorded_by = doc.user_id "
        "WHERE a.patient_id = ? ORDER BY a.recorded_at DESC",
        (patient_id,)
    )

    return {
        "patient": patient,
        "visits": visits,
        "allergies": allergies,
        "total_visits": len(visits)
    }
