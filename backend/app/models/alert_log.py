from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from ..db import Base

class AlertLog(Base):
    __tablename__ = "alerts_log"
    id = Column(Integer, primary_key=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False, index=True)
    tipo_alerta = Column(String(60), nullable=False)
    destinatarios = Column(Text, nullable=True)
    canal = Column(String(20), nullable=False, default="EMAIL")
    status_envio = Column(String(20), nullable=False, default="OK")
    detalhe_erro = Column(Text, nullable=True)
    enviado_em = Column(DateTime(timezone=True), server_default=func.now(), index=True)
