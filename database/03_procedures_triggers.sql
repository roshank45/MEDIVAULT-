-- ============================================================================
-- MediVault: Centralized Patient Medical Records and Medication Safety System
-- File: 03_procedures_triggers.sql
-- Description: PL/SQL Stored Procedures, Functions, and Database Audit Triggers
-- ============================================================================

-- ============================================================================
-- 1. BEFORE INSERT TRIGGERS FOR AUTO-INCREMENT SEQUENCES
-- ============================================================================

CREATE OR REPLACE TRIGGER TRG_BI_HOSPITAL
BEFORE INSERT ON HOSPITAL
FOR EACH ROW
BEGIN
    IF :NEW.HOSPITAL_ID IS NULL THEN
        SELECT HOSPITAL_SEQ.NEXTVAL INTO :NEW.HOSPITAL_ID FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_BI_APP_USER
BEFORE INSERT ON APP_USER
FOR EACH ROW
BEGIN
    IF :NEW.USER_ID IS NULL THEN
        SELECT APP_USER_SEQ.NEXTVAL INTO :NEW.USER_ID FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_BI_PATIENT
BEFORE INSERT ON PATIENT
FOR EACH ROW
BEGIN
    IF :NEW.PATIENT_ID IS NULL THEN
        SELECT PATIENT_SEQ.NEXTVAL INTO :NEW.PATIENT_ID FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_BI_PATIENT_ACCESS
BEFORE INSERT ON PATIENT_ACCESS
FOR EACH ROW
BEGIN
    IF :NEW.ACCESS_ID IS NULL THEN
        SELECT PATIENT_ACCESS_SEQ.NEXTVAL INTO :NEW.ACCESS_ID FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_BI_VISIT
BEFORE INSERT ON VISIT
FOR EACH ROW
BEGIN
    IF :NEW.VISIT_ID IS NULL THEN
        SELECT VISIT_SEQ.NEXTVAL INTO :NEW.VISIT_ID FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_BI_DIAGNOSIS
BEFORE INSERT ON DIAGNOSIS
FOR EACH ROW
BEGIN
    IF :NEW.DIAGNOSIS_ID IS NULL THEN
        SELECT DIAGNOSIS_SEQ.NEXTVAL INTO :NEW.DIAGNOSIS_ID FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_BI_VITAL_RECORD
BEFORE INSERT ON VITAL_RECORD
FOR EACH ROW
BEGIN
    IF :NEW.VITAL_ID IS NULL THEN
        SELECT VITAL_RECORD_SEQ.NEXTVAL INTO :NEW.VITAL_ID FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_BI_ALLERGY
BEFORE INSERT ON ALLERGY
FOR EACH ROW
BEGIN
    IF :NEW.ALLERGY_ID IS NULL THEN
        SELECT ALLERGY_SEQ.NEXTVAL INTO :NEW.ALLERGY_ID FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_BI_MEDICINE
BEFORE INSERT ON MEDICINE
FOR EACH ROW
BEGIN
    IF :NEW.MEDICINE_ID IS NULL THEN
        SELECT MEDICINE_SEQ.NEXTVAL INTO :NEW.MEDICINE_ID FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_BI_PRESCRIPTION
BEFORE INSERT ON PRESCRIPTION
FOR EACH ROW
BEGIN
    IF :NEW.PRESCRIPTION_ID IS NULL THEN
        SELECT PRESCRIPTION_SEQ.NEXTVAL INTO :NEW.PRESCRIPTION_ID FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_BI_PRESCRIPTION_ITEM
BEFORE INSERT ON PRESCRIPTION_ITEM
FOR EACH ROW
BEGIN
    IF :NEW.ITEM_ID IS NULL THEN
        SELECT PRESCRIPTION_ITEM_SEQ.NEXTVAL INTO :NEW.ITEM_ID FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_BI_DRUG_INTERACTION
BEFORE INSERT ON DRUG_INTERACTION
FOR EACH ROW
BEGIN
    IF :NEW.INTERACTION_ID IS NULL THEN
        SELECT DRUG_INTERACTION_SEQ.NEXTVAL INTO :NEW.INTERACTION_ID FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_BI_MEDICAL_TEST
BEFORE INSERT ON MEDICAL_TEST
FOR EACH ROW
BEGIN
    IF :NEW.TEST_ID IS NULL THEN
        SELECT MEDICAL_TEST_SEQ.NEXTVAL INTO :NEW.TEST_ID FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_BI_TREATMENT_PLAN
BEFORE INSERT ON TREATMENT_PLAN
FOR EACH ROW
BEGIN
    IF :NEW.PLAN_ID IS NULL THEN
        SELECT TREATMENT_PLAN_SEQ.NEXTVAL INTO :NEW.PLAN_ID FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_BI_EMERGENCY_PROFILE
