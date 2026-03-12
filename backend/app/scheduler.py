from apscheduler.schedulers.background import BackgroundScheduler
import os
import datetime as dt

_scheduler = None

def run_alerts(app):
    # Stub: aqui você pluga sua lógica real de alertas/e-mails
    return {"ok": True, "ran_at": dt.datetime.utcnow().isoformat()}

def init_scheduler(app):
    global _scheduler
    if _scheduler:
        return
    _scheduler = BackgroundScheduler(timezone=os.getenv("TZ", "America/Maceio"))
    # Exemplo: roda diariamente às 08:00
    _scheduler.add_job(lambda: run_alerts(app), "cron", hour=8, minute=0, id="daily_alerts", replace_existing=True)
    _scheduler.start()
