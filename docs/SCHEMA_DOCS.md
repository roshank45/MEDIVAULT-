# MediVault Oracle Database Schema Documentation

This document describes the 18 normalized relational tables, constraints, indexes, views, stored procedures, and triggers implemented for MediVault.

---

## 1. Table Definitions & Data Dictionary

### Table 1: `HOSPITAL`
Stores participating healthcare institutions in the federated network.
- `HOSPITAL_ID` (NUMBER(10), PK): Unique internal sequence identifier.
- `NAME` (VARCHAR2(150), NOT NULL): Official facility name.
- `CODE` (VARCHAR2(20), UNIQUE, NOT NULL): Standardized institution code (e.g., `CGH`, `SMC`, `GVH`).
- `ADDRESS`, `CITY`, `STATE` (VARCHAR2): Physical location.
- `PHONE`, `EMAIL` (VARCHAR2): Official contact channels.
- `IS_ACTIVE` (NUMBER(1), CHECK IN (0, 1)): Operational status flag.
- `CREATED_AT` (TIMESTAMP): Registration timestamp.

### Table 2: `APP_USER`
Stores authenticated users across system administration, doctors, emergency clinicians, and patients.
- `USER_ID` (NUMBER(10), PK): Unique internal sequence identifier.
- `HOSPITAL_ID` (NUMBER(10), FK -> HOSPITAL): Primary clinical institutional affiliation.
- `USERNAME` (VARCHAR2(60), UNIQUE, NOT NULL): Login handle.
- `PASSWORD_HASH` (VARCHAR2(255), NOT NULL): One-way salted bcrypt hash. Plaintext passwords are never stored.
- `FULL_NAME` (VARCHAR2(120), NOT NULL): Staff or patient legal name.
- `EMAIL` (VARCHAR2(120), UNIQUE, NOT NULL): Digital communication address.
- `ROLE` (VARCHAR2(30), CHECK IN ('ADMIN', 'DOCTOR', 'PATIENT', 'EMERGENCY_CLINICIAN')): RBAC authorization tier.
- `SPECIALTY` (VARCHAR2(100)): Clinical subspecialty (e.g., Cardiology, Endocrinology).
- `LICENSE_NUMBER` (VARCHAR2(50)): State or national medical license registration.
- `IS_ACTIVE` (NUMBER(1), CHECK IN (0, 1)): Account active status flag.

### Table 3: `PATIENT`
Centralized patient demographic registry.
- `PATIENT_ID` (NUMBER(10), PK): Surrogate sequence identifier.
- `UNIQUE_PATIENT_ID` (VARCHAR2(30), UNIQUE, NOT NULL): Public immutable medical ID formatted as `MV-YYYY-XXXXXX` (e.g., `MV-2026-000001`). Enforced unique in Oracle.
- `USER_ID` (NUMBER(10), FK -> APP_USER): Optional linkage to patient portal account.
- `FIRST_NAME`, `LAST_NAME` (VARCHAR2(60), NOT NULL): Legal identity.
- `DATE_OF_BIRTH` (DATE, NOT NULL): Birth date.
- `GENDER` (VARCHAR2(20), CHECK IN ('MALE', 'FEMALE', 'OTHER')): Biological sex.
- `BLOOD_GROUP` (VARCHAR2(20)): ABO and Rh factor (e.g., `O_POSITIVE`, `A_NEGATIVE`).
- `PHONE`, `EMAIL`, `ADDRESS` (VARCHAR2): Contact coordinates.
- `EMERGENCY_CONTACT_NAME`, `EMERGENCY_CONTACT_PHONE`, `EMERGENCY_CONTACT_RELATION`: Next-of-kin contacts for emergency triage.
- `ALLERGIES_RECORDED_STATUS` (VARCHAR2(30), CHECK IN ('NOT_RECORDED', 'NO_KNOWN_ALLERGIES', 'DOCUMENTED')): Clarifies whether allergy history has been verified.

### Table 4: `PATIENT_ACCESS`
Audits patient record access grants and Break-Glass clinical overrides.
- `ACCESS_ID` (NUMBER(10), PK): Sequence identifier.
- `PATIENT_ID` (NUMBER(10), FK -> PATIENT): Target patient.
- `USER_ID` (NUMBER(10), FK -> APP_USER): Requesting clinician.
- `HOSPITAL_ID` (NUMBER(10), FK -> HOSPITAL): Institution where access occurred.
- `ACCESS_TYPE` (VARCHAR2(30), CHECK IN ('ROUTINE_CARE', 'EMERGENCY_BREAK_GLASS', 'PATIENT_CONSENT', 'REFERRAL')).
- `REASON` (VARCHAR2(300), NOT NULL): Mandatory clinical justification.
- `IS_BREAK_GLASS` (NUMBER(1), CHECK IN (0, 1)): Flag indicating emergency override.
- `GRANTED_AT`, `EXPIRES_AT` (TIMESTAMP): Time-bounded access window.

