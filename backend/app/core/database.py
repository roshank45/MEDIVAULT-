import os
import decimal
import datetime
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Union
import pyodbc
from app.core.config import settings

def _convert_value(val: Any) -> Any:
    """Convert Oracle/ODBC specific datatypes to standard Python/JSON types."""
    if isinstance(val, decimal.Decimal):
        if val % 1 == 0:
            return int(val)
        return float(val)
    elif isinstance(val, (datetime.date, datetime.datetime)):
        return val.isoformat()
    return val

def _row_to_dict(cursor: Any, row: Any) -> Optional[Dict[str, Any]]:
    if row is None:
        return None
    cols = [col[0].lower() for col in cursor.description]
    return {cols[i]: _convert_value(row[i]) for i in range(len(cols))}

class DatabaseManager:
    """
    Manages connections to the Oracle Database.
    Supports native Oracle ODBC (Oracle in XE) and python-oracledb for multi-version compatibility.
    """
    def __init__(self):
        self.driver = settings.ORACLE_DRIVER
        self.dsn = settings.ORACLE_DSN
        self.user = settings.ORACLE_USER
        self.password = settings.ORACLE_PASSWORD

    def get_connection(self):
        try:
            # Connect via Oracle 64-bit ODBC driver
            conn_str = f"Driver={{{self.driver}}};DBQ={self.dsn};Uid={self.user};Pwd={self.password}"
            conn = pyodbc.connect(conn_str, autocommit=False)
            return conn
        except Exception as e:
            # Fallback to python-oracledb if thick mode or modern Oracle is available
            try:
                import oracledb
                return oracledb.connect(user=self.user, password=self.password, dsn=self.dsn)
            except Exception as e2:
                raise RuntimeError(f"Failed to connect to Oracle Database: {e} | Fallback error: {e2}")

@contextmanager
def get_db():
    manager = DatabaseManager()
    conn = manager.get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def query_all(sql: str, params: Optional[Union[tuple, list]] = None) -> List[Dict[str, Any]]:
    """Execute SQL query and return all rows as list of dicts."""
    with get_db() as conn:
        cursor = conn.cursor()
        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)
        if not cursor.description:
            return []
        cols = [c[0].lower() for c in cursor.description]
        rows = cursor.fetchall()
        return [{cols[i]: _convert_value(row[i]) for i in range(len(cols))} for row in rows]

def query_one(sql: str, params: Optional[Union[tuple, list]] = None) -> Optional[Dict[str, Any]]:
    """Execute SQL query and return a single row as dict, or None."""
    with get_db() as conn:
        cursor = conn.cursor()
        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)
        if not cursor.description:
            return None
        row = cursor.fetchone()
        return _row_to_dict(cursor, row)

def execute_cmd(sql: str, params: Optional[Union[tuple, list]] = None) -> int:
    """Execute INSERT/UPDATE/DELETE statement and commit."""
    with get_db() as conn:
        cursor = conn.cursor()
        if params:
            cursor.execute(sql, params)
        else:
            cursor.execute(sql)
        return cursor.rowcount
