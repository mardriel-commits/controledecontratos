import datetime as dt
from sqlalchemy import select
from ..models import Contract, Company, AlertsLog
from ..services.balance import saldo_atual
from .rules import pode_renovar
from .emailer import send_email

SALDO_BAIXO_PERCENTUAL = 0.10  # 10%

def build_email_html(contract, company, alert_type, dias_para_vencer=None, saldo=None):
    titulo = "Alerta de contrato"
    acao = ""

    if alert_type == "VENCIMENTO_RENOVAR":
        titulo = "Atenção: iniciar renovação contratual"
        acao = f"O contrato está a {dias_para_vencer} dias do vencimento e já exige providências para renovação."
    elif alert_type == "VENCIMENTO_LICITAR":
        titulo = "Atenção: iniciar novo processo licitatório"
        acao = f"O contrato está a {dias_para_vencer} dias do vencimento e não é renovável."
    elif alert_type == "VENCIMENTO_ADITIVO":
        titulo = "Atenção: avaliar aditivo contratual"
        acao = f"O contrato está a {dias_para_vencer} dias do vencimento. Avalie providências relacionadas a aditivo."
    elif alert_type == "SALDO_BAIXO":
        titulo = "Atenção: saldo contratual baixo"
        acao = f"O contrato está com saldo baixo. Saldo atual estimado: R$ {saldo:.2f}"
    elif alert_type == "SALDO_ZERADO":
        titulo = "Atenção: saldo contratual esgotado"
        acao = f"O contrato está com saldo esgotado. Saldo atual estimado: R$ {saldo:.2f}"

    return f"""
    <html>
      <body style="font-family: Arial, sans-serif;">
        <h2>{titulo}</h2>
        <p>{acao}</p>
        <hr />
        <p><strong>Contrato:</strong> {contract.numero_contrato}</p>
        <p><strong>Empresa:</strong> {company.razao_social}</p>
        <p><strong>CNPJ:</strong> {company.cnpj}</p>
        <p><strong>Objeto:</strong> {contract.objeto or "-"}</p>
        <p><strong>Início:</strong> {contract.data_inicio.strftime('%d/%m/%Y')}</p>
        <p><strong>Fim:</strong> {contract.data_fim.strftime('%d/%m/%Y')}</p>
        <p><strong>Status:</strong> {contract.status}</p>
        <p><strong>Renovável:</strong> {"Sim" if contract.renovavel else "Não"}</p>
        <br />
        <p>Mensagem automática do Sistema de Gestão de Contratos.</p>
      </body>
    </html>
    """

def build_recipients(contract):
    recipients = []

    if contract.gestor and contract.gestor.email:
        recipients.append(contract.gestor.email)

    if contract.fiscal and contract.fiscal.email:
        recipients.append(contract.fiscal.email)

    return list(dict.fromkeys(recipients))

def should_alert_by_deadline(contract, today):
    if not contract.data_fim:
        return None

    dias = (contract.data_fim - today).days

    if contract.renovavel and dias == 60:
        return ("VENCIMENTO_RENOVAR", dias)

    if not contract.renovavel and dias == 180:
        return ("VENCIMENTO_LICITAR", dias)

    if dias == 30:
        return ("VENCIMENTO_ADITIVO", dias)

    return None

def should_alert_by_balance(db, contract):
    saldo = saldo_atual(db, contract.id, contract.valor_inicial, contract.valor_aditivado_acumulado)
    limite_baixo = (contract.valor_inicial or 0) * SALDO_BAIXO_PERCENTUAL

    if saldo <= 0:
        return ("SALDO_ZERADO", saldo)

    if saldo <= limite_baixo:
        return ("SALDO_BAIXO", saldo)

    return None

def run_contract_alerts(db):
    today = dt.date.today()

    rows = db.execute(
        select(Contract, Company)
        .join(Company, Company.id == Contract.company_id)
    ).all()

    result = {
        "processed": 0,
        "sent": 0,
        "errors": 0,
        "logs": [],
    }

    for contract, company in rows:
        result["processed"] += 1

        alerts_to_send = []

        deadline_alert = should_alert_by_deadline(contract, today)
        if deadline_alert:
            alert_type, dias = deadline_alert
            alerts_to_send.append((alert_type, dias, None))

        balance_alert = should_alert_by_balance(db, contract)
        if balance_alert:
            alert_type, saldo = balance_alert
            alerts_to_send.append((alert_type, None, saldo))

        for alert_type, dias, saldo in alerts_to_send:
            recipients = build_recipients(contract)

            if not recipients:
                log = AlertsLog(
                    contract_id=contract.id,
                    alert_type=alert_type,
                    recipients=[],
                    status="ERROR",
                    error="Contrato sem destinatários válidos",
                    meta={"dias_para_vencer": dias, "saldo": float(saldo) if saldo is not None else None},
                )
                db.add(log)
                db.commit()
                result["errors"] += 1
                result["logs"].append({"contract_id": contract.id, "alert_type": alert_type, "status": "ERROR"})
                continue

            subject = f"[Gestão de Contratos] {alert_type} - Contrato {contract.numero_contrato}"
            html = build_email_html(contract, company, alert_type, dias_para_vencer=dias, saldo=saldo)

            try:
                send_email(recipients, subject, html)

                log = AlertsLog(
                    contract_id=contract.id,
                    alert_type=alert_type,
                    recipients=recipients,
                    status="SENT",
                    error=None,
                    meta={"dias_para_vencer": dias, "saldo": float(saldo) if saldo is not None else None},
                )
                db.add(log)
                db.commit()

                result["sent"] += 1
                result["logs"].append({"contract_id": contract.id, "alert_type": alert_type, "status": "SENT"})
            except Exception as e:
                db.rollback()
                log = AlertsLog(
                    contract_id=contract.id,
                    alert_type=alert_type,
                    recipients=recipients,
                    status="ERROR",
                    error=str(e),
                    meta={"dias_para_vencer": dias, "saldo": float(saldo) if saldo is not None else None},
                )
                db.add(log)
                db.commit()

                result["errors"] += 1
                result["logs"].append({"contract_id": contract.id, "alert_type": alert_type, "status": "ERROR", "error": str(e)})

    return result