### Table 5: `VISIT`
Captures clinical encounters and consultations across participating hospitals.
- `VISIT_ID` (NUMBER(10), PK): Sequence identifier.
- `PATIENT_ID` (NUMBER(10), FK -> PATIENT): Patient treated.
- `DOCTOR_ID` (NUMBER(10), FK -> APP_USER): Attending clinician.
- `HOSPITAL_ID` (NUMBER(10), FK -> HOSPITAL): Treating hospital.
- `VISIT_DATE` (TIMESTAMP, NOT NULL): Encounter timestamp.
- `VISIT_TYPE` (VARCHAR2(40), CHECK IN ('CONSULTATION', 'EMERGENCY', 'FOLLOW_UP', 'INPATIENT', 'ROUTINE_CHECKUP')).
- `CHIEF_COMPLAINT` (VARCHAR2(500), NOT NULL): Reported primary symptoms.
- `CLINICAL_NOTES` (VARCHAR2(4000)): Attending physician clinical evaluation.
- `STATUS` (VARCHAR2(30), CHECK IN ('IN_PROGRESS', 'COMPLETED', 'CANCELLED')).

### Table 6: `DIAGNOSIS`
Standardized ICD-10 diagnostic catalog.
- `DIAGNOSIS_ID` (NUMBER(10), PK).
- `ICD10_CODE` (VARCHAR2(20), UNIQUE, NOT NULL): Standard code (e.g., `E11.9`, `I10`).
- `NAME` (VARCHAR2(200), NOT NULL): Clinical diagnosis title.
- `CATEGORY`, `DESCRIPTION` (VARCHAR2).

### Table 7: `VISIT_DIAGNOSIS`
Many-to-many junction table mapping diagnoses to specific visits.
- `VISIT_ID` (NUMBER(10), FK -> VISIT).
- `DIAGNOSIS_ID` (NUMBER(10), FK -> DIAGNOSIS).
- `DIAGNOSIS_TYPE` (VARCHAR2(30), CHECK IN ('PRIMARY', 'SECONDARY', 'DIFFERENTIAL', 'PROVISIONAL')).
- `CLINICAL_STATUS` (VARCHAR2(30), CHECK IN ('ACTIVE', 'RESOLVED', 'RECURRENT', 'CHRONIC')).
- `NOTES` (VARCHAR2(500)).

### Table 8: `VITAL_RECORD`
Normalized time-series vital measurements.
- `VITAL_ID` (NUMBER(10), PK).
- `PATIENT_ID` (NUMBER(10), FK -> PATIENT).
- `VISIT_ID` (NUMBER(10), FK -> VISIT, NULLABLE for home/routine measurements).
- `RECORDED_BY` (NUMBER(10), FK -> APP_USER).
- `MEASUREMENT_TYPE` (VARCHAR2(50), CHECK IN ('SYSTOLIC_BP', 'DIASTOLIC_BP', 'BLOOD_GLUCOSE', 'HEART_RATE', 'BODY_TEMPERATURE', 'OXYGEN_SATURATION', 'WEIGHT')).
- `NUMERIC_VALUE` (NUMBER(8, 2), NOT NULL): Measured value.
- `UNIT` (VARCHAR2(20), NOT NULL): Measurement unit (e.g., `mmHg`, `mg/dL`, `bpm`, `C`).
- `CONTEXT_NOTE` (VARCHAR2(200)): Context (e.g., Fasting, Sitting).
- `RECORDED_AT` (TIMESTAMP, NOT NULL).

### Table 9: `ALLERGY`
Documents patient drug, food, or environmental hypersensitivities.
- `ALLERGY_ID` (NUMBER(10), PK).
- `PATIENT_ID` (NUMBER(10), FK -> PATIENT).
- `ALLERGEN_NAME` (VARCHAR2(150), NOT NULL).
- `ALLERGEN_TYPE` (VARCHAR2(50), CHECK IN ('MEDICATION', 'FOOD', 'ENVIRONMENTAL', 'OTHER')).
- `REACTION` (VARCHAR2(250), NOT NULL): Manifested physiological reaction.
- `SEVERITY` (VARCHAR2(30), CHECK IN ('MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING')).
- `STATUS` (VARCHAR2(30), CHECK IN ('ACTIVE', 'INACTIVE', 'RESOLVED')).
- `RECORDED_BY` (NUMBER(10), FK -> APP_USER).

