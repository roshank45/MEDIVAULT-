from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from app.core.database import query_all, query_one, execute_cmd
from app.core.security import require_roles, hash_password
from app.models.schemas import HospitalCreate, HospitalOut, UserCreate, UserOut
from app.services.audit_service import record_audit

router = APIRouter(prefix="/admin", tags=["System Administration"])

@router.get("/hospitals", response_model=List[HospitalOut])
def list_hospitals(current_user: dict = Depends(require_roles(["ADMIN", "DOCTOR", "EMERGENCY_CLINICIAN"]))):
    hospitals = query_all("SELECT * FROM HOSPITAL ORDER BY hospital_id ASC")
    return [HospitalOut(**h) for h in hospitals]

@router.post("/hospitals", response_model=HospitalOut, status_code=status.HTTP_201_CREATED)
def create_hospital(
    hosp_in: HospitalCreate,
    current_user: dict = Depends(require_roles(["ADMIN"]))
):
    existing = query_one("SELECT hospital_id FROM HOSPITAL WHERE code = ?", (hosp_in.code.upper(),))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Hospital code already exists.")

    seq_row = query_one("SELECT HOSPITAL_SEQ.NEXTVAL as val FROM DUAL")
    hosp_id = int(seq_row["val"])

    execute_cmd(
        "INSERT INTO HOSPITAL (HOSPITAL_ID, NAME, CODE, ADDRESS, CITY, STATE, PHONE, EMAIL, IS_ACTIVE, CREATED_AT) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, SYSTIMESTAMP)",
        (
            hosp_id,
            hosp_in.name.strip(),
            hosp_in.code.strip().upper(),
            hosp_in.address,
            hosp_in.city,
            hosp_in.state,
            hosp_in.phone,
            hosp_in.email
        )
    )

    record_audit(
        actor_user_id=current_user["user_id"],
        actor_role=current_user["role"],
        event_type="HOSPITAL_REGISTERED",
        target_entity="HOSPITAL",
        target_id=str(hosp_id),
        hospital_id=hosp_id,
        details=f"Registered participating hospital: {hosp_in.name} ({hosp_in.code})"
    )

    h_data = query_one("SELECT * FROM HOSPITAL WHERE hospital_id = ?", (hosp_id,))
    return HospitalOut(**h_data)

@router.get("/users", response_model=List[UserOut])
def list_users(current_user: dict = Depends(require_roles(["ADMIN"]))):
    users = query_all(
        "SELECT u.*, h.name as hospital_name "
        "FROM APP_USER u LEFT JOIN HOSPITAL h ON u.hospital_id = h.hospital_id "
        "ORDER BY u.user_id ASC"
    )
    return [UserOut(**u) for u in users]

@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user_account(
    user_in: UserCreate,
    current_user: dict = Depends(require_roles(["ADMIN"]))
):
    existing = query_one("SELECT user_id FROM APP_USER WHERE LOWER(username) = LOWER(?)", (user_in.username.strip(),))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists.")

    seq_row = query_one("SELECT APP_USER_SEQ.NEXTVAL as val FROM DUAL")
    u_id = int(seq_row["val"])
    hashed_pwd = hash_password(user_in.password)

    execute_cmd(
        "INSERT INTO APP_USER (USER_ID, HOSPITAL_ID, USERNAME, PASSWORD_HASH, FULL_NAME, EMAIL, "
        "PHONE, ROLE, SPECIALTY, LICENSE_NUMBER, IS_ACTIVE, CREATED_AT, UPDATED_AT) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, SYSTIMESTAMP, SYSTIMESTAMP)",
        (
            u_id,
            user_in.hospital_id,
            user_in.username.strip(),
            hashed_pwd,
            user_in.full_name.strip(),
            user_in.email.strip(),
            user_in.phone,
            user_in.role.upper(),
            user_in.specialty,
            user_in.license_number
        )
    )

    record_audit(
        actor_user_id=current_user["user_id"],
        actor_role=current_user["role"],
        event_type="USER_ACCOUNT_CREATED",
        target_entity="APP_USER",
        target_id=str(u_id),
        hospital_id=user_in.hospital_id,
        details=f"Created staff account {user_in.username} with role {user_in.role}"
    )

    u_data = query_one(
        "SELECT u.*, h.name as hospital_name FROM APP_USER u "
        "LEFT JOIN HOSPITAL h ON u.hospital_id = h.hospital_id WHERE u.user_id = ?",
        (u_id,)
    )
    return UserOut(**u_data)

@router.patch("/users/{user_id}/status")
def toggle_user_status(
    user_id: int,
    is_active: int,
    current_user: dict = Depends(require_roles(["ADMIN"]))
):
    execute_cmd(
        "UPDATE APP_USER SET IS_ACTIVE = ?, UPDATED_AT = SYSTIMESTAMP WHERE USER_ID = ?",
        (1 if is_active else 0, user_id)
    )
    record_audit(
        actor_user_id=current_user["user_id"],
        actor_role=current_user["role"],
        event_type="USER_STATUS_MODIFIED",
        target_entity="APP_USER",
        target_id=str(user_id),
        details=f"User {user_id} active status updated to {is_active}"
    )
    return {"message": "User status updated successfully"}

@router.get("/metrics")
def get_system_metrics(current_user: dict = Depends(require_roles(["ADMIN", "DOCTOR"]))):
    """
    Returns platform-wide non-clinical operational metrics.
    Uses database views and aggregations.
    """
    hospital_metrics = query_all("SELECT * FROM VW_HOSPITAL_ACTIVITY_METRICS")
    total_patients = query_one("SELECT COUNT(*) as count FROM PATIENT")["count"]
    total_visits = query_one("SELECT COUNT(*) as count FROM VISIT")["count"]
    total_prescriptions = query_one("SELECT COUNT(*) as count FROM PRESCRIPTION")["count"]
    total_hospitals = query_one("SELECT COUNT(*) as count FROM HOSPITAL WHERE is_active = 1")["count"]
    total_doctors = query_one("SELECT COUNT(*) as count FROM APP_USER WHERE role = 'DOCTOR' AND is_active = 1")["count"]

    recent_activity = query_all(
        "SELECT v.visit_id, v.visit_date, h.name as hospital_name, p.unique_patient_id, "
        "doc.full_name as doctor_name, v.visit_type "
        "FROM VISIT v "
        "JOIN HOSPITAL h ON v.hospital_id = h.hospital_id "
        "JOIN PATIENT p ON v.patient_id = p.patient_id "
        "JOIN APP_USER doc ON v.doctor_id = doc.user_id "
        "ORDER BY v.visit_date DESC",
    )[:6]

    return {
        "total_patients": total_patients,
        "total_visits": total_visits,
        "total_prescriptions": total_prescriptions,
        "total_hospitals": total_hospitals,
        "total_doctors": total_doctors,
        "hospital_metrics": hospital_metrics,
        "recent_activity": recent_activity
    }
