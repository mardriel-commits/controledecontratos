from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from ..db import Base

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True)
    razao_social = Column(String(255), nullable=False)
    nome_fantasia = Column(String(255), nullable=True)
    cnpj = Column(String(20), nullable=False, unique=True, index=True)
    contato = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