### Table 10: `MEDICINE`
Standardized pharmacological reference catalog.
- `MEDICINE_ID` (NUMBER(10), PK).
- `BRAND_NAME` (VARCHAR2(150), NOT NULL): Commercial brand name.
- `GENERIC_NAME` (VARCHAR2(150), NOT NULL): Active generic ingredient.
- `DRUG_CLASS` (VARCHAR2(100), NOT NULL): Pharmacological class (e.g., ACE Inhibitor, Biguanide).
- `DOSAGE_FORM` (VARCHAR2(50), NOT NULL): Oral Tablet, Capsule, Inhaler.
- `STRENGTH` (VARCHAR2(50), NOT NULL): Metric strength (e.g., 500 mg, 10 mg).
- `ALLERGEN_GROUP` (VARCHAR2(100)): Cross-sensitivity family (e.g., `PENICILLIN`, `NSAID`).

### Table 11: `PRESCRIPTION`
Prescription order container.
- `PRESCRIPTION_ID` (NUMBER(10), PK).
- `PATIENT_ID` (NUMBER(10), FK -> PATIENT).
- `VISIT_ID` (NUMBER(10), FK -> VISIT).
- `DOCTOR_ID` (NUMBER(10), FK -> APP_USER).
- `HOSPITAL_ID` (NUMBER(10), FK -> HOSPITAL).
- `PRESCRIPTION_CODE` (VARCHAR2(30), UNIQUE, NOT NULL): Formatted order code.
- `STATUS` (VARCHAR2(30), CHECK IN ('ACTIVE', 'COMPLETED', 'DISCONTINUED', 'EXPIRED')).
- `CLINICAL_NOTES` (VARCHAR2(1000)).

### Table 12: `PRESCRIPTION_ITEM`
Itemized medications within a prescription order (1NF).
- `ITEM_ID` (NUMBER(10), PK).
- `PRESCRIPTION_ID` (NUMBER(10), FK -> PRESCRIPTION).
- `MEDICINE_ID` (NUMBER(10), FK -> MEDICINE).
- `DOSE_AMOUNT`, `DOSE_UNIT` (VARCHAR2).
- `FREQUENCY` (VARCHAR2(50), NOT NULL).
- `ROUTE` (VARCHAR2(30), DEFAULT 'ORAL').
- `DURATION_DAYS` (NUMBER(4), NOT NULL).
- `INSTRUCTIONS` (VARCHAR2(500)).
- `START_DATE`, `END_DATE` (DATE, NOT NULL).
- `STATUS` (VARCHAR2(30), CHECK IN ('ACTIVE', 'COMPLETED', 'DISCONTINUED')).

### Table 13: `DRUG_INTERACTION`
Sample knowledge base for drug-drug interactions.
- `INTERACTION_ID` (NUMBER(10), PK).
- `DRUG1_NAME`, `DRUG2_NAME` (VARCHAR2(150), NOT NULL).
- `SEVERITY` (VARCHAR2(30), CHECK IN ('MINOR', 'MODERATE', 'MAJOR', 'CONTRAINDICATED')).
- `DESCRIPTION` (VARCHAR2(1000), NOT NULL).
- `CLINICAL_EFFECT` (VARCHAR2(500)).
- `EVIDENCE_LEVEL` (VARCHAR2(50), DEFAULT 'DEMO_SYNTHETIC').

### Table 14: `MEDICAL_TEST`
Laboratory investigations and diagnostic imaging metadata.
- `TEST_ID` (NUMBER(10), PK).
- `PATIENT_ID` (NUMBER(10), FK -> PATIENT).
- `VISIT_ID` (NUMBER(10), FK -> VISIT).
- `ORDERING_DOCTOR_ID` (NUMBER(10), FK -> APP_USER).
- `HOSPITAL_ID` (NUMBER(10), FK -> HOSPITAL).
- `TEST_NAME`, `TEST_CATEGORY` (VARCHAR2).
- `ORDER_DATE`, `COMPLETION_DATE` (TIMESTAMP).
- `RESULT_SUMMARY`, `NUMERIC_RESULT`, `RESULT_UNIT`, `REFERENCE_RANGE` (VARCHAR2/NUMBER).
- `STATUS` (VARCHAR2(30), CHECK IN ('ORDERED', 'PENDING', 'COMPLETED', 'CANCELLED')).
- `REPORT_FILE_REF` (VARCHAR2(300)): Secure path reference.

### Table 15: `TREATMENT_PLAN`
Long-term disease management protocols.
- `PLAN_ID` (NUMBER(10), PK).
- `PATIENT_ID` (NUMBER(10), FK -> PATIENT).
- `VISIT_ID` (NUMBER(10), FK -> VISIT).
- `DOCTOR_ID` (NUMBER(10), FK -> APP_USER).
- `TITLE`, `OBJECTIVE`, `INSTRUCTIONS` (VARCHAR2).
- `STATUS` (VARCHAR2(30), CHECK IN ('ACTIVE', 'COMPLETED', 'REVISED', 'DISCONTINUED')).
- `START_DATE`, `REVIEW_DATE`, `COMPLETION_DATE` (DATE).

