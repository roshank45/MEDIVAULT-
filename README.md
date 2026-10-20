# MediVault — Centralized Patient Medical Records and Medication Safety System

> **Academic DBMS Project Prototype**  
> Built with Oracle Database, FastAPI (Python 3.13), Next.js 14 (React, TypeScript), and Tailwind CSS.

---

## 1. Project Overview

**MediVault** is a full-stack, normalized healthcare platform engineered to eliminate patient health record fragmentation across hospitals. When patients seek care at different medical institutions, attending doctors frequently lack knowledge of historical diagnoses, active prescriptions, and documented allergies. This information gap contributes to duplicate prescribing, adverse drug-drug interactions, and life-threatening allergic reactions.

MediVault connects participating hospitals through a centralized Oracle Database repository, featuring:
- **Unique Medical Identifier Generation**: Atomic formatting (e.g., `MV-2026-000001`) backed by Oracle sequences.
- **Multi-Hospital Longitudinal Timeline**: Chronologically organizes consultations, diagnoses, vitals, prescriptions, and lab tests across multiple healthcare facilities.
- **Medication Safety Decision Support**: Real-time screening for duplicate active therapy (generic/brand), drug-drug interactions, and documented allergy conflicts.
- **Two-Tier Emergency QR Card**: Cryptographically hashed URL-safe tokens (SHA-256) exposing minimal Level 1 emergency triage information to first responders, while protecting complete clinical history behind authenticated clinician access (Level 2).
- **Controlled Break-Glass Workflow**: Allows emergency clinicians to bypass standard consent in urgent medical scenarios with mandatory justification and high-priority audit logging.
- **Enterprise Relational Integrity**: 18 normalized 3NF Oracle tables, constraints, indexes, views, PL/SQL procedures, and database-level audit triggers.

*Disclaimer: This is an academic student project prototype using synthetic data, not a production-certified medical system.*

---

## 2. Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts (vitals trends), `qrcode.react` (SVG QR generation).
- **Backend**: Python 3.13, FastAPI, Uvicorn, Pydantic v2, PyJWT, Bcrypt, PyODBC (native 64-bit Oracle client driver) & `python-oracledb`.
- **Database**: Oracle Database (11g XE / 19c / 21c / 23ai), SQL, PL/SQL, Triggers, Views, Sequences, Cursors.

---

## 3. Project Directory Structure

```
medivault/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI REST endpoints
│   │   │   ├── admin.py     # Hospital and user management
│   │   │   ├── audit.py     # Security audit log retrieval
│   │   │   ├── auth.py      # JWT authentication and login
│   │   │   ├── emergency.py # QR token handling & break-glass access
│   │   │   ├── patients.py  # Registration, search, & longitudinal history
│   │   │   ├── prescriptions.py # Prescriptions & itemization
│   │   │   ├── safety.py    # Pre-prescribing decision support
│   │   │   ├── tests_treatments.py # Lab investigations & treatment plans
│   │   │   ├── visits.py    # Clinical encounters & diagnoses
│   │   │   └── vitals.py    # Vitals time-series & allergy registry
│   │   ├── core/
│   │   │   ├── config.py    # Environment settings
│   │   │   ├── database.py  # Unified Oracle connection manager
│   │   │   └── security.py  # Bcrypt & JWT verification
│   │   ├── models/
│   │   │   └── schemas.py   # Pydantic v2 validation models
│   │   ├── services/
│   │   │   ├── audit_service.py     # Audit logging service
│   │   │   ├── emergency_service.py # SHA-256 token hashing & triage
│   │   │   └── safety_service.py    # Drug safety screening engine
│   │   └── main.py          # FastAPI application entry point
├── database/
│   ├── 01_create_schema.sql         # 18 normalized tables, constraints, indexes
│   ├── 02_views.sql                 # Active meds, timeline, and metrics views
│   ├── 03_procedures_triggers.sql   # PL/SQL procedures, cursors, audit triggers
│   ├── 04_seed_data.sql             # 3 fictional hospitals, doctors, patients, vitals
│   ├── 05_demonstration_queries.sql # Academic DBMS evaluation queries
│   └── 06_rollback.sql              # Clean teardown script
├── frontend/
│   ├── app/
│   │   ├── admin/           # Administration and audit viewer
│   │   ├── emergency/qr/    # Public Level 1 emergency triage view
│   │   ├── login/           # Multi-role authentication page
│   │   ├── patients/        # Registration, directory search, & history profile
│   │   ├── globals.css      # Medical styling directives
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Executive dashboard & metrics
│   ├── components/          # Reusable Navbar, BreakGlassModal, etc.
│   ├── lib/
│   │   └── api.ts           # Typed API client
│   └── package.json
├── docs/
│   ├── ARCHITECTURE.md      # Detailed system architecture
│   ├── ER_DIAGRAM.md        # Mermaid ER diagram and 3NF analysis
│   ├── PROJECT_REPORT.md    # Comprehensive academic DBMS report
│   └── SCHEMA_DOCS.md       # Relational schema dictionary
├── tests/
│   └── test_backend.py      # Automated pytest test suite (15/15 passing)
├── .env.example
├── .gitignore
└── README.md
```

