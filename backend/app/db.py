import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

def get_database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        # fallback local (só dev)
        return "sqlite:///./dev.db"

    # Render às vezes fornece postgres://, SQLAlchemy prefere postgresql+psycopg2://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)

    return url

DATABASE_URL = get_database_url()
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """
    Cria as tabelas no banco com base nos models (SQLAlchemy Base).
    """
    # Ajuste este import conforme o local onde seu Base está definido
    from .models import Base
    Base.metadata.create_all(bind=engine)

def get_session():
    """
    Helper opcional: cria uma sessão nova.
    Use: db = get_session()
    """
    return SessionLocal()
