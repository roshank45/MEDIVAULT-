from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from app.core.database import query_all
from app.core.security import require_roles
from app.models.schemas import AuditLogOut

router = APIRouter(prefix="/audit", tags=["Security Audit Trail"])

@router.get("", response_model=List[AuditLogOut])
def get_audit_trail_logs(
    limit: int = Query(50, ge=1, le=200),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    current_user: dict = Depends(require_roles(["ADMIN"]))
):
    """
    Returns immutable audit logs.
    Restricted strictly to authorized System Administrators.
    Ordinary users cannot view, edit, or delete audit records.
    """
    if event_type:
        logs = query_all(
            "SELECT al.*, u.full_name as actor_name, h.name as hospital_name, "
            "p.first_name || ' ' || p.last_name as patient_name "
            "FROM AUDIT_LOG al "
            "LEFT JOIN APP_USER u ON al.actor_user_id = u.user_id "
            "LEFT JOIN HOSPITAL h ON al.hospital_id = h.hospital_id "
            "LEFT JOIN PATIENT p ON al.patient_id = p.patient_id "
            "WHERE al.event_type = ? "
            "ORDER BY al.created_at DESC",
            (event_type.upper(),)
        )[:limit]
    else:
        logs = query_all(
            "SELECT al.*, u.full_name as actor_name, h.name as hospital_name, "
            "p.first_name || ' ' || p.last_name as patient_name "
            "FROM AUDIT_LOG al "
            "LEFT JOIN APP_USER u ON al.actor_user_id = u.user_id "
            "LEFT JOIN HOSPITAL h ON al.hospital_id = h.hospital_id "
            "LEFT JOIN PATIENT p ON al.patient_id = p.patient_id "
            "ORDER BY al.created_at DESC"
        )[:limit]

    return [AuditLogOut(**l) for l in logs]