BEFORE INSERT ON EMERGENCY_PROFILE
FOR EACH ROW
BEGIN
    IF :NEW.PROFILE_ID IS NULL THEN
        SELECT EMERGENCY_PROFILE_SEQ.NEXTVAL INTO :NEW.PROFILE_ID FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_BI_AUDIT_LOG
BEFORE INSERT ON AUDIT_LOG
FOR EACH ROW
BEGIN
    IF :NEW.LOG_ID IS NULL THEN
        SELECT AUDIT_LOG_SEQ.NEXTVAL INTO :NEW.LOG_ID FROM DUAL;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER TRG_BI_SAFETY_LOG
BEFORE INSERT ON PRESCRIPTION_SAFETY_LOG
FOR EACH ROW
BEGIN
    IF :NEW.SAFETY_ID IS NULL THEN
        SELECT PRESCRIPTION_SAFETY_LOG_SEQ.NEXTVAL INTO :NEW.SAFETY_ID FROM DUAL;
    END IF;
END;
/

-- ============================================================================
-- 2. AUDIT TRIGGERS (Automated DB-level event capture)
-- ============================================================================

-- Trigger 1: Automatic Audit Log for Visit creation and modifications
CREATE OR REPLACE TRIGGER TRG_AUDIT_VISIT
AFTER INSERT OR UPDATE ON VISIT
FOR EACH ROW
DECLARE
    v_event VARCHAR2(60);
    v_details VARCHAR2(1000);
BEGIN
    IF INSERTING THEN
        v_event := 'VISIT_RECORDED';
        v_details := 'New consultation recorded at hospital ID ' || :NEW.HOSPITAL_ID || 
                     ' by doctor ID ' || :NEW.DOCTOR_ID || '. Chief Complaint: ' || SUBSTR(:NEW.CHIEF_COMPLAINT, 1, 200);
    ELSE
        v_event := 'VISIT_UPDATED';
        v_details := 'Consultation ID ' || :OLD.VISIT_ID || ' modified. Status changed from ' || 
                     :OLD.STATUS || ' to ' || :NEW.STATUS;
    END IF;

    INSERT INTO AUDIT_LOG (
        LOG_ID, ACTOR_USER_ID, ACTOR_ROLE, EVENT_TYPE, TARGET_ENTITY, TARGET_ID,
        HOSPITAL_ID, PATIENT_ID, DETAILS, ACCESS_REASON, IP_ADDRESS, CREATED_AT
    ) VALUES (
        AUDIT_LOG_SEQ.NEXTVAL,
        :NEW.DOCTOR_ID,
        'DOCTOR',
        v_event,
        'VISIT',
        TO_CHAR(:NEW.VISIT_ID),
        :NEW.HOSPITAL_ID,
        :NEW.PATIENT_ID,
        v_details,
        'CLINICAL_DOCUMENTATION',
        'DATABASE_TRIGGER',
        SYSTIMESTAMP
    );
END;
/

-- Trigger 2: Automatic Audit Log on Prescription Status / Creation
CREATE OR REPLACE TRIGGER TRG_AUDIT_PRESCRIPTION
AFTER INSERT OR UPDATE OF STATUS ON PRESCRIPTION
FOR EACH ROW
DECLARE
    v_event VARCHAR2(60);
    v_details VARCHAR2(1000);
BEGIN
    IF INSERTING THEN
        v_event := 'PRESCRIPTION_CREATED';
        v_details := 'Rx ' || :NEW.PRESCRIPTION_CODE || ' issued at hospital ID ' || :NEW.HOSPITAL_ID;
    ELSE
        v_event := 'PRESCRIPTION_STATUS_CHANGED';
        v_details := 'Rx ' || :OLD.PRESCRIPTION_CODE || ' status transitioned from ' || :OLD.STATUS || ' to ' || :NEW.STATUS;
    END IF;

    INSERT INTO AUDIT_LOG (
        LOG_ID, ACTOR_USER_ID, ACTOR_ROLE, EVENT_TYPE, TARGET_ENTITY, TARGET_ID,
        HOSPITAL_ID, PATIENT_ID, DETAILS, ACCESS_REASON, IP_ADDRESS, CREATED_AT
    ) VALUES (
        AUDIT_LOG_SEQ.NEXTVAL,
        :NEW.DOCTOR_ID,
        'DOCTOR',
        v_event,
        'PRESCRIPTION',
        TO_CHAR(:NEW.PRESCRIPTION_ID),
        :NEW.HOSPITAL_ID,
        :NEW.PATIENT_ID,
        v_details,
        'MEDICATION_MANAGEMENT',
        'DATABASE_TRIGGER',
        SYSTIMESTAMP
    );
END;
/

-- ============================================================================
-- 3. STORED PROCEDURES
-- ============================================================================

