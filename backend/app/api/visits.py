from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from app.core.database import query_all, query_one, execute_cmd
from app.core.security import require_roles
from app.models.schemas import VisitCreate, VisitOut, DiagnosisOut
from app.services.audit_service import record_audit

router = APIRouter(prefix="/visits", tags=["Visits & Consultations"])

@router.get("/diagnoses/catalog", response_model=List[DiagnosisOut])
def get_diagnosis_catalog(current_user: dict = Depends(require_roles(["ADMIN", "DOCTOR", "EMERGENCY_CLINICIAN"]))):
    diagnoses = query_all("SELECT * FROM DIAGNOSIS ORDER BY icd10_code ASC")
    return [DiagnosisOut(**d) for d in diagnoses]

@router.post("", response_model=VisitOut, status_code=status.HTTP_201_CREATED)
def create_consultation(
    visit_in: VisitCreate,
    current_user: dict = Depends(require_roles(["DOCTOR", "EMERGENCY_CLINICIAN"]))
):
    """
    Records a new clinical consultation associated with a specific hospital and doctor.
    Updates the patient's longitudinal medical history.
    """
    patient = query_one("SELECT patient_id, unique_patient_id FROM PATIENT WHERE patient_id = ?", (visit_in.patient_id,))
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    hospital = query_one("SELECT hospital_id, name FROM HOSPITAL WHERE hospital_id = ?", (visit_in.hospital_id,))
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found.")

    # Fetch next sequence
    seq_row = query_one("SELECT VISIT_SEQ.NEXTVAL as val FROM DUAL")
    visit_id = int(seq_row["val"])

    insert_sql = (
        "INSERT INTO VISIT (VISIT_ID, PATIENT_ID, DOCTOR_ID, HOSPITAL_ID, VISIT_DATE, "
        "VISIT_TYPE, CHIEF_COMPLAINT, CLINICAL_NOTES, STATUS, CREATED_AT) "
        "VALUES (?, ?, ?, ?, SYSTIMESTAMP, ?, ?, ?, 'COMPLETED', SYSTIMESTAMP)"
    )

    execute_cmd(insert_sql, (
        visit_id,
        visit_in.patient_id,
        current_user["user_id"],
        visit_in.hospital_id,
        visit_in.visit_type,
        visit_in.chief_complaint,
        visit_in.clinical_notes
    ))

    # Insert associated diagnoses
    if visit_in.diagnoses:
        for diag in visit_in.diagnoses:
            execute_cmd(
                "INSERT INTO VISIT_DIAGNOSIS (VISIT_ID, DIAGNOSIS_ID, DIAGNOSIS_TYPE, CLINICAL_STATUS, NOTES, RECORDED_AT) "
                "VALUES (?, ?, ?, ?, ?, SYSTIMESTAMP)",
                (visit_id, diag.diagnosis_id, diag.diagnosis_type, diag.clinical_status, diag.notes)
            )

    # Note: Trigger TRG_AUDIT_VISIT fires automatically in Oracle DB

    visit = query_one(
        "SELECT v.*, h.name as hospital_name, h.code as hospital_code, "
        "doc.full_name as doctor_name, doc.specialty as doctor_specialty "
        "FROM VISIT v "
        "JOIN HOSPITAL h ON v.hospital_id = h.hospital_id "
        "JOIN APP_USER doc ON v.doctor_id = doc.user_id "
        "WHERE v.visit_id = ?",
        (visit_id,)
    )

    return VisitOut(**visit)

@router.get("/{visit_id}", response_model=VisitOut)
def get_visit_details(
    visit_id: int,
    current_user: dict = Depends(require_roles(["ADMIN", "DOCTOR", "EMERGENCY_CLINICIAN", "PATIENT"]))
):
    visit = query_one(
        "SELECT v.*, h.name as hospital_name, h.code as hospital_code, "
        "doc.full_name as doctor_name, doc.specialty as doctor_specialty "
        "FROM VISIT v "
        "JOIN HOSPITAL h ON v.hospital_id = h.hospital_id "
        "JOIN APP_USER doc ON v.doctor_id = doc.user_id "
        "WHERE v.visit_id = ?",
        (visit_id,)
    )
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found.")

    return VisitOut(**visit)