---

## 4. Setup and Execution Instructions

### A. Database Setup (Oracle Database)

1. Open `SQL*Plus` as SYSDBA:
   ```cmd
   sqlplus / as sysdba
   ```
2. Create the MediVault user and grant required privileges:
   ```sql
   CREATE USER medivault IDENTIFIED BY MediVault2026#;
   GRANT CONNECT, RESOURCE, DBA TO medivault;
   GRANT UNLIMITED TABLESPACE TO medivault;
   EXIT;
   ```
3. Execute the database scripts in order:
   ```cmd
   sqlplus medivault/MediVault2026#@localhost:1521/XE @database/01_create_schema.sql
   sqlplus medivault/MediVault2026#@localhost:1521/XE @database/02_views.sql
   sqlplus medivault/MediVault2026#@localhost:1521/XE @database/03_procedures_triggers.sql
   sqlplus medivault/MediVault2026#@localhost:1521/XE @database/04_seed_data.sql
   ```

### B. Backend Execution (FastAPI)

1. Navigate to the backend directory:
   ```cmd
   cd backend
   ```
2. Start the Uvicorn server:
   ```cmd
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
3. Interactive Swagger API documentation is available at: `http://127.0.0.1:8000/docs`

### C. Frontend Execution (Next.js)

1. Open a new terminal and navigate to the frontend directory:
   ```cmd
   cd frontend
   ```
2. Start the development server:
   ```cmd
   npm run dev
   ```
3. Open your browser and navigate to: `http://localhost:3000`

---

## 5. Demonstration Accounts

Development accounts are pre-seeded with securely hashed credentials:

| Role | Username | Password | Full Name | Associated Facility / Department |
| :--- | :--- | :--- | :--- | :--- |
| **Doctor** | `dr.chen` | `Doctor@123` | Dr. Marcus Chen | City General Hospital (Cardiology) |
| **Doctor** | `dr.patel` | `Doctor@123` | Dr. Priya Patel | Sunrise Medical Centre (Endocrinology) |
| **Doctor** | `dr.rodriguez`| `Doctor@123` | Dr. Mateo Rodriguez | Green Valley Hospital (Internal Med) |
| **Emergency Clinician**| `er.sarah` | `Emergency@123` | Dr. Sarah Connor | Sunrise Medical Centre (Trauma Care) |
| **System Administrator**| `admin` | `Admin@123` | Eleanor Vance | System Administration & Audit |
| **Patient** | `patient.finch`| `Patient@123` | Harold Finch | Patient Portal Access |

---

## 6. End-to-End Evaluation Scenario

To demonstrate the full multi-hospital federated workflow:

1. **Sign In as Dr. Marcus Chen (`dr.chen` / `Doctor@123`)** at **City General Hospital (CGH)**:
   - Search for patient **Harold Finch** (`MV-2026-000001`).
   - Observe previous consultation, diagnosed **Type 2 Diabetes** and **Hypertension**, and active prescriptions for **Metformin** and **Lisinopril**.
2. **Test Emergency First-Responder Triage (Level 1)**:
   - Open `/emergency/qr/demo-emergency-token-2026-finch` in your browser (simulating an emergency responder scanning Harold's QR card).
   - Observe that only minimal triage info is visible: Blood Group (`O_POSITIVE`), Emergency Contacts, and **LIFE-THREATENING Penicillin Allergy**.
   - Confirm that full clinical consultation notes and sensitive records are hidden.
3. **Sign In as Dr. Priya Patel (`dr.patel` / `Doctor@123`)** at **Sunrise Medical Centre (SMC)**:
   - Open Harold Finch's profile. Notice that Dr. Patel can view the records entered at City General Hospital.
   - Switch to the **Prescriptions & Safety** tab.
   - Test candidate medication **Amoxil (Amoxicillin)**. The system flags a **CRITICAL ALLERGY CONFLICT** because Harold has a documented Penicillin allergy.
   - Test candidate medication **Glucophage (Metformin)**. The system flags a **DUPLICATE THERAPY ALERT** because Harold is already taking Metformin from CGH.
4. **Record a New Consultation**:
   - Click **Add Consultation** at Sunrise Medical Centre and save.
   - Confirm that the new entry appears on the longitudinal timeline and is logged in the Oracle database audit trail.
5. **Review Audit Trail as Administrator (`admin` / `Admin@123`)**:
   - Navigate to `/admin/audit` to view all access events, clinical modifications, and logins captured by database triggers.

---

## 7. Automated Test Suite

Run the automated test suite using pytest:
```cmd
python -m pytest tests/test_backend.py -v
```

All 15 automated test cases verify:
- Authentication & JWT issuance
- Role-based authorization & access control
- Patient registration with sequence-generated unique IDs
- Cross-hospital longitudinal history retrieval
- Duplicate medication detection
- Drug-drug interaction warning logic
- Documented allergy conflict screening
- Emergency QR token cryptographic hashing & minimal exposure
- Clinician break-glass override & database audit logging
