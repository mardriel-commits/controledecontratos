import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

Base = declarative_base()

def get_database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        return "sqlite:///./dev.db"
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://"):
        # SQLAlchemy driver explicit
        if "postgresql+psycopg2://" not in url:
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url

DATABASE_URL = get_database_url()
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    from . import models  # noqa: F401
    Base.metadata.create_all(bind=engine)

def get_session():
    return SessionLocal()

create_tables = init_db
