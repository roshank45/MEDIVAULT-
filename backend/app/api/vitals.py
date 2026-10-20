from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.core.database import query_all, query_one, execute_cmd
from app.core.security import require_roles, get_current_user
from app.models.schemas import VitalRecordCreate, VitalRecordOut, AllergyCreate, AllergyOut
from app.services.audit_service import record_audit

router = APIRouter(prefix="/vitals", tags=["Vitals & Allergies"])

@router.post("", response_model=VitalRecordOut, status_code=status.HTTP_201_CREATED)
def record_vital_measurement(
    vital_in: VitalRecordCreate,
    current_user: dict = Depends(require_roles(["DOCTOR", "EMERGENCY_CLINICIAN"]))
):
    patient = query_one("SELECT patient_id, unique_patient_id FROM PATIENT WHERE patient_id = ?", (vital_in.patient_id,))
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    seq_row = query_one("SELECT VITAL_RECORD_SEQ.NEXTVAL as val FROM DUAL")
    vital_id = int(seq_row["val"])

    insert_sql = (
        "INSERT INTO VITAL_RECORD (VITAL_ID, PATIENT_ID, VISIT_ID, RECORDED_BY, MEASUREMENT_TYPE, "
        "NUMERIC_VALUE, UNIT, CONTEXT_NOTE, RECORDED_AT) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, SYSTIMESTAMP)"
    )

    execute_cmd(insert_sql, (
        vital_id,
        vital_in.patient_id,
        vital_in.visit_id,
        current_user["user_id"],
        vital_in.measurement_type.upper(),
        vital_in.numeric_value,
        vital_in.unit,
        vital_in.context_note
    ))

    v_data = query_one(
        "SELECT vr.*, doc.full_name as recorded_by_name "
        "FROM VITAL_RECORD vr JOIN APP_USER doc ON vr.recorded_by = doc.user_id "
        "WHERE vr.vital_id = ?",
        (vital_id,)
    )

    return VitalRecordOut(**v_data)

@router.get("/patient/{patient_id}", response_model=List[VitalRecordOut])
def get_patient_vitals_trends(
    patient_id: int,
    measurement_type: Optional[str] = Query(None, description="Filter by vital type e.g. SYSTOLIC_BP, BLOOD_GLUCOSE"),
    current_user: dict = Depends(require_roles(["ADMIN", "DOCTOR", "PATIENT", "EMERGENCY_CLINICIAN"]))
):
    """
    Returns time-series vital measurements for trending charts (BP, glucose, heart rate).
    """
    if measurement_type:
        vitals = query_all(
            "SELECT vr.*, doc.full_name as recorded_by_name "
            "FROM VITAL_RECORD vr JOIN APP_USER doc ON vr.recorded_by = doc.user_id "
            "WHERE vr.patient_id = ? AND vr.measurement_type = ? "
            "ORDER BY vr.recorded_at ASC",
            (patient_id, measurement_type.upper())
        )
    else:
        vitals = query_all(
            "SELECT vr.*, doc.full_name as recorded_by_name "
            "FROM VITAL_RECORD vr JOIN APP_USER doc ON vr.recorded_by = doc.user_id "
            "WHERE vr.patient_id = ? "
            "ORDER BY vr.recorded_at ASC",
            (patient_id,)
        )
    return [VitalRecordOut(**v) for v in vitals]

@router.post("/allergies", response_model=AllergyOut, status_code=status.HTTP_201_CREATED)
def record_patient_allergy(
    allergy_in: AllergyCreate,
    current_user: dict = Depends(require_roles(["DOCTOR", "EMERGENCY_CLINICIAN"]))
):
    patient = query_one("SELECT patient_id FROM PATIENT WHERE patient_id = ?", (allergy_in.patient_id,))
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    seq_row = query_one("SELECT ALLERGY_SEQ.NEXTVAL as val FROM DUAL")
    allergy_id = int(seq_row["val"])

    execute_cmd(
        "INSERT INTO ALLERGY (ALLERGY_ID, PATIENT_ID, ALLERGEN_NAME, ALLERGEN_TYPE, REACTION, "
        "SEVERITY, STATUS, RECORDED_BY, RECORDED_AT) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, SYSTIMESTAMP)",
        (
            allergy_id,
            allergy_in.patient_id,
            allergy_in.allergen_name.strip(),
            allergy_in.allergen_type.upper(),
            allergy_in.reaction.strip(),
            allergy_in.severity.upper(),
            allergy_in.status.upper(),
            current_user["user_id"]
        )
    )

    # Update patient allergies recorded status
    execute_cmd(
        "UPDATE PATIENT SET ALLERGIES_RECORDED_STATUS = 'DOCUMENTED', UPDATED_AT = SYSTIMESTAMP WHERE PATIENT_ID = ?",
        (allergy_in.patient_id,)
    )

    record_audit(
        actor_user_id=current_user["user_id"],
        actor_role=current_user["role"],
        event_type="ALLERGY_DOCUMENTED",
        target_entity="ALLERGY",
        target_id=str(allergy_id),
        hospital_id=current_user.get("hospital_id"),
        patient_id=allergy_in.patient_id,
        details=f"Documented {allergy_in.severity} allergy to '{allergy_in.allergen_name}'."
    )

    a_row = query_one(
        "SELECT a.*, doc.full_name as recorded_by_name "
        "FROM ALLERGY a JOIN APP_USER doc ON a.recorded_by = doc.user_id "
        "WHERE a.allergy_id = ?",
        (allergy_id,)
    )
    return AllergyOut(**a_row)

@router.get("/allergies/patient/{patient_id}", response_model=List[AllergyOut])
def get_patient_allergies(
    patient_id: int,
    current_user: dict = Depends(require_roles(["ADMIN", "DOCTOR", "PATIENT", "EMERGENCY_CLINICIAN"]))
):
    allergies = query_all(
        "SELECT a.*, doc.full_name as recorded_by_name "
        "FROM ALLERGY a JOIN APP_USER doc ON a.recorded_by = doc.user_id "
        "WHERE a.patient_id = ? ORDER BY a.recorded_at DESC",
        (patient_id,)
    )
    return [AllergyOut(**a) for a in allergies]
