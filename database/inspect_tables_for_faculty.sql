-- ============================================================================
-- MediVault: Oracle Database Table Structures & Contents Inspection Script
-- Use this script in SQL*Plus or Oracle SQL Developer to take faculty review screenshots
-- ============================================================================

SET LINESIZE 250
SET PAGESIZE 100
SET TAB OFF
SET WRAP OFF
SET FEEDBACK ON
SET ECHO ON

PROMPT ====================================================================
PROMPT 1. SCHEMA OVERVIEW: ALL 18 TABLES IN MEDIVAULT SCHEMA
PROMPT ====================================================================
SELECT table_name FROM user_tables ORDER BY table_name;

PROMPT
PROMPT ====================================================================
PROMPT 2. TABLE: PATIENT (Structure & Contents)
PROMPT ====================================================================
DESC PATIENT;

COLUMN unique_patient_id FORMAT A16
COLUMN first_name FORMAT A12
COLUMN last_name FORMAT A12
COLUMN blood_group FORMAT A12
COLUMN phone FORMAT A14
SELECT patient_id, unique_patient_id, first_name, last_name, blood_group, phone 
FROM PATIENT 
WHERE ROWNUM <= 5;

PROMPT
PROMPT ====================================================================
PROMPT 3. TABLE: APP_USER (Clinicians, Doctors, Administrators)
PROMPT ====================================================================
DESC APP_USER;

COLUMN username FORMAT A15
COLUMN full_name FORMAT A24
COLUMN role FORMAT A18
COLUMN specialty FORMAT A20
SELECT user_id, username, full_name, role, specialty, is_active 
FROM APP_USER 
WHERE ROWNUM <= 6;

PROMPT
PROMPT ====================================================================
PROMPT 4. TABLE: HOSPITAL (Participating Multi-Hospital Network)
PROMPT ====================================================================
DESC HOSPITAL;

COLUMN name FORMAT A28
COLUMN code FORMAT A8
COLUMN city FORMAT A15
COLUMN phone FORMAT A16
SELECT hospital_id, name, code, city, phone, is_active 
FROM HOSPITAL;

PROMPT
PROMPT ====================================================================
PROMPT 5. TABLE: VISIT (Clinical Encounters Across Hospitals)
PROMPT ====================================================================
DESC VISIT;

COLUMN visit_type FORMAT A14
COLUMN chief_complaint FORMAT A40
SELECT visit_id, patient_id, doctor_id, hospital_id, visit_type, chief_complaint 
FROM VISIT 
WHERE ROWNUM <= 5;

PROMPT
PROMPT ====================================================================
PROMPT 6. TABLE: DIAGNOSIS (ICD-10 Clinical Diagnoses)
PROMPT ====================================================================
DESC DIAGNOSIS;

COLUMN icd10_code FORMAT A10
COLUMN name FORMAT A35
COLUMN category FORMAT A25
SELECT diagnosis_id, icd10_code, name, category 
FROM DIAGNOSIS;

PROMPT
PROMPT ====================================================================
PROMPT 7. TABLE: VITAL_RECORD (Longitudinal Patient Vitals)
PROMPT ====================================================================
DESC VITAL_RECORD;

COLUMN measurement_type FORMAT A18
COLUMN unit FORMAT A8
SELECT vital_id, patient_id, measurement_type, numeric_value, unit, recorded_at 
FROM VITAL_RECORD 
WHERE ROWNUM <= 6;

PROMPT
PROMPT ====================================================================
PROMPT 8. TABLE: ALLERGY (Recorded Critical Allergies)
PROMPT ====================================================================
DESC ALLERGY;

COLUMN allergen_name FORMAT A18
COLUMN reaction FORMAT A30
COLUMN severity FORMAT A16
SELECT allergy_id, patient_id, allergen_name, reaction, severity, status 
FROM ALLERGY;

PROMPT
PROMPT ====================================================================
PROMPT 9. TABLE: PRESCRIPTION (Active Prescriptions)
PROMPT ====================================================================
DESC PRESCRIPTION;

COLUMN prescription_code FORMAT A18
COLUMN status FORMAT A12
SELECT prescription_id, patient_id, doctor_id, hospital_id, prescription_code, status 
FROM PRESCRIPTION;

PROMPT
PROMPT ====================================================================
PROMPT 10. TABLE: AUDIT_LOG (Immutable Regulatory Security Trail)
PROMPT ====================================================================
DESC AUDIT_LOG;

COLUMN event_type FORMAT A28
COLUMN target_entity FORMAT A14
COLUMN details FORMAT A45
SELECT log_id, actor_role, event_type, target_entity, details 
FROM AUDIT_LOG 
WHERE ROWNUM <= 5;

PROMPT
PROMPT ====================================================================
PROMPT 11. COMPLETE RELATIONAL INTEGRITY REPORT: ALL PK, UK, FK CONSTRAINTS
PROMPT ====================================================================
COLUMN table_name FORMAT A22
COLUMN constraint_type FORMAT A14
COLUMN constraint_name FORMAT A28
COLUMN column_names FORMAT A48
SELECT 
    c.table_name,
    CASE c.constraint_type 
        WHEN 'P' THEN 'PRIMARY KEY'
        WHEN 'U' THEN 'UNIQUE KEY'
        WHEN 'R' THEN 'FOREIGN KEY'
    END as constraint_type,
    c.constraint_name,
    (SELECT LISTAGG(cc.column_name, ', ') WITHIN GROUP (ORDER BY cc.position)
     FROM user_cons_columns cc
     WHERE cc.constraint_name = c.constraint_name) as column_names
FROM user_constraints c
WHERE c.constraint_type IN ('P', 'U', 'R')
ORDER BY c.table_name, c.constraint_type, c.constraint_name;

PROMPT ====================================================================
PROMPT INSPECTION COMPLETE! Ready for faculty review screenshots.
PROMPT ====================================================================
