from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from ..db import Base

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True)
    razao_social = Column(String(250), nullable=False)
    nome_fantasia = Column(String(250), nullable=True)
    cnpj = Column(String(30), unique=True, nullable=False, index=True)
    contato = Column(String(250), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
