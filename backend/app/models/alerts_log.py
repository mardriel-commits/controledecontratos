from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from ..db import Base

class AlertsLog(Base):
    DROP TABLE IF EXISTS alerts_log;

    CREATE TABLE alerts_log (
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
