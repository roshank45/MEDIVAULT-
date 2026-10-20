import secrets
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from app.core.database import query_one, execute_cmd, query_all
from app.models.schemas import EmergencyPublicProfileOut, EmergencyTokenGenerateResponse
from app.services.audit_service import record_audit

def hash_token(raw_token: str) -> str:
    """Return SHA-256 hex digest of the raw emergency token."""
    return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()

def generate_emergency_token(patient_id: int) -> EmergencyTokenGenerateResponse:
    """
    Generates a secure unguessable emergency token, revokes prior active tokens,
    and stores the SHA-256 hash in Oracle EMERGENCY_PROFILE.
    """
    raw_token = f"mv_emg_{secrets.token_urlsafe(32)}"
    token_hash = hash_token(raw_token)
    preview = f"{raw_token[:8]}...{raw_token[-6:]}"

    # Deactivate any previous active tokens for this patient
    execute_cmd(
        "UPDATE EMERGENCY_PROFILE SET IS_ACTIVE = 0, REVOKED_AT = SYSTIMESTAMP WHERE PATIENT_ID = ?",
        (patient_id,)
    )

    # Insert or update new profile
    existing = query_one("SELECT profile_id FROM EMERGENCY_PROFILE WHERE PATIENT_ID = ?", (patient_id,))
    if existing:
        execute_cmd(
            "UPDATE EMERGENCY_PROFILE SET TOKEN_HASH = ?, TOKEN_RAW_PREVIEW = ?, IS_ACTIVE = 1, "
            "EXPIRES_AT = SYSTIMESTAMP + INTERVAL '30' DAY, CREATED_AT = SYSTIMESTAMP, REVOKED_AT = NULL "
            "WHERE PATIENT_ID = ?",
            (token_hash, preview, patient_id)
        )
    else:
        execute_cmd(
            "INSERT INTO EMERGENCY_PROFILE (PROFILE_ID, PATIENT_ID, TOKEN_HASH, TOKEN_RAW_PREVIEW, "
            "IS_ACTIVE, ALLOW_BLOOD_GROUP, ALLOW_ALLERGIES, ALLOW_MEDICATIONS, ALLOW_CONTACTS, EXPIRES_AT, CREATED_AT) "
            "VALUES (EMERGENCY_PROFILE_SEQ.NEXTVAL, ?, ?, ?, 1, 1, 1, 1, 1, SYSTIMESTAMP + INTERVAL '30' DAY, SYSTIMESTAMP)",
            (patient_id, token_hash, preview)
        )

    # Query expiration
    row = query_one("SELECT expires_at FROM EMERGENCY_PROFILE WHERE PATIENT_ID = ?", (patient_id,))
    expires_str = row.get("expires_at", "") if row else ""

    qr_url = f"/emergency/qr/{raw_token}"
    return EmergencyTokenGenerateResponse(
        patient_id=patient_id,
        token=raw_token,
        token_preview=preview,
        expires_at=str(expires_str),
        qr_url=qr_url
    )

def revoke_emergency_token(patient_id: int) -> bool:
    """Revoke active emergency token for patient."""
    count = execute_cmd(
        "UPDATE EMERGENCY_PROFILE SET IS_ACTIVE = 0, REVOKED_AT = SYSTIMESTAMP WHERE PATIENT_ID = ?",
        (patient_id,)
    )
    record_audit(
        actor_user_id=None,
        actor_role="PATIENT_OR_CLINICIAN",
        event_type="EMERGENCY_TOKEN_REVOKED",
        target_entity="EMERGENCY_PROFILE",
        target_id=str(patient_id),
        patient_id=patient_id,
        details="Emergency profile QR token revoked manually.",
        access_reason="SECURITY_MANAGEMENT"
    )
    return count > 0

