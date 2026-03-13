from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from ..db import Base

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    action = Column(String(30), nullable=False)  # CREATE/UPDATE/DELETE/LOGIN/LOGOUT/IMPORT
    entity = Column(String(50), nullable=False)  # contract/movement/user/alert
    entity_id = Column(Integer, nullable=True, index=True)

    changes = Column(JSON, nullable=True)  # {"before":..., "after":...} ou {"reason":...}
    ip = Column(String(64), nullable=True)
    user_agent = Column(Text, nullable=True)
