-- ============================================================================
-- MediVault: Oracle SQL*Plus Interactive Session Initialization
-- Configures line sizing and displays helpful query shortcuts
-- ============================================================================

SET LINESIZE 250
SET PAGESIZE 100
SET TAB OFF
SET WRAP OFF
SET FEEDBACK ON
SET SERVEROUTPUT ON SIZE 1000000

PROMPT ================================================================================
PROMPT   ORACLE SQL*PLUS TERMINAL - MEDIVAULT HEALTHCARE DATABASE
PROMPT ================================================================================
PROMPT   Connected to : localhost:1521/XE
PROMPT   Current User : MEDIVAULT
PROMPT ================================================================================
PROMPT   USEFUL COMMANDS CHEAT-SHEET FOR FACULTY REVIEW:
PROMPT   1. List all 18 tables      : SELECT table_name FROM user_tables ORDER BY 1;
PROMPT   2. Describe table columns  : DESC PATIENT;
PROMPT   3. View sample patients    : SELECT patient_id, first_name, last_name, blood_group FROM PATIENT WHERE ROWNUM <= 5;
PROMPT   4. View system users       : SELECT username, role, full_name FROM APP_USER WHERE ROWNUM <= 5;
PROMPT   5. View audit events       : SELECT event_type, actor_role, timestamp FROM AUDIT_LOG WHERE ROWNUM <= 5;
PROMPT   6. Run full review script  : @database/inspect_tables_for_faculty.sql
PROMPT   7. Exit terminal session   : EXIT;
PROMPT ================================================================================
PROMPT

-- Column width formatting to ensure clean, readable tabular outputs in terminal
COLUMN table_name FORMAT A25
COLUMN username FORMAT A15
COLUMN full_name FORMAT A22
COLUMN role FORMAT A18
COLUMN first_name FORMAT A14
COLUMN last_name FORMAT A14
COLUMN blood_group FORMAT A12
COLUMN phone FORMAT A14
COLUMN event_type FORMAT A25
COLUMN actor_role FORMAT A18
COLUMN target_entity FORMAT A16
