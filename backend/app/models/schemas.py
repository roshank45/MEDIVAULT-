from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field

# ============================================================================
# Auth & User Schemas
# ============================================================================
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    full_name: str
    role: str
    hospital_id: Optional[int] = None
    hospital_name: Optional[str] = None

class UserCreate(BaseModel):
    hospital_id: Optional[int] = None
    username: str
    password: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: str  # 'ADMIN', 'DOCTOR', 'PATIENT', 'EMERGENCY_CLINICIAN'
    specialty: Optional[str] = None
    license_number: Optional[str] = None

class UserOut(BaseModel):
    user_id: int
    hospital_id: Optional[int]
    username: str
    full_name: str
    email: str
    phone: Optional[str]
    role: str
    specialty: Optional[str]
    license_number: Optional[str]
    is_active: int
    hospital_name: Optional[str] = None

class DoctorSignUpRequest(BaseModel):
    username: str
    password: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    hospital_id: int
    specialty: str
    license_number: str
    role: Optional[str] = "DOCTOR"

class AdminSignUpRequest(BaseModel):
    username: str
    password: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    hospital_id: Optional[int] = None
    department: Optional[str] = "Health System Administration"
    admin_secret_key: str

# ============================================================================
# Hospital Schemas
# ============================================================================
class HospitalCreate(BaseModel):
    name: str
    code: str
    address: str
    city: str
    state: str
    phone: str
    email: Optional[str] = None

class HospitalOut(BaseModel):
    hospital_id: int
    name: str
    code: str
    address: str
    city: str
    state: str
    phone: str
    email: Optional[str]
    is_active: int

# ============================================================================
# Patient Schemas
# ============================================================================
class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: str  # YYYY-MM-DD
    gender: str  # 'MALE', 'FEMALE', 'OTHER'
    blood_group: Optional[str] = "UNKNOWN"
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    allergies_recorded_status: Optional[str] = "NOT_RECORDED"

class PatientOut(BaseModel):
    patient_id: int
    unique_patient_id: str
    user_id: Optional[int] = None
    first_name: str
    last_name: str
    date_of_birth: str
    gender: str
    blood_group: Optional[str]
    phone: str
    email: Optional[str]
    address: Optional[str]
    emergency_contact_name: Optional[str]
    emergency_contact_phone: Optional[str]
    emergency_contact_relation: Optional[str]
    allergies_recorded_status: str
    created_at: Optional[str] = None

# ============================================================================
# Break-Glass Request
# ============================================================================
class BreakGlassRequest(BaseModel):
    patient_id: int
    reason: str
    access_type: str = "EMERGENCY_BREAK_GLASS"

# ============================================================================
# Diagnosis & Consultation (Visit) Schemas
# ============================================================================
class DiagnosisOut(BaseModel):
    diagnosis_id: int
    icd10_code: str
    name: str
    category: Optional[str]
    description: Optional[str]

class VisitDiagnosisCreate(BaseModel):
    diagnosis_id: int
    diagnosis_type: str = "PRIMARY"  # 'PRIMARY', 'SECONDARY', 'DIFFERENTIAL'
    clinical_status: str = "ACTIVE"
    notes: Optional[str] = None

class VisitCreate(BaseModel):
    patient_id: int
    hospital_id: int
    visit_type: str = "CONSULTATION"
    chief_complaint: str
    clinical_notes: Optional[str] = None
    diagnoses: Optional[List[VisitDiagnosisCreate]] = []

class VisitOut(BaseModel):
    visit_id: int
    patient_id: int
    doctor_id: int
    hospital_id: int
    visit_date: str
    visit_type: str
    chief_complaint: str
    clinical_notes: Optional[str]
    status: str
    doctor_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    hospital_name: Optional[str] = None
    hospital_code: Optional[str] = None

# ============================================================================
# Vital Records Schemas
# ============================================================================
class VitalRecordCreate(BaseModel):
    patient_id: int
    visit_id: Optional[int] = None
    measurement_type: str  # 'SYSTOLIC_BP', 'DIASTOLIC_BP', 'BLOOD_GLUCOSE', etc.
    numeric_value: float
    unit: str
    context_note: Optional[str] = None

class VitalRecordOut(BaseModel):
    vital_id: int
    patient_id: int
    visit_id: Optional[int]
    recorded_by: int
    measurement_type: str
    numeric_value: float
    unit: str
    context_note: Optional[str]
    recorded_at: str
    recorded_by_name: Optional[str] = None

# ============================================================================
# Allergy Schemas
# ============================================================================
class AllergyCreate(BaseModel):
    patient_id: int
    allergen_name: str
    allergen_type: str = "MEDICATION"
    reaction: str
    severity: str  # 'MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING'
    status: str = "ACTIVE"

class AllergyOut(BaseModel):
    allergy_id: int
    patient_id: int
    allergen_name: str
    allergen_type: str
    reaction: str
    severity: str
    status: str
    recorded_by: int
    recorded_at: str
    recorded_by_name: Optional[str] = None

