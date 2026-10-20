from typing import List
from fastapi import APIRouter, Depends
from app.core.database import query_all
from app.core.security import require_roles
from app.models.schemas import SafetyCheckRequest, SafetyCheckResponse
from app.services.safety_service import run_medication_safety_checks

router = APIRouter(prefix="/safety", tags=["Medication Safety & Decision Support"])

@router.post("/check", response_model=SafetyCheckResponse)
def check_medication_safety(
    safety_req: SafetyCheckRequest,
    current_user: dict = Depends(require_roles(["ADMIN", "DOCTOR", "EMERGENCY_CLINICIAN"]))
):
    """
    Evaluates medication safety for a patient prior to prescribing:
    - Feature A: Duplicate therapy detection (brand & generic)
    - Feature B: Drug interaction checks against existing active medicines
    - Feature C: Documented allergy conflict screening
    """
    return run_medication_safety_checks(
        patient_id=safety_req.patient_id,
        candidate_medicines=safety_req.candidate_medicines
    )

@router.get("/interactions")
def get_interactions_knowledge_base(
    current_user: dict = Depends(require_roles(["ADMIN", "DOCTOR", "EMERGENCY_CLINICIAN"]))
):
    interactions = query_all("SELECT * FROM DRUG_INTERACTION ORDER BY severity DESC, drug1_name ASC")
    return {
        "disclaimer": "Academic synthetic demonstration dataset for drug-drug interactions. Not intended for clinical production use.",
        "interactions": interactions
    }
