import datetime as dt
from decimal import Decimal

from sqlalchemy import select

from ..models import Contract, Company, AlertsLog
from ..services.balance import saldo_atual
from .emailer import send_email

SALDO_BAIXO_PERCENTUAL = Decimal("0.10")  # 10%

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
    elif alert_type == "CONTRATO_VENCIDO":
        titulo = "Atenção: contrato vencido"
        acao = f"O contrato já está vencido há {abs(dias_para_vencer)} dias."
    else:
        acao = "Há uma pendência contratual que exige acompanhamento."

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

    if getattr(contract, "gestor", None) and contract.gestor.email:
        recipients.append(contract.gestor.email)

    if getattr(contract, "fiscal", None) and contract.fiscal.email:
        recipients.append(contract.fiscal.email)

    return list(dict.fromkeys(recipients))


def already_sent_today(db, contract_id, alert_type, today):
    start = dt.datetime.combine(today, dt.time.min)
    end = dt.datetime.combine(today, dt.time.max)

    existing = db.execute(
        select(AlertsLog)
        .where(AlertsLog.contract_id == contract_id)
        .where(AlertsLog.alert_type == alert_type)
        .where(AlertsLog.status == "SENT")
        .where(AlertsLog.created_at >= start)
        .where(AlertsLog.created_at <= end)
    ).scalars().first()

    return existing is not None


def should_alert_by_deadline(contract, today):
    alerts = []

    if not contract.data_fim:
        return alerts

    dias = (contract.data_fim - today).days

    if contract.renovavel and 0 <= dias <= 60:
        alerts.append(("VENCIMENTO_RENOVAR", dias))

    if (not contract.renovavel) and 0 <= dias <= 180:
        alerts.append(("VENCIMENTO_LICITAR", dias))

    if 0 <= dias <= 30:
        alerts.append(("VENCIMENTO_ADITIVO", dias))

    if dias < 0:
        alerts.append(("CONTRATO_VENCIDO", dias))

    return alerts


def should_alert_by_balance(db, contract):
    saldo = saldo_atual(db, contract.id, contract.valor_inicial, contract.valor_aditivado_acumulado)
    saldo = saldo if saldo is not None else Decimal("0")

    valor_inicial = contract.valor_inicial or Decimal("0")
    limite_baixo = valor_inicial * Decimal("0.10")

    if saldo <= Decimal("0"):
        return [("SALDO_ZERADO", saldo)]

    if saldo <= limite_baixo:
        return [("SALDO_BAIXO", saldo)]

    return []


def create_log(db, contract_id, alert_type, recipients, status, error=None, meta=None):
    log = AlertsLog(
        contract_id=contract_id,
        alert_type=alert_type,
        recipients=recipients,
        status=status,
        error=error,
        meta=meta or {},
    )
    db.add(log)
    db.commit()
    return log


def run_contract_alerts(db):
    today = dt.date.today()

    rows = db.execute(
        select(Contract, Company)
        .join(Company, Company.id == Contract.company_id)
    ).all()

    result = {
        "processed": 0,
        "sent": 0,
        "skipped": 0,
        "errors": 0,
        "logs": [],
    }

    for contract, company in rows:
        result["processed"] += 1

        alerts_to_send = []

        for alert_type, dias in should_alert_by_deadline(contract, today):
            alerts_to_send.append((alert_type, dias, None))

        for alert_type, saldo in should_alert_by_balance(db, contract):
            alerts_to_send.append((alert_type, None, saldo))

        for alert_type, dias, saldo in alerts_to_send:
            if already_sent_today(db, contract.id, alert_type, today):
                result["skipped"] += 1
                result["logs"].append({
                    "contract_id": contract.id,
                    "alert_type": alert_type,
                    "status": "SKIPPED_ALREADY_SENT_TODAY",
                })
                continue

            recipients = build_recipients(contract)

            if not recipients:
                create_log(
                    db,
                    contract.id,
                    alert_type,
                    [],
                    "ERROR",
                    error="Contrato sem destinatários válidos",
                    meta={"dias_para_vencer": dias, "saldo": float(saldo) if saldo is not None else None},
                )
                result["errors"] += 1
                result["logs"].append({
                    "contract_id": contract.id,
                    "alert_type": alert_type,
                    "status": "ERROR",
                    "error": "Contrato sem destinatários válidos",
                })
                continue

            subject = f"[Gestão de Contratos] {alert_type} - Contrato {contract.numero_contrato}"
            html = build_email_html(contract, company, alert_type, dias_para_vencer=dias, saldo=saldo)

            try:
                send_email(recipients, subject, html)

                create_log(
                    db,
                    contract.id,
                    alert_type,
                    recipients,
                    "SENT",
                    error=None,
                    meta={"dias_para_vencer": dias, "saldo": float(saldo) if saldo is not None else None},
                )

                result["sent"] += 1
                result["logs"].append({
                    "contract_id": contract.id,
                    "alert_type": alert_type,
                    "status": "SENT",
                })
            except Exception as e:
                db.rollback()

                create_log(
                    db,
                    contract.id,
                    alert_type,
                    recipients,
                    "ERROR",
                    error=str(e),
                    meta={"dias_para_vencer": dias, "saldo": float(saldo) if saldo is not None else None},
                )

                result["errors"] += 1
                result["logs"].append({
                    "contract_id": contract.id,
                    "alert_type": alert_type,
                    "status": "ERROR",
                    "error": str(e),
                })

    return result