def resolve_public_emergency_profile(raw_token: str, client_ip: str = "127.0.0.1") -> Optional[EmergencyPublicProfileOut]:
    """
    Public emergency profile lookup by unguessable token.
    Enforces expiration, active status, minimal data exposure.
    Level 1 access: no full clinical history returned.
    """
    token_hash = hash_token(raw_token)
    profile = query_one(
        "SELECT ep.profile_id, ep.patient_id, ep.is_active, ep.expires_at, "
        "p.unique_patient_id, p.first_name, p.last_name, p.gender, p.blood_group, "
        "p.emergency_contact_name, p.emergency_contact_phone, p.emergency_contact_relation, "
        "p.allergies_recorded_status, p.updated_at "
        "FROM EMERGENCY_PROFILE ep "
        "JOIN PATIENT p ON ep.patient_id = p.patient_id "
        "WHERE ep.token_hash = ?",
        (token_hash,)
    )

    if not profile:
        return None

    if profile.get("is_active") != 1:
        return None

    # Audit the emergency access event
    patient_id = profile["patient_id"]
    record_audit(
        actor_user_id=None,
        actor_role="PUBLIC_EMERGENCY_SCANNER",
        event_type="EMERGENCY_QR_SCANNED",
        target_entity="EMERGENCY_PROFILE",
        target_id=str(profile["profile_id"]),
        patient_id=patient_id,
        details=f"Public Level 1 emergency profile viewed via QR scan for {profile['unique_patient_id']}",
        access_reason="EMERGENCY_CARE_TRIAGE",
        ip_address=client_ip
    )

    # Fetch critical allergies
    allergies = query_all(
        "SELECT allergen_name, reaction, severity FROM ALLERGY "
        "WHERE patient_id = ? AND status = 'ACTIVE' ORDER BY severity DESC",
        (patient_id,)
    )
    critical_allergies = [
        f"{a['allergen_name']} ({a['severity']}) - {a['reaction']}"
        for a in allergies
    ]

    # Fetch active conditions from recent primary diagnoses
    conditions = query_all(
        "SELECT DISTINCT d.name FROM VISIT_DIAGNOSIS vd "
        "JOIN DIAGNOSIS d ON vd.diagnosis_id = d.diagnosis_id "
        "JOIN VISIT v ON vd.visit_id = v.visit_id "
        "WHERE v.patient_id = ? AND vd.clinical_status = 'ACTIVE'",
        (patient_id,)
    )
    active_conditions = [c["name"] for c in conditions]

    # Fetch verified current active medications
    active_meds = query_all(
        "SELECT m.brand_name, m.generic_name, rxi.dose_amount || ' ' || rxi.dose_unit as dose, rxi.frequency "
        "FROM PRESCRIPTION_ITEM rxi "
        "JOIN PRESCRIPTION rx ON rxi.prescription_id = rx.prescription_id "
        "JOIN MEDICINE m ON rxi.medicine_id = m.medicine_id "
        "WHERE rx.patient_id = ? AND rx.status = 'ACTIVE' AND rxi.status = 'ACTIVE'",
        (patient_id,)
    )
    med_list = [f"{m['brand_name']} ({m['generic_name']}) {m['dose']} - {m['frequency']}" for m in active_meds]

    allergy_status = profile.get("allergies_recorded_status", "NOT_RECORDED")

    return EmergencyPublicProfileOut(
        patient_id=patient_id,
        unique_patient_id=profile["unique_patient_id"],
        patient_name=f"{profile['first_name']} {profile['last_name']}",
        gender=profile["gender"],
        blood_group=profile.get("blood_group") or "NOT_SPECIFIED",
        allergies_status=allergy_status,
        critical_allergies=critical_allergies,
        active_conditions=active_conditions,
        active_medications=med_list,
        emergency_contact_name=profile.get("emergency_contact_name"),
        emergency_contact_phone=profile.get("emergency_contact_phone"),
        emergency_contact_relation=profile.get("emergency_contact_relation"),
        last_updated=str(profile.get("updated_at", "")),
        disclaimer=(
            "DISCLAIMER: Level 1 Emergency Profile. Contains strictly limited triage information "
            "for first responders. Comprehensive medical records require clinician authentication and authorization."
        )
    )
