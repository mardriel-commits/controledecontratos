from apscheduler.schedulers.background import BackgroundScheduler

from .db import SessionLocal
from .services.alerts import run_contract_alerts

scheduler = BackgroundScheduler()


def run_alerts(app):
    with app.app_context():
        db = SessionLocal()
        try:
            return run_contract_alerts(db)
        finally:
            db.close()


def init_scheduler(app):
    if scheduler.running:
        return

    scheduler.add_job(
        func=lambda: run_alerts(app),
        trigger="cron",
        hour=8,
        minute=0,
        id="daily_contract_alerts",
        replace_existing=True,
    )

    scheduler.start()
