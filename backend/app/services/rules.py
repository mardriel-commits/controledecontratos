import datetime as dt
from decimal import Decimal

CORTE = dt.date(2023, 11, 28)

def anos_limite(data_inicio: dt.date) -> int:
    return 10 if data_inicio >= CORTE else 5

def data_limite_renovacao(data_inicio: dt.date) -> dt.date:
    # evita problemas com 29/30/31
    day = min(data_inicio.day, 28)
    return dt.date(data_inicio.year + anos_limite(data_inicio), data_inicio.month, day)

def pode_renovar(data_inicio: dt.date, data_fim: dt.date) -> bool:
    limite = data_limite_renovacao(data_inicio)
    prox = dt.date(data_fim.year + 1, data_fim.month, min(data_fim.day, 28))
    return prox <= limite

def limite_aditivo_50(valor_inicial: Decimal) -> Decimal:
    return (valor_inicial or Decimal('0')) * Decimal('0.50')

def semaforo_vencimento(dias_para_vencer: int) -> str:
    if dias_para_vencer <= 15:
        return 'VERMELHO'
    if dias_para_vencer <= 30:
        return 'AMARELO'
    return 'VERDE'
