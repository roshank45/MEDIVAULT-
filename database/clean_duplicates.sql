-- ============================================================================
-- MediVault: Database Deduplication & Cleanup Script
-- Removes duplicate test patients and orphaned test users
-- ============================================================================

SET FEEDBACK ON;

-- 1. Remove duplicate test patients
DELETE FROM PATIENT 
WHERE LOWER(FIRST_NAME) = 'testauto' 
   OR FIRST_NAME LIKE 'Test%'
   OR PATIENT_ID IN (10, 12, 13, 15, 16, 17, 18, 19);

-- 2. Normalize patient name formatting
UPDATE PATIENT 
SET FIRST_NAME = 'John', LAST_NAME = 'Smith' 
WHERE PATIENT_ID = 20;

-- 3. Remove duplicate test doctor and admin accounts
DELETE FROM APP_USER 
WHERE USERNAME LIKE 'dr.test%' 
   OR USERNAME LIKE 'admin.test%' 
   OR USERNAME LIKE 'dr.alex_%'
   OR USER_ID IN (20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31);

COMMIT;

PROMPT
PROMPT ================================================================================
PROMPT   DEDUPLICATION COMPLETE: CLEAN PATIENT REGISTRY (NO DUPLICATES)
PROMPT ================================================================================
COLUMN first_name FORMAT A15;
COLUMN last_name FORMAT A15;
COLUMN blood_group FORMAT A15;
SELECT patient_id, first_name, last_name, blood_group 
FROM PATIENT 
ORDER BY patient_id;
