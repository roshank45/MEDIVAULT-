from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from app.core.database import query_all, query_one, execute_cmd
from app.core.security import require_roles
from app.models.schemas import (
    MedicalTestCreate, MedicalTestOut, TreatmentPlanCreate, TreatmentPlanOut
)
from app.services.audit_service import record_audit

router = APIRouter(prefix="/clinical-care", tags=["Medical Tests & Treatment Plans"])

@router.post("/tests", response_model=MedicalTestOut, status_code=status.HTTP_201_CREATED)
def record_medical_test(
    test_in: MedicalTestCreate,
    current_user: dict = Depends(require_roles(["DOCTOR", "EMERGENCY_CLINICIAN"]))
):
    patient = query_one("SELECT patient_id FROM PATIENT WHERE patient_id = ?", (test_in.patient_id,))
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    seq_row = query_one("SELECT MEDICAL_TEST_SEQ.NEXTVAL as val FROM DUAL")
    test_id = int(seq_row["val"])

    execute_cmd(
        "INSERT INTO MEDICAL_TEST (TEST_ID, PATIENT_ID, VISIT_ID, ORDERING_DOCTOR_ID, HOSPITAL_ID, "
        "TEST_NAME, TEST_CATEGORY, ORDER_DATE, COMPLETION_DATE, RESULT_SUMMARY, NUMERIC_RESULT, "
        "RESULT_UNIT, REFERENCE_RANGE, STATUS) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, SYSTIMESTAMP, SYSTIMESTAMP, ?, ?, ?, ?, ?)",
        (
            test_id,
            test_in.patient_id,
            test_in.visit_id,
            current_user["user_id"],
            test_in.hospital_id,
            test_in.test_name,
            test_in.test_category,
            test_in.result_summary,
            test_in.numeric_result,
            test_in.result_unit,
            test_in.reference_range,
            test_in.status
        )
    )

    t_data = query_one(
        "SELECT mt.*, h.name as hospital_name, doc.full_name as doctor_name "
        "FROM MEDICAL_TEST mt "
        "JOIN HOSPITAL h ON mt.hospital_id = h.hospital_id "
        "JOIN APP_USER doc ON mt.ordering_doctor_id = doc.user_id "
        "WHERE mt.test_id = ?",
        (test_id,)
    )
    return MedicalTestOut(**t_data)

@router.get("/tests/patient/{patient_id}", response_model=List[MedicalTestOut])
def get_patient_tests(
    patient_id: int,
    current_user: dict = Depends(require_roles(["ADMIN", "DOCTOR", "PATIENT", "EMERGENCY_CLINICIAN"]))
):
    tests = query_all(
        "SELECT mt.*, h.name as hospital_name, doc.full_name as doctor_name "
        "FROM MEDICAL_TEST mt "
        "JOIN HOSPITAL h ON mt.hospital_id = h.hospital_id "
        "JOIN APP_USER doc ON mt.ordering_doctor_id = doc.user_id "
        "WHERE mt.patient_id = ? ORDER BY mt.order_date DESC",
        (patient_id,)
    )
    return [MedicalTestOut(**t) for t in tests]

@router.post("/treatment-plans", response_model=TreatmentPlanOut, status_code=status.HTTP_201_CREATED)
def create_treatment_plan(
    plan_in: TreatmentPlanCreate,
    current_user: dict = Depends(require_roles(["DOCTOR", "EMERGENCY_CLINICIAN"]))
):
    patient = query_one("SELECT patient_id FROM PATIENT WHERE patient_id = ?", (plan_in.patient_id,))
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    seq_row = query_one("SELECT TREATMENT_PLAN_SEQ.NEXTVAL as val FROM DUAL")
    plan_id = int(seq_row["val"])

    execute_cmd(
        "INSERT INTO TREATMENT_PLAN (PLAN_ID, PATIENT_ID, VISIT_ID, DOCTOR_ID, TITLE, OBJECTIVE, "
        "INSTRUCTIONS, STATUS, START_DATE, REVIEW_DATE, CREATED_AT) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', TO_DATE(?, 'YYYY-MM-DD'), "
        "TO_DATE(?, 'YYYY-MM-DD'), SYSTIMESTAMP)",
        (
            plan_id,
            plan_in.patient_id,
            plan_in.visit_id,
            current_user["user_id"],
            plan_in.title,
            plan_in.objective,
            plan_in.instructions,
            plan_in.start_date,
            plan_in.review_date
        )
    )

    p_data = query_one(
        "SELECT tp.*, doc.full_name as doctor_name "
        "FROM TREATMENT_PLAN tp JOIN APP_USER doc ON tp.doctor_id = doc.user_id "
        "WHERE tp.plan_id = ?",
        (plan_id,)
    )
    return TreatmentPlanOut(**p_data)

@router.get("/treatment-plans/patient/{patient_id}", response_model=List[TreatmentPlanOut])
def get_patient_treatment_plans(
    patient_id: int,
    current_user: dict = Depends(require_roles(["ADMIN", "DOCTOR", "PATIENT", "EMERGENCY_CLINICIAN"]))
):
    plans = query_all(
        "SELECT tp.*, doc.full_name as doctor_name "
        "FROM TREATMENT_PLAN tp JOIN APP_USER doc ON tp.doctor_id = doc.user_id "
        "WHERE tp.patient_id = ? ORDER BY tp.created_at DESC",
        (patient_id,)
    )
    return [TreatmentPlanOut(**p) for p in plans]
