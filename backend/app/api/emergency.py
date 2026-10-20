from fastapi import APIRouter, HTTPException, status, Depends, Request
from app.core.database import query_one, execute_cmd
from app.core.security import require_roles
from app.models.schemas import (
    EmergencyPublicProfileOut, EmergencyTokenGenerateResponse, BreakGlassRequest
)
from app.services.emergency_service import (
    generate_emergency_token, revoke_emergency_token, resolve_public_emergency_profile
)
from app.services.audit_service import record_audit

router = APIRouter(prefix="/emergency", tags=["Emergency QR & Break-Glass Access"])

@router.post("/generate/{patient_id}", response_model=EmergencyTokenGenerateResponse)
def create_or_renew_emergency_token(
    patient_id: int,
    current_user: dict = Depends(require_roles(["ADMIN", "DOCTOR", "PATIENT", "EMERGENCY_CLINICIAN"]))
):
    patient = query_one("SELECT patient_id, unique_patient_id FROM PATIENT WHERE patient_id = ?", (patient_id,))
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    token_info = generate_emergency_token(patient_id)
    record_audit(
        actor_user_id=current_user["user_id"],
        actor_role=current_user["role"],
        event_type="EMERGENCY_TOKEN_GENERATED",
        target_entity="EMERGENCY_PROFILE",
        target_id=str(patient_id),
        hospital_id=current_user.get("hospital_id"),
        patient_id=patient_id,
        details=f"New emergency profile token created for {patient['unique_patient_id']}"
    )
    return token_info

@router.post("/revoke/{patient_id}")
def revoke_token(
    patient_id: int,
    current_user: dict = Depends(require_roles(["ADMIN", "DOCTOR", "PATIENT", "EMERGENCY_CLINICIAN"]))
):
    success = revoke_emergency_token(patient_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active emergency profile found.")
    return {"message": "Emergency profile token revoked successfully. The previous QR code will no longer function."}

@router.get("/public/{token}", response_model=EmergencyPublicProfileOut)
def get_public_emergency_card_profile(token: str, request: Request):
    """
    Public emergency triage lookup via QR code.
    Level 1 access: Returns strictly limited triage details (blood group, critical allergies, emergency contact).
    Does NOT require login, but enforces expiration, SHA-256 token hashing, and audit logging.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    profile = resolve_public_emergency_profile(raw_token=token, client_ip=client_ip)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency profile not found, expired, or revoked. Please present full medical credentials."
        )
    return profile

@router.post("/break-glass")
def execute_break_glass_access(
    bg_req: BreakGlassRequest,
    request: Request,
    current_user: dict = Depends(require_roles(["DOCTOR", "EMERGENCY_CLINICIAN"]))
):
    """
    Controlled break-glass emergency override for clinicians.
    Requires mandatory justification, grants temporary emergency authorization,
    and logs immutable high-priority audit trail records.
    """
    patient = query_one("SELECT patient_id, unique_patient_id FROM PATIENT WHERE patient_id = ?", (bg_req.patient_id,))
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    if not bg_req.reason or len(bg_req.reason.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mandatory break-glass clinical justification required (minimum 10 characters)."
        )

    # Insert into PATIENT_ACCESS table
    seq_row = query_one("SELECT PATIENT_ACCESS_SEQ.NEXTVAL as val FROM DUAL")
    access_id = int(seq_row["val"])

    execute_cmd(
        "INSERT INTO PATIENT_ACCESS (ACCESS_ID, PATIENT_ID, USER_ID, HOSPITAL_ID, ACCESS_TYPE, "
        "REASON, IS_BREAK_GLASS, GRANTED_AT, EXPIRES_AT) "
        "VALUES (?, ?, ?, ?, 'EMERGENCY_BREAK_GLASS', ?, 1, SYSTIMESTAMP, SYSTIMESTAMP + INTERVAL '4' HOUR)",
        (
            access_id,
            bg_req.patient_id,
            current_user["user_id"],
            current_user.get("hospital_id", 1),
            bg_req.reason.strip()
        )
    )

    client_ip = request.client.host if request.client else "127.0.0.1"
    record_audit(
        actor_user_id=current_user["user_id"],
        actor_role=current_user["role"],
        event_type="BREAK_GLASS_ACCESS_TRIGGERED",
        target_entity="PATIENT",
        target_id=str(bg_req.patient_id),
        hospital_id=current_user.get("hospital_id"),
        patient_id=bg_req.patient_id,
        details=f"Break-glass emergency override invoked for {patient['unique_patient_id']}: {bg_req.reason.strip()}",
        access_reason=bg_req.reason.strip(),
        ip_address=client_ip
    )

    return {
        "access_id": access_id,
        "status": "GRANTED",
        "patient_id": bg_req.patient_id,
        "valid_for_hours": 4,
        "message": f"Break-glass access logged for {patient['unique_patient_id']}. All actions during this session are recorded."
    }
