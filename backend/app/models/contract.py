from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Numeric, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..db import Base

class Contract(Base):
    __tablename__ = "contracts"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    numero_contrato = Column(String(80), unique=True, nullable=False, index=True)
    objeto = Column(String(500), nullable=True)

    data_inicio = Column(Date, nullable=False, index=True)
    data_fim = Column(Date, nullable=False, index=True)
    status = Column(String(30), nullable=False, default="ATIVO")

    renovavel = Column(Boolean, nullable=False, default=False)
    valor_inicial = Column(Numeric(14,2), nullable=False, default=0)
    valor_aditivado_acumulado = Column(Numeric(14,2), nullable=False, default=0)

    gestor_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    fiscal_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company")
    gestor = relationship("User", foreign_keys=[gestor_id])
    fiscal = relationship("User", foreign_keys=[fiscal_id])
