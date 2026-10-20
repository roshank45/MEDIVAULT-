# MediVault Entity-Relationship (ER) Diagram

The MediVault database design follows third normal form (3NF), minimizing redundancy while preserving historical clinical traceability and referential integrity.

## Mermaid ER Diagram

```mermaid
erDiagram
    HOSPITAL ||--o{ APP_USER : employs
    HOSPITAL ||--o{ VISIT : hosts
    HOSPITAL ||--o{ PRESCRIPTION : issues
    HOSPITAL ||--o{ MEDICAL_TEST : performs
    HOSPITAL ||--o{ PATIENT_ACCESS : grants

    APP_USER ||--o{ VISIT : attends
    APP_USER ||--o{ PRESCRIPTION : prescribes
    APP_USER ||--o{ VITAL_RECORD : records
    APP_USER ||--o{ ALLERGY : documents
    APP_USER ||--o{ MEDICAL_TEST : orders
    APP_USER ||--o{ TREATMENT_PLAN : formulates
    APP_USER ||--o{ PATIENT_ACCESS : logs
    APP_USER ||--o{ AUDIT_LOG : triggers

    PATIENT ||--o{ APP_USER : links_portal_account
    PATIENT ||--o{ VISIT : undergoes
    PATIENT ||--o{ VITAL_RECORD : has
    PATIENT ||--o{ ALLERGY : has
    PATIENT ||--o{ PRESCRIPTION : receives
    PATIENT ||--o{ MEDICAL_TEST : undergoes
    PATIENT ||--o{ TREATMENT_PLAN : receives
    PATIENT ||--|| EMERGENCY_PROFILE : owns
    PATIENT ||--o{ PATIENT_ACCESS : subject_of
    PATIENT ||--o{ AUDIT_LOG : subject_of

    VISIT ||--o{ VISIT_DIAGNOSIS : records
    DIAGNOSIS ||--o{ VISIT_DIAGNOSIS : classified_as
    VISIT ||--o{ VITAL_RECORD : captures
    VISIT ||--o{ PRESCRIPTION : originates
    VISIT ||--o{ MEDICAL_TEST : includes
    VISIT ||--o{ TREATMENT_PLAN : includes

    PRESCRIPTION ||--|{ PRESCRIPTION_ITEM : contains
    MEDICINE ||--o{ PRESCRIPTION_ITEM : prescribed_as
    PRESCRIPTION ||--o{ PRESCRIPTION_SAFETY_LOG : checked_by

    DRUG_INTERACTION }o--|| MEDICINE : evaluates

    HOSPITAL {
        NUMBER hospital_id PK
        VARCHAR2 name
        VARCHAR2 code UK
        VARCHAR2 city
        VARCHAR2 state
        VARCHAR2 phone
        NUMBER is_active
    }

    APP_USER {
        NUMBER user_id PK
        NUMBER hospital_id FK
        VARCHAR2 username UK
        VARCHAR2 password_hash
        VARCHAR2 full_name
        VARCHAR2 role
        VARCHAR2 specialty
        NUMBER is_active
    }

    PATIENT {
        NUMBER patient_id PK
        VARCHAR2 unique_patient_id UK
        NUMBER user_id FK
        VARCHAR2 first_name
        VARCHAR2 last_name
        DATE date_of_birth
        VARCHAR2 gender
        VARCHAR2 blood_group
        VARCHAR2 phone
        VARCHAR2 allergies_recorded_status
    }

    VISIT {
        NUMBER visit_id PK
        NUMBER patient_id FK
        NUMBER doctor_id FK
        NUMBER hospital_id FK
        TIMESTAMP visit_date
        VARCHAR2 visit_type
        VARCHAR2 chief_complaint
        VARCHAR2 status
    }

    DIAGNOSIS {
        NUMBER diagnosis_id PK
        VARCHAR2 icd10_code UK
        VARCHAR2 name
        VARCHAR2 category
    }

    VISIT_DIAGNOSIS {
        NUMBER visit_id PK,FK
        NUMBER diagnosis_id PK,FK
        VARCHAR2 diagnosis_type
        VARCHAR2 clinical_status
    }

    VITAL_RECORD {
        NUMBER vital_id PK
        NUMBER patient_id FK
        NUMBER visit_id FK
        NUMBER recorded_by FK
        VARCHAR2 measurement_type
        NUMBER numeric_value
        VARCHAR2 unit
        TIMESTAMP recorded_at
    }

    ALLERGY {
        NUMBER allergy_id PK
        NUMBER patient_id FK
        VARCHAR2 allergen_name
        VARCHAR2 reaction
        VARCHAR2 severity
        VARCHAR2 status
        NUMBER recorded_by FK
    }

    MEDICINE {
        NUMBER medicine_id PK
        VARCHAR2 brand_name
        VARCHAR2 generic_name
        VARCHAR2 drug_class
        VARCHAR2 dosage_form
        VARCHAR2 strength
        VARCHAR2 allergen_group
    }

    PRESCRIPTION {
        NUMBER prescription_id PK
        NUMBER patient_id FK
        NUMBER visit_id FK
        NUMBER doctor_id FK
        NUMBER hospital_id FK
        VARCHAR2 prescription_code UK
        VARCHAR2 status
    }

    PRESCRIPTION_ITEM {
        NUMBER item_id PK
        NUMBER prescription_id FK
        NUMBER medicine_id FK
        VARCHAR2 dose_amount
        VARCHAR2 dose_unit
        VARCHAR2 frequency
        VARCHAR2 route
        NUMBER duration_days
        DATE start_date
        DATE end_date
        VARCHAR2 status
    }

    DRUG_INTERACTION {
        NUMBER interaction_id PK
        VARCHAR2 drug1_name
        VARCHAR2 drug2_name
        VARCHAR2 severity
        VARCHAR2 description
    }

    EMERGENCY_PROFILE {
        NUMBER profile_id PK
        NUMBER patient_id UK,FK
        VARCHAR2 token_hash UK
        VARCHAR2 token_raw_preview
        NUMBER is_active
        TIMESTAMP expires_at
    }

    AUDIT_LOG {
        NUMBER log_id PK
        NUMBER actor_user_id
        VARCHAR2 actor_role
        VARCHAR2 event_type
        VARCHAR2 target_entity
        VARCHAR2 target_id
        NUMBER hospital_id
        NUMBER patient_id
        VARCHAR2 access_reason
        TIMESTAMP created_at
    }
```

## Relational Integrity & Normalization Rationale

1. **First Normal Form (1NF)**: All attributes are atomic. Prescription medications are itemized in `PRESCRIPTION_ITEM` rather than concatenated in a comma-delimited string. Diagnoses are decoupled into `VISIT_DIAGNOSIS`.
2. **Second Normal Form (2NF)**: All non-key attributes are fully functionally dependent on the entire primary key. In junction table `VISIT_DIAGNOSIS`, clinical status and diagnosis type pertain strictly to that specific visit-diagnosis pair.
3. **Third Normal Form (3NF)**: Transitive dependencies are removed. Hospital details reside in `HOSPITAL`, user details in `APP_USER`, medicine specifications in `MEDICINE`, preventing update and insertion anomalies.
4. **Historical Immutability**: Modifying or discontinuing a medication changes the status of `PRESCRIPTION` or `PRESCRIPTION_ITEM` and triggers an audit log, preserving complete longitudinal traceability for patient safety.
