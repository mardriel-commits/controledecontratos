import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Base único do SQLAlchemy (os models herdam dele)
Base = declarative_base()

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
    Importa models para registrar as tabelas e cria no banco.
    """
    # Importa o pacote models para registrar todas as classes no Base.metadata
    from . import models  # noqa: F401
    Base.metadata.create_all(bind=engine)

def get_session():
    return SessionLocal()

# Alias opcional (caso alguma parte do código use esse nome)
create_tables = init_db
