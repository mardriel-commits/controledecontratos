from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from werkzeug.security import generate_password_hash, check_password_hash

from ..db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)

    password_hash = Column(String(255), nullable=True)

    # ADMIN / GESTOR / FISCAL / CONSULTA
    role = Column(String(30), nullable=False, default="CONSULTA")

    active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)
