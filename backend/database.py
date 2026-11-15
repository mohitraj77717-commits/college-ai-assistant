import os
import sys
import sqlite3
from pathlib import Path
from contextlib import contextmanager

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from config import Config, BASE_DIR

SCHEMA_PATH = BASE_DIR / 'schema.sql'


def get_db_connection():
    """
    Establish and return a new SQLite database connection.
    Enforces SQLite foreign key constraints and configures dictionary-like row access.
    """
    conn = sqlite3.connect(Config.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    # Enforce relational integrity (foreign keys are off by default in SQLite)
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


@contextmanager
def get_db():
    """
    Context manager providing safe transaction handling.
    Automatically commits on success, and rolls back on unhandled exceptions.
    """
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """
    Initialize the SQLite database using schema.sql.
    Safe to run repeatedly because schema.sql uses CREATE TABLE IF NOT EXISTS.
    """
    if not SCHEMA_PATH.exists():
        raise FileNotFoundError(f"Schema file not found at {SCHEMA_PATH}")

    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        schema_sql = f.read()

    with get_db() as conn:
        conn.executescript(schema_sql)


def query_db(query: str, args=(), one: bool = False):
    """
    Execute a parameterized SQL query and return results as Python dictionaries.
    Guards against SQL injection by enforcing parameter binding.
    """
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute(query, args)
        rows = cur.fetchall()
        cur.close()
        results = [dict(row) for row in rows]
        return results[0] if (one and results) else (None if one else results)


def execute_db(query: str, args=()) -> int:
    """
    Execute an INSERT, UPDATE, or DELETE parameterized query within a transaction.
    Returns the lastrowid of an inserted row, or rowcount of modified rows.
    """
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(query, args)
        last_id = cur.lastrowid
        cur.close()
        return last_id


def check_database_status() -> dict:
    """
    Inspect the database and return health information, including table names and record counts.
    """
    if not os.path.exists(Config.DATABASE_PATH):
        return {
            "connected": False,
            "database_exists": False,
            "message": "Database file does not exist yet. Run init_db() to create it."
        }

    try:
        with get_db_connection() as conn:
            cur = conn.cursor()
            # Fetch all table names created by schema.sql
            cur.execute("""
                SELECT name FROM sqlite_master
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name;
            """)
            tables = [row['name'] for row in cur.fetchall()]

            table_counts = {}
            for table in tables:
                # Query count for each verified table
                cur.execute(f"SELECT COUNT(*) AS cnt FROM {table}")
                table_counts[table] = cur.fetchone()['cnt']

            return {
                "connected": True,
                "database_exists": True,
                "database_path": Config.DATABASE_NAME,
                "tables_count": len(tables),
                "tables": table_counts
            }
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }


if __name__ == '__main__':
    print(f"Initializing database at: {Config.DATABASE_PATH}")
    init_db()
    status = check_database_status()
    print("Database initialization successful!")
    print(f"Verified {status['tables_count']} tables: {list(status['tables'].keys())}")
