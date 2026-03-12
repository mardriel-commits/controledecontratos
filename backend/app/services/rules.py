import datetime as dt

CUTOFF = dt.date(2023, 11, 28)

def data_limite_renovacao(data_inicio: dt.date) -> dt.date:
    # >= cutoff: 10 anos; < cutoff: 5 anos
    years = 10 if data_inicio >= CUTOFF else 5
    try:
        return data_inicio.replace(year=data_inicio.year + years)
    except ValueError:
        # 29/02 etc
        return data_inicio + dt.timedelta(days=365*years)

def pode_renovar(data_inicio: dt.date, data_fim: dt.date) -> bool:
    limite = data_limite_renovacao(data_inicio)
    # renovação anual: próxima data fim + 1 ano não pode ultrapassar limite
    try:
        prox = data_fim.replace(year=data_fim.year + 1)
    except ValueError:
        prox = data_fim + dt.timedelta(days=365)
    return prox <= limite

def limite_aditivo_50(valor_inicial: float) -> float:
    return float(valor_inicial or 0) * 0.5

def semaforo_vencimento(dias_para_vencer: int) -> str:
    if dias_para_vencer <= 15:
        return "VERMELHO"
    if dias_para_vencer <= 30:
        return "AMARELO"
    return "VERDE"
