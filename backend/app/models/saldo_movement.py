from sqlalchemy import Column, Integer, Date, Numeric, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from ..db import Base

class SaldoMovement(Base):
    __tablename__ = "saldo_movements"
    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False, index=True)
    data_movimento = Column(Date, nullable=False, index=True)
    tipo = Column(String(20), nullable=False, default="EXECUCAO")  # EXECUCAO/ESTORNO/AJUSTE
    valor = Column(Numeric(14,2), nullable=False)
    numero_nf = Column(String(80), nullable=True)
    descricao = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Soft delete (exclusão lógica)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    delete_reason = Column(Text, nullable=True)

