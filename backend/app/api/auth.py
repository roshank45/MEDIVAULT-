from typing import List
from fastapi import APIRouter, HTTPException, status, Depends, Request
from app.core.database import query_one, query_all, execute_cmd
from app.core.security import verify_password, hash_password, create_access_token, get_current_user
from app.models.schemas import LoginRequest, TokenResponse, UserOut, HospitalOut, DoctorSignUpRequest, AdminSignUpRequest
from app.services.audit_service import record_audit

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(login_req: LoginRequest, request: Request):
    user = query_one(
        "SELECT u.user_id, u.hospital_id, u.username, u.password_hash, u.full_name, "
        "u.email, u.role, u.is_active, h.name as hospital_name "
        "FROM APP_USER u LEFT JOIN HOSPITAL h ON u.hospital_id = h.hospital_id "
        "WHERE LOWER(u.username) = LOWER(?)",
        (login_req.username.strip(),)
    )

    client_ip = request.client.host if request.client else "127.0.0.1"

    if not user:
        record_audit(
            actor_user_id=None,
            actor_role="ANONYMOUS",
            event_type="LOGIN_FAILED",
            target_entity="AUTH",
            details=f"Failed login attempt for nonexistent username: {login_req.username}",
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password."
        )

    if not verify_password(login_req.password, user["password_hash"]):
        record_audit(
            actor_user_id=user["user_id"],
            actor_role=user["role"],
            event_type="LOGIN_FAILED",
            target_entity="AUTH",
            target_id=str(user["user_id"]),
            details=f"Password mismatch for user: {user['username']}",
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password."
        )

    if user.get("is_active") != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact your system administrator."
        )

    # Generate JWT
    token_data = {
        "sub": user["username"],
        "user_id": user["user_id"],
        "role": user["role"],
        "hospital_id": user.get("hospital_id")
    }
    access_token = create_access_token(token_data)

    # Record login audit event
    record_audit(
        actor_user_id=user["user_id"],
        actor_role=user["role"],
        event_type="LOGIN_SUCCESS",
        target_entity="APP_USER",
        target_id=str(user["user_id"]),
        hospital_id=user.get("hospital_id"),
        details=f"User {user['username']} logged in successfully ({user['role']}).",
        ip_address=client_ip
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user["user_id"],
        username=user["username"],
        full_name=user["full_name"],
        role=user["role"],
        hospital_id=user.get("hospital_id"),
        hospital_name=user.get("hospital_name")
    )

@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    return UserOut(**current_user)

@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    record_audit(
        actor_user_id=current_user["user_id"],
        actor_role=current_user["role"],
        event_type="LOGOUT",
        target_entity="APP_USER",
        target_id=str(current_user["user_id"]),
        hospital_id=current_user.get("hospital_id"),
        details=f"User {current_user['username']} logged out."
    )
    return {"message": "Logged out successfully"}

@router.get("/hospitals", response_model=List[HospitalOut])
def get_public_hospitals():
    """Retrieve active hospitals for registration and public directory."""
    hospitals = query_all("SELECT * FROM HOSPITAL WHERE is_active = 1 ORDER BY name ASC")
    return [HospitalOut(**h) for h in hospitals]

@router.post("/doctor-signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def doctor_signup(signup_req: DoctorSignUpRequest, request: Request):
    """
    Self-service registration for healthcare professionals (Doctors & Emergency Clinicians).
    Enforces uniqueness of username, email, and medical license number, and associates the doctor
    with their chosen hospital in the Oracle Database.
    """
    username_clean = signup_req.username.strip().lower()
    if len(username_clean) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters long."
        )

    if len(signup_req.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    role = (signup_req.role or "DOCTOR").strip().upper()
    if role not in ["DOCTOR", "EMERGENCY_CLINICIAN"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either DOCTOR or EMERGENCY_CLINICIAN."
        )

    # Validate hospital existence and active status
    hospital = query_one(
        "SELECT hospital_id, name FROM HOSPITAL WHERE hospital_id = ? AND is_active = 1",
        (signup_req.hospital_id,)
    )
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected hospital was not found or is currently inactive."
        )

    # Check for duplicate username
    existing_user = query_one(
        "SELECT user_id FROM APP_USER WHERE LOWER(username) = LOWER(?)",
        (username_clean,)
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already taken. Please choose another username."
        )

    # Check for duplicate email
    email_clean = str(signup_req.email).strip().lower()
    existing_email = query_one(
        "SELECT user_id FROM APP_USER WHERE LOWER(email) = LOWER(?)",
        (email_clean,)
    )
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists."
        )

    # Check for duplicate license number
    license_clean = signup_req.license_number.strip().upper()
    existing_license = query_one(
        "SELECT user_id FROM APP_USER WHERE UPPER(license_number) = UPPER(?)",
        (license_clean,)
    )
    if existing_license:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Medical license '{license_clean}' is already registered in MediVault."
        )

    # Fetch next sequence ID for APP_USER
    seq_row = query_one("SELECT APP_USER_SEQ.NEXTVAL as val FROM DUAL")
    u_id = int(seq_row["val"])
    hashed_pwd = hash_password(signup_req.password)
    full_name_clean = signup_req.full_name.strip()
    specialty_clean = signup_req.specialty.strip()
    phone_clean = signup_req.phone.strip() if signup_req.phone else None

    # Insert into APP_USER
    execute_cmd(
        "INSERT INTO APP_USER (USER_ID, HOSPITAL_ID, USERNAME, PASSWORD_HASH, FULL_NAME, EMAIL, "
        "PHONE, ROLE, SPECIALTY, LICENSE_NUMBER, IS_ACTIVE, CREATED_AT, UPDATED_AT) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, SYSTIMESTAMP, SYSTIMESTAMP)",
        (
            u_id,
            signup_req.hospital_id,
            username_clean,
            hashed_pwd,
            full_name_clean,
            email_clean,
            phone_clean,
            role,
            specialty_clean,
            license_clean
        )
    )

    client_ip = request.client.host if request.client else "127.0.0.1"

    # Record registration in immutable audit log
    record_audit(
        actor_user_id=u_id,
        actor_role=role,
        event_type="DOCTOR_SELF_REGISTERED",
        target_entity="APP_USER",
        target_id=str(u_id),
        hospital_id=signup_req.hospital_id,
        details=f"Doctor {full_name_clean} self-registered with license {license_clean} ({specialty_clean}) at {hospital['name']}.",
        ip_address=client_ip
    )

    # Generate JWT for immediate authenticated session
    token_data = {
        "sub": username_clean,
        "user_id": u_id,
        "role": role,
        "hospital_id": signup_req.hospital_id
    }
    access_token = create_access_token(token_data)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=u_id,
        username=username_clean,
        full_name=full_name_clean,
        role=role,
        hospital_id=signup_req.hospital_id,
        hospital_name=hospital["name"]
    )

