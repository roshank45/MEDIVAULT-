import sys
import os

sys.path.insert(0, os.path.abspath("backend"))
from app.core.database import query_all

tables = query_all("SELECT table_name FROM user_tables ORDER BY table_name")
print(f"{'TABLE_NAME':<26} {'PK':<5} {'UK':<5} {'FK':<5} {'PK_COLS':<20} {'UK_COLS':<30} {'FK_COLS':<30}")
print("-" * 125)

for t in tables:
    tname = t["table_name"]
    # Get PK
    pk_rows = query_all(f"""
        SELECT cc.column_name 
        FROM user_constraints c
        JOIN user_cons_columns cc ON c.constraint_name = cc.constraint_name
        WHERE c.table_name = '{tname}' AND c.constraint_type = 'P'
        ORDER BY cc.position
    """)
    pk_cols = ", ".join([r["column_name"] for r in pk_rows])

    # Get UK
    uk_rows = query_all(f"""
        SELECT c.constraint_name, cc.column_name 
        FROM user_constraints c
        JOIN user_cons_columns cc ON c.constraint_name = cc.constraint_name
        WHERE c.table_name = '{tname}' AND c.constraint_type = 'U'
        ORDER BY c.constraint_name, cc.position
    """)
    uk_dict = {}
    for r in uk_rows:
        uk_dict.setdefault(r["constraint_name"], []).append(r["column_name"])
    uk_cols = "; ".join([", ".join(cols) for cols in uk_dict.values()])

    # Get FK
    fk_rows = query_all(f"""
        SELECT c.constraint_name, cc.column_name, r_c.table_name as ref_table
        FROM user_constraints c
        JOIN user_cons_columns cc ON c.constraint_name = cc.constraint_name
        JOIN user_constraints r_c ON c.r_constraint_name = r_c.constraint_name
        WHERE c.table_name = '{tname}' AND c.constraint_type = 'R'
        ORDER BY c.constraint_name, cc.position
    """)
    fk_dict = {}
    for r in fk_rows:
        fk_dict.setdefault((r["constraint_name"], r["ref_table"]), []).append(r["column_name"])
    fk_parts = []
    for (cname, ref), cols in fk_dict.items():
        fk_parts.append(f"{', '.join(cols)}->{ref}")
    fk_cols = "; ".join(fk_parts)

    print(f"{tname:<26} {len(pk_rows):<5} {len(uk_dict):<5} {len(fk_dict):<5} {pk_cols:<20} {uk_cols:<30} {fk_cols:<30}")
