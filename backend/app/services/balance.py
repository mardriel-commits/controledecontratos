import datetime as dt
from decimal import Decimal
from sqlalchemy import select, func, case
from ..models.saldo_movement import SaldoMovement

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
    ).where(SaldoMovement.contract_id==contract_id).where(SaldoMovement.is_deleted==False))
    mov = Decimal(str(q.scalar() or 0))
    return (valor_inicial or Decimal('0')) + (valor_aditivado or Decimal('0')) + mov
