import os
import sys
import argparse

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import query_all

CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
PURPLE = "\033[95m"
BOLD = "\033[1m"
RESET = "\033[0m"

CORE_TABLES = [
    "PATIENT",
    "APP_USER",
    "HOSPITAL",
    "VISIT",
    "DIAGNOSIS",
    "VITAL_RECORD",
    "ALLERGY",
    "PRESCRIPTION",
    "AUDIT_LOG"
]

def format_grid(headers, rows, max_col_width=32):
    """Formats a neat, aligned ASCII grid table that won't wrap messily."""
    if not rows:
        return "(Table is currently empty - 0 rows)"

    # Compute column widths
    widths = [len(str(h)) for h in headers]
    formatted_rows = []
    for r in rows:
        formatted_row = []
        for i, val in enumerate(r):
            v_str = "NULL" if val is None else str(val).strip()
            if len(v_str) > max_col_width:
                v_str = v_str[:max_col_width - 3] + "..."
            formatted_row.append(v_str)
            if len(v_str) > widths[i]:
                widths[i] = len(v_str)
        formatted_rows.append(formatted_row)

    # Build separator
    sep = "+" + "+".join(["-" * (w + 2) for w in widths]) + "+"
    header_line = "| " + " | ".join([f"{str(h):<{widths[i]}}" for i, h in enumerate(headers)]) + " |"

    lines = [sep, header_line, sep]
    for row in formatted_rows:
        row_line = "| " + " | ".join([f"{str(row[i]):<{widths[i]}}" for i in range(len(headers))]) + " |"
        lines.append(row_line)
    lines.append(sep)
    return "\n".join(lines)

def inspect_table(table_name, max_rows=10):
    table_name = table_name.strip().upper()
    print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
    print(f"{BOLD}{GREEN}  ORACLE DATABASE TABLE: {table_name}{RESET}")
    print(f"{BOLD}{CYAN}{'='*80}{RESET}\n")

    # 1. Structure Query (DESCRIBE equivalent from data dictionary)
    struct_sql = """
        SELECT 
            c.column_name,
            c.data_type || 
                CASE 
                    WHEN c.data_type IN ('VARCHAR2', 'CHAR') THEN '(' || c.data_length || ')'
                    WHEN c.data_type = 'NUMBER' AND c.data_precision IS NOT NULL THEN '(' || c.data_precision || NVL2(c.data_scale, ',' || c.data_scale, '') || ')'
                    ELSE ''
                END as data_type,
            CASE WHEN c.nullable = 'N' THEN 'NOT NULL' ELSE 'NULLABLE' END as nullability,
            NVL((
                SELECT 'PRIMARY KEY'
                FROM user_constraints cons
                JOIN user_cons_columns cc ON cons.constraint_name = cc.constraint_name
                WHERE cons.constraint_type = 'P'
                  AND cc.table_name = c.table_name
                  AND cc.column_name = c.column_name
                  AND ROWNUM = 1
            ), 
            NVL((
                SELECT 'UNIQUE KEY'
                FROM user_constraints cons
                JOIN user_cons_columns cc ON cons.constraint_name = cc.constraint_name
                WHERE cons.constraint_type = 'U'
                  AND cc.table_name = c.table_name
                  AND cc.column_name = c.column_name
                  AND ROWNUM = 1
            ),
            NVL((
                SELECT 'FOREIGN KEY'
                FROM user_constraints cons
                JOIN user_cons_columns cc ON cons.constraint_name = cc.constraint_name
                WHERE cons.constraint_type = 'R'
                  AND cc.table_name = c.table_name
                  AND cc.column_name = c.column_name
                  AND ROWNUM = 1
            ), ''))) as constraint_type
        FROM user_tab_columns c
        WHERE c.table_name = ?
        ORDER BY c.column_id
    """
    cols = query_all(struct_sql, (table_name,))
    if not cols:
        print(f"{YELLOW}Warning: Table '{table_name}' was not found in schema.{RESET}")
        return

    print(f"{BOLD}[1] TABLE STRUCTURE (DESCRIBE {table_name}):{RESET}")
    struct_headers = ["COLUMN_NAME", "DATA_TYPE", "NULLABLE", "CONSTRAINT"]
    struct_rows = [
        [c["column_name"], c["data_type"], c["nullability"], c["constraint_type"]]
        for c in cols
    ]
    print(format_grid(struct_headers, struct_rows, max_col_width=30))

    # 2. Contents Query (SELECT * FROM table_name)
    print(f"\n{BOLD}[2] TABLE CONTENTS (SELECT * FROM {table_name}):{RESET}")
    content_sql = f"SELECT * FROM {table_name} WHERE ROWNUM <= {max_rows}"
    data_rows = query_all(content_sql)
    if data_rows:
        content_headers = list(data_rows[0].keys())
        content_vals = [[r[h] for h in content_headers] for r in data_rows]
        print(format_grid(content_headers, content_vals, max_col_width=24))
        print(f"Total shown: {len(data_rows)} rows (Oracle ROWNUM <= {max_rows})\n")
    else:
        print(f"(Table {table_name} contains 0 rows)\n")

def list_all_tables():
    print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
    print(f"{BOLD}{GREEN}  ALL 18 TABLES IN MEDIVAULT ORACLE DATABASE SCHEMA{RESET}")
    print(f"{BOLD}{CYAN}{'='*80}{RESET}\n")

    tables = query_all("SELECT table_name FROM user_tables ORDER BY table_name")
    rows = []
    for idx, t in enumerate(tables, start=1):
        t_name = t["table_name"]
        cnt_row = query_all(f"SELECT COUNT(*) as cnt FROM {t_name}")
        cnt = cnt_row[0]["cnt"] if cnt_row else 0
        rows.append([idx, t_name, f"{cnt} rows"])

    print(format_grid(["#", "TABLE_NAME", "CURRENT_ROW_COUNT"], rows))
    print("\nTip: Run 'python scripts/view_oracle_tables.py --table <TABLE_NAME>' to view structure and rows.")
    print("Example: python scripts/view_oracle_tables.py --table PATIENT\n")

def main():
    parser = argparse.ArgumentParser(description="Oracle Table Structure and Content Viewer for Faculty Review")
    parser.add_argument("--table", type=str, help="Name of specific table to inspect (e.g. PATIENT, APP_USER, VISIT)")
    parser.add_argument("--list", action="store_true", help="List all 18 tables with row counts")
    parser.add_argument("--core", action="store_true", help="Inspect all 9 core clinical tables in sequence")
    parser.add_argument("--limit", type=int, default=8, help="Max rows of data to display per table (default: 8)")
    args = parser.parse_args()

    if args.table:
        inspect_table(args.table, max_rows=args.limit)
    elif args.core:
        for t in CORE_TABLES:
            inspect_table(t, max_rows=args.limit)
    else:
        list_all_tables()

if __name__ == "__main__":
    main()
