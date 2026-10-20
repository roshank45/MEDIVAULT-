from fastapi import APIRouter, HTTPException, status, Depends, Request
from app.core.database import query_one
from app.core.security import verify_password, create_access_token, get_current_user
from app.models.schemas import LoginRequest, TokenResponse, UserOut
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
