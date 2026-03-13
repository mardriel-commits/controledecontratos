import os
import psycopg2

DDL = [
    # saldo_movements soft delete
    "ALTER TABLE saldo_movements ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE saldo_movements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;",
    "ALTER TABLE saldo_movements ADD COLUMN IF NOT EXISTS deleted_by INTEGER;",
    "ALTER TABLE saldo_movements ADD COLUMN IF NOT EXISTS delete_reason TEXT;",

    # audit_log
    """CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        user_id INTEGER NULL,
        action VARCHAR(30) NOT NULL,
        entity VARCHAR(50) NOT NULL,
        entity_id INTEGER NULL,
        changes JSONB NULL,
        ip VARCHAR(64) NULL,
        user_agent TEXT NULL
    );""",

    # alerts_log
    """CREATE TABLE IF NOT EXISTS alerts_log (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        contract_id INTEGER NULL,
        alert_type VARCHAR(50) NOT NULL,
        recipients JSONB NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        error TEXT NULL,
        meta JSONB NULL
    );""",
]

def main():
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        raise SystemExit("DATABASE_URL não definida")

    conn = psycopg2.connect(url)
    conn.autocommit = True
    with conn.cursor() as cur:
        for sql in DDL:
            cur.execute(sql)
    conn.close()
    print("OK: migração aplicada (soft delete + audit_log + alerts_log).")

if __name__ == "__main__":
    main()
