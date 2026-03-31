from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from ..db import Base

class AlertsLog(Base):
    __tablename__ = "alerts_log"

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=True, index=True)

    alert_type = Column(String(50), nullable=False)
    recipients = Column(JSON, nullable=True)
    status = Column(String(20), nullable=False, default="PENDING")
    error = Column(Text, nullable=True)
    meta = Column(JSON, nullable=True)
