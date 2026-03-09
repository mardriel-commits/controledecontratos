import datetime as dt
import json
from sqlalchemy import select
from .db import SessionLocal
from .models import Contract, Company, User, AlertLog
from .services.rules import pode_renovar, data_limite_renovacao
from .services.email_service import send_email

def _already_sent_today(db, contract_id:int, tipo_alerta:str):
    since = dt.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    q = db.execute(select(AlertLog).where(AlertLog.contract_id==contract_id, AlertLog.tipo_alerta==tipo_alerta, AlertLog.enviado_em>=since)).first()
    return q is not None

def run_alerts(app):
    db=SessionLocal()
    today=dt.date.today()
    checked=0
    created=0
    try:
        rows=db.execute(select(Contract, Company, User, User)
            .join(Company, Company.id==Contract.company_id)
            .outerjoin(User, User.id==Contract.gestor_id)
            .outerjoin(User, User.id==Contract.fiscal_id)
        ).all()
        for c, comp, gestor, fiscal in rows:
            if c.status!='ATIVO':
                continue
            checked += 1
            dias = (c.data_fim - today).days
            to_list=[]
            if gestor and gestor.email: to_list.append(gestor.email)
            if fiscal and fiscal.email and fiscal.email not in to_list: to_list.append(fiscal.email)

            if c.renovavel and dias <= 60:
                pr = pode_renovar(c.data_inicio, c.data_fim)
                tipo = 'VENCIMENTO_RENOVAR' if pr else 'VENCIMENTO_LICITAR'
                if not _already_sent_today(db, c.id, tipo):
                    subject=f"[Gestão de Contratos] {c.numero_contrato} vence em {dias} dia(s)"
                    limite=data_limite_renovacao(c.data_inicio)
                    body=f"""Contrato: {c.numero_contrato}
Fornecedor: {comp.razao_social} ({comp.cnpj})
Vencimento: {c.data_fim.strftime('%d/%m/%Y')} (faltam {dias} dia(s))
Renovável: SIM
Pode renovar: {'SIM' if pr else 'NÃO'}
Limite de renovação (regra 10/5 anos): {limite.strftime('%d/%m/%Y')}

Próximo passo: {'INICIAR RENOVAÇÃO' if pr else 'INICIAR PROCESSO LICITATÓRIO'}
"""
                    r=send_email(app, to_list, subject, body)
                    db.add(AlertLog(contract_id=c.id, tipo_alerta=tipo, destinatarios=json.dumps(to_list), status_envio='OK' if r.get('sent') else 'NOOP', detalhe_erro=r.get('reason')))
                    db.commit()
                    created += 1

            if (not c.renovavel) and dias <= 180:
                tipo='VENCIMENTO_LICITAR'
                if not _already_sent_today(db, c.id, tipo):
                    subject=f"[Gestão de Contratos] {c.numero_contrato} vence em {dias} dia(s) - Licitação"
                    body=f"""Contrato: {c.numero_contrato}
Fornecedor: {comp.razao_social} ({comp.cnpj})
Vencimento: {c.data_fim.strftime('%d/%m/%Y')} (faltam {dias} dia(s))
Renovável: NÃO

Próximo passo: INICIAR PROCESSO LICITATÓRIO (aviso 180 dias).
"""
                    r=send_email(app, to_list, subject, body)
                    db.add(AlertLog(contract_id=c.id, tipo_alerta=tipo, destinatarios=json.dumps(to_list), status_envio='OK' if r.get('sent') else 'NOOP', detalhe_erro=r.get('reason')))
                    db.commit()
                    created += 1

        return {'checked': checked, 'alerts_created': created}
    finally:
        db.close()

def init_scheduler(app):
    from apscheduler.schedulers.background import BackgroundScheduler
    if app.config.get('ENVIRONMENT') != 'production':
        return
    sched=BackgroundScheduler(timezone='America/Maceio')
    sched.add_job(lambda: run_alerts(app), 'cron', hour=8, minute=0)
    sched.start()