# ============================================================================
# Medicine & Prescription Schemas
# ============================================================================
class MedicineOut(BaseModel):
    medicine_id: int
    brand_name: str
    generic_name: str
    drug_class: str
    dosage_form: str
    strength: str
    allergen_group: Optional[str] = None

class PrescriptionItemCreate(BaseModel):
    medicine_id: int
    dose_amount: str
    dose_unit: str
    frequency: str
    route: str = "ORAL"
    duration_days: int
    instructions: Optional[str] = None
    start_date: str  # YYYY-MM-DD
    end_date: str  # YYYY-MM-DD

class PrescriptionCreate(BaseModel):
    patient_id: int
    visit_id: int
    hospital_id: int
    clinical_notes: Optional[str] = None
    items: List[PrescriptionItemCreate]

class PrescriptionItemOut(BaseModel):
    item_id: int
    prescription_id: int
    medicine_id: int
    brand_name: Optional[str] = None
    generic_name: Optional[str] = None
    dose_amount: str
    dose_unit: str
    frequency: str
    route: str
    duration_days: int
    instructions: Optional[str]
    start_date: str
    end_date: str
    status: str

class PrescriptionOut(BaseModel):
    prescription_id: int
    patient_id: int
    visit_id: int
    doctor_id: int
    hospital_id: int
    prescription_code: str
    status: str
    clinical_notes: Optional[str]
    created_at: str
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    items: Optional[List[PrescriptionItemOut]] = []

# ============================================================================
# Medication Safety Schemas
# ============================================================================
class SafetyCandidateMedicine(BaseModel):
    medicine_id: int
    medicine_name: Optional[str] = None

class SafetyCheckRequest(BaseModel):
    patient_id: int
    candidate_medicines: List[SafetyCandidateMedicine]

class SafetyWarningItem(BaseModel):
    warning_type: str  # 'DUPLICATE_THERAPY', 'DRUG_INTERACTION', 'ALLERGY_CONFLICT'
    severity: str  # 'CRITICAL', 'MAJOR', 'MODERATE', 'INFO'
    title: str
    message: str
    matched_item: Optional[str] = None
    evidence_reference: Optional[str] = None

class SafetyCheckResponse(BaseModel):
    patient_id: int
    has_critical_warning: bool
    warning_count: int
    warnings: List[SafetyWarningItem]

# ============================================================================
# Medical Tests & Treatment Plans
# ============================================================================
class MedicalTestCreate(BaseModel):
    patient_id: int
    visit_id: Optional[int] = None
    hospital_id: int
    test_name: str
    test_category: str
    result_summary: Optional[str] = None
    numeric_result: Optional[float] = None
    result_unit: Optional[str] = None
    reference_range: Optional[str] = None
    status: str = "COMPLETED"

class MedicalTestOut(BaseModel):
    test_id: int
    patient_id: int
    visit_id: Optional[int]
    ordering_doctor_id: int
    hospital_id: int
    test_name: str
    test_category: str
    order_date: str
    completion_date: Optional[str]
    result_summary: Optional[str]
    numeric_result: Optional[float]
    result_unit: Optional[str]
    reference_range: Optional[str]
    status: str
    hospital_name: Optional[str] = None
    doctor_name: Optional[str] = None

class TreatmentPlanCreate(BaseModel):
    patient_id: int
    visit_id: Optional[int] = None
    title: str
    objective: str
    instructions: str
    start_date: str
    review_date: Optional[str] = None

class TreatmentPlanOut(BaseModel):
    plan_id: int
    patient_id: int
    visit_id: Optional[int]
    doctor_id: int
    title: str
    objective: str
    instructions: str
    status: str
    start_date: str
    review_date: Optional[str]
    doctor_name: Optional[str] = None

# ============================================================================
# Emergency Profile Schemas
# ============================================================================
class EmergencyPublicProfileOut(BaseModel):
    patient_id: int
    unique_patient_id: str
    patient_name: str
    gender: str
    blood_group: Optional[str] = None
    allergies_status: str
    critical_allergies: List[str] = []
    active_conditions: List[str] = []
    active_medications: List[str] = []
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    last_updated: str
    disclaimer: str

class EmergencyTokenGenerateResponse(BaseModel):
    patient_id: int
    token: str
    token_preview: str
    expires_at: str
    qr_url: str

# ============================================================================
# Audit Log Schemas
# ============================================================================
class AuditLogOut(BaseModel):
    log_id: int
    actor_user_id: Optional[int]
    actor_role: Optional[str]
    actor_name: Optional[str] = None
    event_type: str
    target_entity: str
    target_id: Optional[str]
    hospital_id: Optional[int]
    hospital_name: Optional[str] = None
    patient_id: Optional[int]
    patient_name: Optional[str] = None
    details: Optional[str]
    access_reason: Optional[str]
    ip_address: Optional[str]
    created_at: str
