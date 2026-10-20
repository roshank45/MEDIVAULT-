from typing import Optional
from app.core.database import execute_cmd

def record_audit(
    actor_user_id: Optional[int],
    actor_role: Optional[str],
    event_type: str,
    target_entity: str,
    target_id: Optional[str] = None,
    hospital_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    details: Optional[str] = None,
    access_reason: Optional[str] = None,
    ip_address: Optional[str] = "127.0.0.1"
) -> None:
    """Record an audit trail event directly into the AUDIT_LOG table."""
    try:
        sql = (
            "INSERT INTO AUDIT_LOG (LOG_ID, ACTOR_USER_ID, ACTOR_ROLE, EVENT_TYPE, "
            "TARGET_ENTITY, TARGET_ID, HOSPITAL_ID, PATIENT_ID, DETAILS, ACCESS_REASON, IP_ADDRESS, CREATED_AT) "
            "VALUES (AUDIT_LOG_SEQ.NEXTVAL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, SYSTIMESTAMP)"
        )
        execute_cmd(sql, (
            actor_user_id,
            actor_role,
            event_type,
            target_entity,
            str(target_id) if target_id is not None else None,
            hospital_id,
            patient_id,
            details,
            access_reason,
            ip_address
        ))
    except Exception as e:
        # In a real medical system, audit logging failure might fail the transaction.
        # For academic prototype, print to console so we don't break clinical flow while preserving errors.
        print(f"[AUDIT LOG ERROR] Failed to record audit log: {e}")
