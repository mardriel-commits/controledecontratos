import datetime as dt
from decimal import Decimal
from flask import Blueprint, request, jsonify, current_app
from sqlalchemy import select, func, case
from .db import SessionLocal
from .models import Company, Contract, SaldoMovement
from .services.rules import pode_renovar, data_limite_renovacao, limite_aditivo_50, semaforo_vencimento

api_bp = Blueprint('api', __name__)

def _dec(v):
    try:
        return Decimal(str(v)) if v is not None else Decimal('0')
    except Exception:
        return Decimal('0')

def saldo_atual(db, contract_id:int, valor_inicial:Decimal, valor_aditivado:Decimal):
    q = db.execute(select(
        func.coalesce(func.sum(
            case(
                (SaldoMovement.tipo=='EXECUCAO', -SaldoMovement.valor),
                (SaldoMovement.tipo=='ESTORNO', SaldoMovement.valor),
                (SaldoMovement.tipo=='AJUSTE', SaldoMovement.valor),
                else_=0
            )
        ), 0)
    ).where(SaldoMovement.contract_id==contract_id))
    mov = Decimal(str(q.scalar() or 0))
    return (valor_inicial or Decimal('0')) + (valor_aditivado or Decimal('0')) + mov

@api_bp.get('/contracts')
def list_contracts():
    db = SessionLocal()
    try:
        rows = db.execute(select(Contract, Company).join(Company, Company.id==Contract.company_id).order_by(Contract.data_fim.asc())).all()
        today = dt.date.today()
        out=[]
        for c, comp in rows:
            dias=(c.data_fim - today).days
            sem=semaforo_vencimento(dias)
            pr = pode_renovar(c.data_inicio, c.data_fim) if c.renovavel else False
            limite=data_limite_renovacao(c.data_inicio)
            saldo=saldo_atual(db, c.id, c.valor_inicial, c.valor_aditivado_acumulado)
            out.append({
                'id': c.id,
                'numero_contrato': c.numero_contrato,
                'empresa': comp.razao_social,
                'cnpj': comp.cnpj,
                'data_inicio': c.data_inicio.isoformat(),
                'data_fim': c.data_fim.isoformat(),
                'dias_para_vencer': dias,
                'semaforo': sem,
                'status': c.status,
                'renovavel': c.renovavel,
                'pode_renovar': pr,
                'limite_renovacao': limite.isoformat(),
                'saldo_atual': float(saldo),
            })
        return jsonify(out)
    finally:
        db.close()

@api_bp.post('/jobs/run-alerts')
def run_alerts_manual():
    from .scheduler import run_alerts
    return jsonify(run_alerts(current_app))
