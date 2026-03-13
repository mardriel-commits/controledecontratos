from apscheduler.schedulers.background import BackgroundScheduler
import os
import datetime as dt
import smtplib
from email.message import EmailMessage

from sqlalchemy import select
from .db import SessionLocal
from .models import Contract, Company, AlertsLog, User
from .services.rules import pode_renovar
from .services.balance import saldo_atual

_scheduler = None

def _send_email(subject, body, to_emails):
    host = os.getenv("SMTP_HOST")
    user = os.getenv("SMTP_USER")
    pwd = os.getenv("SMTP_PASS")
    port = int(os.getenv("SMTP_PORT", "587"))
    sender = os.getenv("SMTP_FROM", user)

    if not host or not sender or not to_emails:
        return {"sent": False, "reason": "smtp_not_configured"}

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = ", ".join(to_emails)
    msg.set_content(body)

    with smtplib.SMTP(host, port) as s:
        s.starttls()
        if user and pwd:
            s.login(user, pwd)
        s.send_message(msg)

    return {"sent": True}

def run_alerts(app):
    """Roda regras de alerta e registra em alerts_log.
    Envio de e-mail só ocorre se SMTP estiver configurado.
    """
    db = SessionLocal()
    try:
        today = dt.date.today()
        rows = db.execute(select(Contract, Company).join(Company, Company.id == Contract.company_id)).all()
        created = 0

        for c, comp in rows:
            if c.status != "ATIVO":
                continue

            dias = (c.data_fim - today).days

            # Regra: renovável => 60 dias para iniciar renovação (se ainda pode)
            # não renovável OU não pode renovar => 180 dias para licitação
            if c.renovavel and dias <= 60:
                can = pode_renovar(c.data_inicio, c.data_fim)
                if can:
                    alert_type = "VENCIMENTO_RENOVAR"
                else:
                    alert_type = "VENCIMENTO_LICITAR"
            elif (not c.renovavel) and dias <= 180:
                alert_type = "VENCIMENTO_LICITAR"
            else:
                alert_type = None

            # Saldo baixo/zerado
            saldo = saldo_atual(db, c.id, c.valor_inicial, c.valor_aditivado_acumulado)
            if saldo <= 0:
                alert_type2 = "SALDO_ZERADO"
            elif c.valor_inicial and saldo <= (c.valor_inicial * 0.10):
                alert_type2 = "SALDO_BAIXO"
            else:
                alert_type2 = None

            for at in [alert_type, alert_type2]:
                if not at:
                    continue

                # evita spam: não cria duplicado do mesmo tipo no mesmo dia
                exists = db.execute(
                    select(AlertsLog)
                    .where(AlertsLog.contract_id == c.id)
                    .where(AlertsLog.alert_type == at)
                    .where(AlertsLog.created_at >= dt.datetime.combine(today, dt.time.min).replace(tzinfo=dt.timezone.utc))
                ).scalars().first()
                if exists:
                    continue

                # destinatários: gestor/fiscal se tiverem e-mail
                recipients = {}
                to_emails = []
                if c.gestor_id:
                    guser = db.execute(select(User).where(User.id == c.gestor_id)).scalars().first()
                    if guser and guser.email:
                        recipients["gestor"] = guser.email
                        to_emails.append(guser.email)
                if c.fiscal_id:
                    fuser = db.execute(select(User).where(User.id == c.fiscal_id)).scalars().first()
                    if fuser and fuser.email:
                        recipients["fiscal"] = fuser.email
                        to_emails.append(fuser.email)

                meta = {"numero_contrato": c.numero_contrato, "empresa": comp.razao_social, "dias_para_vencer": dias, "saldo": float(saldo)}

                log = AlertsLog(contract_id=c.id, alert_type=at, recipients=recipients, status="PENDING", meta=meta)
                db.add(log)
                db.flush()

                # tenta enviar
                subject = f"[Gestão Contratos] {at} - {c.numero_contrato}"
                body = f"Contrato: {c.numero_contrato}\nEmpresa: {comp.razao_social}\nDias p/ vencer: {dias}\nSaldo: {float(saldo):.2f}\nAlerta: {at}"
                try:
                    sent = _send_email(subject, body, to_emails)
                    if sent.get("sent"):
                        log.status = "SENT"
                    else:
                        log.status = "PENDING"
                        log.error = sent.get("reason")
                except Exception as e:
                    log.status = "ERROR"
                    log.error = str(e)

                created += 1

        db.commit()
        return {"ok": True, "created": created, "ran_at": dt.datetime.utcnow().isoformat()}
    finally:
        db.close()

def init_scheduler(app):
    global _scheduler
    if _scheduler:
        return
    _scheduler = BackgroundScheduler(timezone=os.getenv("TZ", "America/Maceio"))
    # roda diariamente às 08:00
    _scheduler.add_job(lambda: run_alerts(app), "cron", hour=8, minute=0)
    _scheduler.start()