ADMIN_REGISTRATION_PASSKEY = "MEDIVAULT_ADMIN_2026"

@router.post("/admin-signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def admin_signup(signup_req: AdminSignUpRequest, request: Request):
    """
    Self-service registration for System Administrators.
    Requires the master administrative security key to verify authorization,
    enforces username and email uniqueness, records an immutable audit log,
    and returns an authenticated administrator JWT session.
    """
    if signup_req.admin_secret_key.strip() != ADMIN_REGISTRATION_PASSKEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Administrative Master Key. Authorization denied."
        )

    username_clean = signup_req.username.strip().lower()
    if len(username_clean) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters long."
        )

    if len(signup_req.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    # Check for duplicate username
    existing_user = query_one(
        "SELECT user_id FROM APP_USER WHERE LOWER(username) = LOWER(?)",
        (username_clean,)
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already taken. Please choose another username."
        )

    # Check for duplicate email
    email_clean = str(signup_req.email).strip().lower()
    existing_email = query_one(
        "SELECT user_id FROM APP_USER WHERE LOWER(email) = LOWER(?)",
        (email_clean,)
    )
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists."
        )

    # Determine hospital or system affiliation
    hosp_id = signup_req.hospital_id
    hosp_name = "Central MediVault Health Authority"
    if hosp_id:
        hosp = query_one("SELECT name FROM HOSPITAL WHERE hospital_id = ?", (hosp_id,))
        if hosp:
            hosp_name = hosp["name"]

    # Allocate sequence ID
    seq_row = query_one("SELECT APP_USER_SEQ.NEXTVAL as val FROM DUAL")
    u_id = int(seq_row["val"])
    hashed_pwd = hash_password(signup_req.password)
    full_name_clean = signup_req.full_name.strip()
    dept = signup_req.department.strip() if signup_req.department else "Health System Administration"

    execute_cmd(
        "INSERT INTO APP_USER (USER_ID, HOSPITAL_ID, USERNAME, PASSWORD_HASH, FULL_NAME, EMAIL, "
        "PHONE, ROLE, SPECIALTY, LICENSE_NUMBER, IS_ACTIVE, CREATED_AT, UPDATED_AT) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, 'ADMIN', ?, 'ADMIN-SEC-AUTH', 1, SYSTIMESTAMP, SYSTIMESTAMP)",
        (
            u_id,
            hosp_id,
            username_clean,
            hashed_pwd,
            full_name_clean,
            email_clean,
            signup_req.phone.strip() if signup_req.phone else None,
            dept
        )
    )

    client_ip = request.client.host if request.client else "127.0.0.1"

    # Audit log
    record_audit(
        actor_user_id=u_id,
        actor_role="ADMIN",
        event_type="ADMIN_ACCOUNT_REGISTERED",
        target_entity="APP_USER",
        target_id=str(u_id),
        hospital_id=hosp_id,
        details=f"System Administrator {full_name_clean} ({username_clean}) self-registered with master key for {hosp_name} ({dept}).",
        ip_address=client_ip
    )

    token_data = {
        "sub": username_clean,
        "user_id": u_id,
        "role": "ADMIN",
        "hospital_id": hosp_id
    }
    access_token = create_access_token(token_data)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=u_id,
        username=username_clean,
        full_name=full_name_clean,
        role="ADMIN",
        hospital_id=hosp_id,
        hospital_name=hosp_name
    )

