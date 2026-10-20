from typing import List, Dict, Any
from app.core.database import query_all, query_one
from app.models.schemas import SafetyCheckResponse, SafetyWarningItem, SafetyCandidateMedicine

def run_medication_safety_checks(patient_id: int, candidate_medicines: List[SafetyCandidateMedicine]) -> SafetyCheckResponse:
    """
    Evaluates:
    1. Duplicate active therapy (same generic ingredient or therapeutic class).
    2. Drug-drug interactions against active prescriptions and intra-prescription candidate items.
    3. Allergy conflicts against patient's documented active allergies.
    """
    warnings: List[SafetyWarningItem] = []
    has_critical = False

    if not candidate_medicines:
        return SafetyCheckResponse(
            patient_id=patient_id,
            has_critical_warning=False,
            warning_count=0,
            warnings=[]
        )

    # 1. Fetch patient's currently active prescriptions
    active_meds = query_all(
        "SELECT rxi.item_id, m.medicine_id, m.brand_name, m.generic_name, m.drug_class, m.allergen_group, "
        "rxi.dose_amount || ' ' || rxi.dose_unit as dosage, rxi.frequency, rxi.start_date, rxi.end_date, "
        "rx.prescription_code, h.name as hospital_name "
        "FROM PRESCRIPTION_ITEM rxi "
        "JOIN PRESCRIPTION rx ON rxi.prescription_id = rx.prescription_id "
        "JOIN MEDICINE m ON rxi.medicine_id = m.medicine_id "
        "JOIN HOSPITAL h ON rx.hospital_id = h.hospital_id "
        "WHERE rx.patient_id = ? AND rx.status = 'ACTIVE' AND rxi.status = 'ACTIVE'",
        (patient_id,)
    )

    # 2. Fetch patient's documented active allergies
    patient_allergies = query_all(
        "SELECT allergy_id, allergen_name, allergen_type, reaction, severity "
        "FROM ALLERGY WHERE patient_id = ? AND status = 'ACTIVE'",
        (patient_id,)
    )

    # 3. Resolve details for candidate medicines
    candidate_details: List[Dict[str, Any]] = []
    for cand in candidate_medicines:
        med = query_one(
            "SELECT medicine_id, brand_name, generic_name, drug_class, allergen_group FROM MEDICINE WHERE medicine_id = ?",
            (cand.medicine_id,)
        )
        if med:
            candidate_details.append(med)

    # --- FEATURE A: DUPLICATE MEDICATION / THERAPY DETECTION ---
    for cand in candidate_details:
        cand_generic = cand["generic_name"].strip().lower()
        cand_class = cand["drug_class"].strip().lower()
        cand_brand = cand["brand_name"].strip().lower()

        for active in active_meds:
            act_generic = active["generic_name"].strip().lower()
            act_class = active["drug_class"].strip().lower()
            act_brand = active["brand_name"].strip().lower()

            if cand["medicine_id"] == active["medicine_id"] or cand_generic == act_generic:
                warnings.append(SafetyWarningItem(
                    warning_type="DUPLICATE_THERAPY",
                    severity="MAJOR",
                    title=f"Duplicate Active Medication: {cand['brand_name']}",
                    message=(
                        f"Patient is already prescribed active '{active['brand_name']}' ({active['generic_name']}) "
                        f"via Rx {active['prescription_code']} at {active['hospital_name']} "
                        f"[{active['dosage']}, {active['frequency']}]. Adding '{cand['brand_name']}' "
                        f"may cause therapeutic duplication or overdose."
                    ),
                    matched_item=active['brand_name'],
                    evidence_reference="Hospital Clinical Medication Duplicate Detection Rule"
                ))
            elif cand_class == act_class:
                warnings.append(SafetyWarningItem(
                    warning_type="DUPLICATE_THERAPY",
                    severity="MODERATE",
                    title=f"Same Drug Class Prescribed: {cand['drug_class']}",
                    message=(
                        f"Candidate '{cand['brand_name']}' and active '{active['brand_name']}' "
                        f"belong to the same pharmacologic class ({cand['drug_class']}). "
                        f"Verify if combination therapy is intended."
                    ),
                    matched_item=active['brand_name'],
                    evidence_reference="Class-level Therapeutic Redundancy Screening"
                ))

    # --- FEATURE B: DRUG-DRUG INTERACTION CHECKING ---
    # Query knowledge base for interactions
    all_interactions = query_all(
        "SELECT interaction_id, drug1_name, drug2_name, severity, description, clinical_effect, evidence_level "
        "FROM DRUG_INTERACTION"
    )

    # Check candidates against active meds and intra-candidate pairs
    checked_pairs = set()
    comparison_pool = [(cand, "Candidate") for cand in candidate_details] + [(act, "Active") for act in active_meds]

    for i in range(len(comparison_pool)):
        med_a, src_a = comparison_pool[i]
        gen_a = med_a["generic_name"].strip().lower()

        for j in range(i + 1, len(comparison_pool)):
            med_b, src_b = comparison_pool[j]
            gen_b = med_b["generic_name"].strip().lower()

            # We only care if at least one is a candidate medicine
            if src_a != "Candidate" and src_b != "Candidate":
                continue

            pair_key = tuple(sorted([gen_a, gen_b]))
            if pair_key in checked_pairs:
                continue
            checked_pairs.add(pair_key)

            for interact in all_interactions:
                d1 = interact["drug1_name"].strip().lower()
                d2 = interact["drug2_name"].strip().lower()

                # Check bidirectional match (fuzzy substring or exact)
                if (d1 in gen_a and d2 in gen_b) or (d2 in gen_a and d1 in gen_b):
                    sev = interact["severity"].upper()
                    if sev in ["MAJOR", "CONTRAINDICATED"]:
                        has_critical = True

                    warnings.append(SafetyWarningItem(
                        warning_type="DRUG_INTERACTION",
                        severity="CRITICAL" if sev == "CONTRAINDICATED" else sev,
                        title=f"Drug Interaction: {med_a['brand_name']} + {med_b['brand_name']}",
                        message=(
                            f"{interact['description']} Clinical effect: {interact.get('clinical_effect', 'Adverse reaction')}. "
                            f"(Source: {interact['evidence_level']})"
                        ),
                        matched_item=f"{med_a['brand_name']} <-> {med_b['brand_name']}",
                        evidence_reference=f"MediVault Drug Interaction Knowledge Base ID #{interact['interaction_id']}"
                    ))

    # --- FEATURE C: ALLERGY CONFLICT DETECTION ---
    for cand in candidate_details:
        cand_brand = cand["brand_name"].strip().lower()
        cand_generic = cand["generic_name"].strip().lower()
        cand_group = (cand.get("allergen_group") or "").strip().lower()

        for allergy in patient_allergies:
            allergen = allergy["allergen_name"].strip().lower()
            severity = allergy["severity"].upper()

            # Check if allergy matches brand, generic, or allergen_group
            conflict = False
            if allergen in cand_brand or allergen in cand_generic:
                conflict = True
            elif cand_group and (allergen in cand_group or cand_group in allergen):
                conflict = True

            if conflict:
                has_critical = True
                warnings.append(SafetyWarningItem(
                    warning_type="ALLERGY_CONFLICT",
                    severity="CRITICAL" if severity in ["LIFE_THREATENING", "SEVERE"] else "MAJOR",
                    title=f"Allergy Conflict Detected: {allergy['allergen_name']} vs {cand['brand_name']}",
                    message=(
                        f"ALERT: Patient has a documented {severity} allergy to '{allergy['allergen_name']}' "
                        f"with recorded reaction: '{allergy['reaction']}'. Candidate medication "
                        f"'{cand['brand_name']}' ({cand['generic_name']}) conflicts with this documented allergy."
                    ),
                    matched_item=f"{cand['brand_name']} (Allergen: {allergy['allergen_name']})",
                    evidence_reference="Patient Medical Record Documented Allergy Registry"
                ))

    return SafetyCheckResponse(
        patient_id=patient_id,
        has_critical_warning=has_critical,
        warning_count=len(warnings),
        warnings=warnings
    )