-- Stored Procedure 1: SP_GET_PATIENT_HISTORY
-- Uses SYS_REFCURSOR to return longitudinal consultation history by Patient ID
CREATE OR REPLACE PROCEDURE SP_GET_PATIENT_HISTORY (
    p_patient_id    IN  NUMBER,
    p_history_cur   OUT SYS_REFCURSOR
) AS
BEGIN
    OPEN p_history_cur FOR
        SELECT 
            v.VISIT_ID,
            v.VISIT_DATE,
            v.VISIT_TYPE,
            v.CHIEF_COMPLAINT,
            v.CLINICAL_NOTES,
            v.STATUS AS VISIT_STATUS,
            h.NAME AS HOSPITAL_NAME,
            h.CODE AS HOSPITAL_CODE,
            doc.FULL_NAME AS DOCTOR_NAME,
            doc.SPECIALTY AS DOCTOR_SPECIALTY
        FROM VISIT v
        JOIN HOSPITAL h ON v.HOSPITAL_ID = h.HOSPITAL_ID
        JOIN APP_USER doc ON v.DOCTOR_ID = doc.USER_ID
        WHERE v.PATIENT_ID = p_patient_id
        ORDER BY v.VISIT_DATE DESC;
END SP_GET_PATIENT_HISTORY;
/

-- Stored Procedure 2: SP_REGISTER_PATIENT
-- Atomically generates unique formatted patient ID (e.g. MV-2026-000001) and inserts patient
CREATE OR REPLACE PROCEDURE SP_REGISTER_PATIENT (
    p_first_name                IN  VARCHAR2,
    p_last_name                 IN  VARCHAR2,
    p_dob                       IN  DATE,
    p_gender                    IN  VARCHAR2,
    p_blood_group               IN  VARCHAR2,
    p_phone                     IN  VARCHAR2,
    p_email                     IN  VARCHAR2,
    p_address                   IN  VARCHAR2,
    p_emergency_name            IN  VARCHAR2,
    p_emergency_phone           IN  VARCHAR2,
    p_emergency_relation        IN  VARCHAR2,
    p_allergy_status            IN  VARCHAR2,
    o_patient_id                OUT NUMBER,
    o_unique_patient_id         OUT VARCHAR2
) AS
    v_next_val NUMBER;
    v_year VARCHAR2(4);
BEGIN
    SELECT PATIENT_SEQ.NEXTVAL INTO v_next_val FROM DUAL;
    SELECT TO_CHAR(SYSDATE, 'YYYY') INTO v_year FROM DUAL;
    
    -- Format: MV-YYYY-XXXXXX
    o_unique_patient_id := 'MV-' || v_year || '-' || LPAD(TO_CHAR(v_next_val), 6, '0');
    o_patient_id := v_next_val;

    INSERT INTO PATIENT (
        PATIENT_ID, UNIQUE_PATIENT_ID, FIRST_NAME, LAST_NAME,
        DATE_OF_BIRTH, GENDER, BLOOD_GROUP, PHONE, EMAIL, ADDRESS,
        EMERGENCY_CONTACT_NAME, EMERGENCY_CONTACT_PHONE, EMERGENCY_CONTACT_RELATION,
        ALLERGIES_RECORDED_STATUS, CREATED_AT, UPDATED_AT
    ) VALUES (
        o_patient_id, o_unique_patient_id, p_first_name, p_last_name,
        p_dob, p_gender, p_blood_group, p_phone, p_email, p_address,
        p_emergency_name, p_emergency_phone, p_emergency_relation,
        NVL(p_allergy_status, 'NOT_RECORDED'), SYSTIMESTAMP, SYSTIMESTAMP
    );

    COMMIT;
END SP_REGISTER_PATIENT;
/

-- Stored Procedure 3: SP_RECORD_AUDIT_LOG
CREATE OR REPLACE PROCEDURE SP_RECORD_AUDIT_LOG (
    p_actor_id      IN NUMBER,
    p_actor_role    IN VARCHAR2,
    p_event_type    IN VARCHAR2,
    p_entity        IN VARCHAR2,
    p_target_id     IN VARCHAR2,
    p_hospital_id   IN NUMBER,
    p_patient_id    IN NUMBER,
    p_details       IN VARCHAR2,
    p_reason        IN VARCHAR2,
    p_ip            IN VARCHAR2
) AS
BEGIN
    INSERT INTO AUDIT_LOG (
        LOG_ID, ACTOR_USER_ID, ACTOR_ROLE, EVENT_TYPE, TARGET_ENTITY, TARGET_ID,
        HOSPITAL_ID, PATIENT_ID, DETAILS, ACCESS_REASON, IP_ADDRESS, CREATED_AT
    ) VALUES (
        AUDIT_LOG_SEQ.NEXTVAL,
        p_actor_id, p_actor_role, p_event_type, p_entity, p_target_id,
        p_hospital_id, p_patient_id, p_details, p_reason, p_ip, SYSTIMESTAMP
    );
    COMMIT;
END SP_RECORD_AUDIT_LOG;
/
