from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from ..db import Base

class ContractAction(Base):
    __tablename__ = "contract_actions"
    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False, index=True)
    tipo = Column(String(30), nullable=False)  # RENOVACAO/LICITACAO/ADITIVO_VALOR
    status = Column(String(30), nullable=False, default="PENDENTE")
    data_limite = Column(Date, nullable=True, index=True)
    responsavel_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notas = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
