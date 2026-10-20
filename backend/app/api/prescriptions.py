from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from app.core.database import query_all, query_one, execute_cmd
from app.core.security import require_roles
from app.models.schemas import (
    PrescriptionCreate, PrescriptionOut, PrescriptionItemOut, MedicineOut
)
from app.services.audit_service import record_audit

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])

@router.get("/medicines", response_model=List[MedicineOut])
def get_medicine_catalog(current_user: dict = Depends(require_roles(["ADMIN", "DOCTOR", "EMERGENCY_CLINICIAN"]))):
    meds = query_all("SELECT * FROM MEDICINE ORDER BY brand_name ASC")
    return [MedicineOut(**m) for m in meds]

@router.post("", response_model=PrescriptionOut, status_code=status.HTTP_201_CREATED)
def create_prescription(
    rx_in: PrescriptionCreate,
    current_user: dict = Depends(require_roles(["DOCTOR", "EMERGENCY_CLINICIAN"]))
):
    """
    Creates a new multi-item prescription in Oracle DB.
    Enforces referential integrity with patient, visit, and hospital.
    """
    patient = query_one("SELECT patient_id, unique_patient_id FROM PATIENT WHERE patient_id = ?", (rx_in.patient_id,))
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    visit = query_one("SELECT visit_id, hospital_id FROM VISIT WHERE visit_id = ?", (rx_in.visit_id,))
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit consultation not found.")

    hospital = query_one("SELECT hospital_id, code FROM HOSPITAL WHERE hospital_id = ?", (rx_in.hospital_id,))
    hosp_code = hospital["code"] if hospital else "HOSP"

    # Fetch next prescription ID
    seq_row = query_one("SELECT PRESCRIPTION_SEQ.NEXTVAL as val FROM DUAL")
    rx_id = int(seq_row["val"])
    year_str = datetime.now().strftime("%Y")
    rx_code = f"RX-{year_str}-{hosp_code}-{str(rx_id).zfill(4)}"

    insert_rx_sql = (
        "INSERT INTO PRESCRIPTION (PRESCRIPTION_ID, PATIENT_ID, VISIT_ID, DOCTOR_ID, HOSPITAL_ID, "
        "PRESCRIPTION_CODE, STATUS, CLINICAL_NOTES, CREATED_AT, UPDATED_AT) "
        "VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, SYSTIMESTAMP, SYSTIMESTAMP)"
    )

    execute_cmd(insert_rx_sql, (
        rx_id,
        rx_in.patient_id,
        rx_in.visit_id,
        current_user["user_id"],
        rx_in.hospital_id,
        rx_code,
        rx_in.clinical_notes
    ))

    # Insert items
    for item in rx_in.items:
        item_seq = query_one("SELECT PRESCRIPTION_ITEM_SEQ.NEXTVAL as val FROM DUAL")
        item_id = int(item_seq["val"])
        insert_item_sql = (
            "INSERT INTO PRESCRIPTION_ITEM (ITEM_ID, PRESCRIPTION_ID, MEDICINE_ID, DOSE_AMOUNT, DOSE_UNIT, "
            "FREQUENCY, ROUTE, DURATION_DAYS, INSTRUCTIONS, START_DATE, END_DATE, STATUS) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TO_DATE(?, 'YYYY-MM-DD'), TO_DATE(?, 'YYYY-MM-DD'), 'ACTIVE')"
        )
        execute_cmd(insert_item_sql, (
            item_id,
            rx_id,
            item.medicine_id,
            item.dose_amount,
            item.dose_unit,
            item.frequency,
            item.route,
            item.duration_days,
            item.instructions,
            item.start_date,
            item.end_date
        ))

    # Fetch complete created prescription
    rx_data = query_one(
        "SELECT rx.*, h.name as hospital_name, doc.full_name as doctor_name "
        "FROM PRESCRIPTION rx "
        "JOIN HOSPITAL h ON rx.hospital_id = h.hospital_id "
        "JOIN APP_USER doc ON rx.doctor_id = doc.user_id "
        "WHERE rx.prescription_id = ?",
        (rx_id,)
    )

    items = query_all(
        "SELECT rxi.*, m.brand_name, m.generic_name "
        "FROM PRESCRIPTION_ITEM rxi "
        "JOIN MEDICINE m ON rxi.medicine_id = m.medicine_id "
        "WHERE rxi.prescription_id = ?",
        (rx_id,)
    )
    rx_data["items"] = [PrescriptionItemOut(**it) for it in items]

    return PrescriptionOut(**rx_data)

@router.get("/patient/{patient_id}", response_model=List[PrescriptionOut])
def get_patient_prescriptions(
    patient_id: int,
    current_user: dict = Depends(require_roles(["ADMIN", "DOCTOR", "PATIENT", "EMERGENCY_CLINICIAN"]))
):
    prescriptions = query_all(
        "SELECT rx.*, h.name as hospital_name, doc.full_name as doctor_name "
        "FROM PRESCRIPTION rx "
        "JOIN HOSPITAL h ON rx.hospital_id = h.hospital_id "
        "JOIN APP_USER doc ON rx.doctor_id = doc.user_id "
        "WHERE rx.patient_id = ? ORDER BY rx.created_at DESC",
        (patient_id,)
    )

    result = []
    for rx in prescriptions:
        items = query_all(
            "SELECT rxi.*, m.brand_name, m.generic_name "
            "FROM PRESCRIPTION_ITEM rxi "
            "JOIN MEDICINE m ON rxi.medicine_id = m.medicine_id "
            "WHERE rxi.prescription_id = ?",
            (rx["prescription_id"],)
        )
        rx["items"] = [PrescriptionItemOut(**it) for it in items]
        result.append(PrescriptionOut(**rx))

    return result

@router.patch("/{prescription_id}/discontinue")
def discontinue_prescription(
    prescription_id: int,
    reason: str = "Discontinued by clinician",
    current_user: dict = Depends(require_roles(["DOCTOR", "EMERGENCY_CLINICIAN"]))
):
    rx = query_one("SELECT prescription_id, patient_id, prescription_code FROM PRESCRIPTION WHERE prescription_id = ?", (prescription_id,))
    if not rx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found.")

    execute_cmd(
        "UPDATE PRESCRIPTION SET STATUS = 'DISCONTINUED', UPDATED_AT = SYSTIMESTAMP WHERE PRESCRIPTION_ID = ?",
        (prescription_id,)
    )
    execute_cmd(
        "UPDATE PRESCRIPTION_ITEM SET STATUS = 'DISCONTINUED' WHERE PRESCRIPTION_ID = ?",
        (prescription_id,)
    )

    record_audit(
        actor_user_id=current_user["user_id"],
        actor_role=current_user["role"],
        event_type="PRESCRIPTION_DISCONTINUED",
        target_entity="PRESCRIPTION",
        target_id=str(prescription_id),
        hospital_id=current_user.get("hospital_id"),
        patient_id=rx["patient_id"],
        details=f"Prescription {rx['prescription_code']} discontinued: {reason}",
        access_reason="MEDICATION_RECONCILIATION"
    )

    return {"message": f"Prescription {rx['prescription_code']} has been discontinued. Historical record preserved."}
