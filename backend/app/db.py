from sqlalchemy import create_engine, text
import os

database_url = os.getenv("DATABASE_URL", "")
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+psycopg2://", 1)

engine = create_engine(database_url, pool_pre_ping=True)

SQL = """
CREATE TABLE IF NOT EXISTS alerts_log (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    contract_id INTEGER NULL REFERENCES contracts(id),
    alert_type VARCHAR(50) NOT NULL,
    recipients JSON NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    error TEXT NULL,
    meta JSON NULL
);

CREATE INDEX IF NOT EXISTS ix_alerts_log_contract_id ON alerts_log (contract_id);
"""

with engine.begin() as conn:
    conn.execute(text(SQL))

print("Tabela alerts_log criada/verificada com sucesso.")