### Table 16: `EMERGENCY_PROFILE`
Cryptographic emergency QR tokens and triage preferences.
- `PROFILE_ID` (NUMBER(10), PK).
- `PATIENT_ID` (NUMBER(10), UNIQUE, FK -> PATIENT).
- `TOKEN_HASH` (VARCHAR2(128), UNIQUE, NOT NULL): SHA-256 hash of token.
- `TOKEN_RAW_PREVIEW` (VARCHAR2(20), NOT NULL): Truncated token preview.
- `IS_ACTIVE` (NUMBER(1), CHECK IN (0, 1)).
- `ALLOW_BLOOD_GROUP`, `ALLOW_ALLERGIES`, `ALLOW_MEDICATIONS`, `ALLOW_CONTACTS` (NUMBER(1)).
- `EXPIRES_AT` (TIMESTAMP, NOT NULL).
- `CREATED_AT`, `REVOKED_AT` (TIMESTAMP).

### Table 17: `AUDIT_LOG`
Comprehensive security and data modification audit trail.
- `LOG_ID` (NUMBER(10), PK).
- `ACTOR_USER_ID` (NUMBER(10), NULLABLE for public QR scans).
- `ACTOR_ROLE` (VARCHAR2(30)).
- `EVENT_TYPE` (VARCHAR2(60), NOT NULL).
- `TARGET_ENTITY` (VARCHAR2(60), NOT NULL).
- `TARGET_ID` (VARCHAR2(60)).
- `HOSPITAL_ID` (NUMBER(10)).
- `PATIENT_ID` (NUMBER(10)).
- `DETAILS` (VARCHAR2(1000)).
- `ACCESS_REASON` (VARCHAR2(300)).
- `IP_ADDRESS` (VARCHAR2(45)).
- `CREATED_AT` (TIMESTAMP, NOT NULL).

### Table 18: `PRESCRIPTION_SAFETY_LOG`
Logs clinical decision support warning triggers and physician overrides.
- `SAFETY_ID` (NUMBER(10), PK).
- `PRESCRIPTION_ID` (NUMBER(10)).
- `PATIENT_ID` (NUMBER(10), FK -> PATIENT).
- `WARNING_TYPE` (VARCHAR2(50), CHECK IN ('DUPLICATE_THERAPY', 'DRUG_INTERACTION', 'ALLERGY_CONFLICT', 'DOSAGE_ALERT')).
- `SEVERITY` (VARCHAR2(30)).
- `WARNING_MESSAGE` (VARCHAR2(1000), NOT NULL).
- `CLINICIAN_OVERRIDE_REASON` (VARCHAR2(500)).
- `ACKNOWLEDGED_BY` (NUMBER(10), FK -> APP_USER).
- `ACKNOWLEDGED_AT` (TIMESTAMP).

---

## 2. Views

1. `VW_ACTIVE_PATIENT_MEDICATIONS`: Aggregates active prescriptions, items, dosage, frequency, and hospital names for current patient medication review.
2. `VW_PATIENT_TIMELINE_SUMMARY`: Aggregates patient visits with doctor names, hospitals, diagnostic counts, prescription counts, and test counts.
3. `VW_HOSPITAL_ACTIVITY_METRICS`: Real-time analytics view computing total visits, unique patients seen, prescriptions issued, and tests performed per hospital facility.
4. `VW_PATIENT_ALLERGIES_OVERVIEW`: Combines patient identifiers with active allergies, severity ratings, and certifying clinicians.

---

## 3. Stored Procedures & Triggers

### Stored Procedures
- `SP_GET_PATIENT_HISTORY(p_patient_id, p_history_cur OUT SYS_REFCURSOR)`: Retrieves longitudinal history using an Oracle SYS_REFCURSOR.
- `SP_REGISTER_PATIENT(...)`: Atomically generates sequential unique identifier `MV-YYYY-XXXXXX` and inserts patient record.
- `SP_RECORD_AUDIT_LOG(...)`: Standardized procedure to write security events into `AUDIT_LOG`.

### Triggers
- `TRG_AUDIT_VISIT`: Automatically fires `AFTER INSERT OR UPDATE ON VISIT` to record clinical consultation events in `AUDIT_LOG`.
- `TRG_AUDIT_PRESCRIPTION`: Automatically fires `AFTER INSERT OR UPDATE OF STATUS ON PRESCRIPTION` to record prescribing events in `AUDIT_LOG`.
- Sequence Triggers (`TRG_BI_*`): Auto-assign primary key sequence next values when inserting.
