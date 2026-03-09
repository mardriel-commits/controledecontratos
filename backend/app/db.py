from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session, declarative_base

Base = declarative_base()
SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False))
engine = None

def init_db(app):
    global engine
    db_url = app.config["DATABASE_URL"]
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    engine = create_engine(db_url, pool_pre_ping=True)
    SessionLocal.configure(bind=engine)
    from . import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
