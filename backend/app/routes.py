import datetime as dt
from decimal import Decimal

from flask import Blueprint, request, jsonify, current_app
from sqlalchemy import select, func, case

from .db import SessionLocal
from .models import Company, Contract, SaldoMovement
from .services.rules import (
    pode_renovar,
    data_limite_renovacao,
    limite_aditivo_50,
    semaforo_vencimento,
)

from .auth_guard import auth_required, roles_required
from .models.user import User

api_bp = Blueprint("api", __name__)

def _dec(v):
    try:
        return Decimal(str(v)) if v is not None else Decimal("0")
    except Exception:
        return Decimal("0")

def saldo_atual(db, contract_id: int, valor_inicial: Decimal, valor_aditivado: Decimal):
    q = db.execute(
        select(
            func.coalesce(
                func.sum(
                    case(
                        (SaldoMovement.tipo == "EXECUCAO", -SaldoMovement.valor),
                        (SaldoMovement.tipo == "ESTORNO", SaldoMovement.valor),
                        (SaldoMovement.tipo == "AJUSTE", SaldoMovement.valor),
                        else_=0,
                    )
                ),
                0,
            )
        ).where(SaldoMovement.contract_id == contract_id)
    )
    mov = Decimal(str(q.scalar() or 0))
    return (valor_inicial or Decimal("0")) + (valor_aditivado or Decimal("0")) + mov

# =========================
# CONTRATOS (PROTEGIDO)
# =========================
@api_bp.get("/contracts")
@auth_required
def list_contracts():
    db = SessionLocal()
    try:
        rows = (
            db.execute(
                select(Contract, Company)
                .join(Company, Company.id == Contract.company_id)
                .order_by(Contract.data_fim.asc())
            )
            .all()
        )

        today = dt.date.today()
        out = []
        for c, comp in rows:
            dias = (c.data_fim - today).days
            sem = semaforo_vencimento(dias)

            pr = pode_renovar(c.data_inicio, c.data_fim) if c.renovavel else False
            limite = data_limite_renovacao(c.data_inicio)

            saldo = saldo_atual(db, c.id, c.valor_inicial, c.valor_aditivado_acumulado)

            out.append(
                {
                    "id": c.id,
                    "numero_contrato": c.numero_contrato,
                    "empresa": comp.razao_social,
                    "cnpj": comp.cnpj,
                    "data_inicio": c.data_inicio.isoformat(),
                    "data_fim": c.data_fim.isoformat(),
                    "dias_para_vencer": dias,
                    "semaforo": sem,
                    "status": c.status,
                    "renovavel": c.renovavel,
                    "pode_renovar": pr,
                    "limite_renovacao": limite.isoformat(),
                    "saldo_atual": float(saldo),
                }
            )
        return jsonify(out)
    finally:
        db.close()

# =========================
# JOBS (ADMIN)
# =========================
@api_bp.post("/jobs/run-alerts")
@auth_required
@roles_required("ADMIN")
def run_alerts_manual():
    from .scheduler import run_alerts
    return jsonify(run_alerts(current_app))

# =========================
# USUÁRIOS (ADMIN)
# =========================
@api_bp.get("/users")
@auth_required
@roles_required("ADMIN")
def list_users():
    db = SessionLocal()
    try:
        users = db.execute(select(User).order_by(User.name.asc())).scalars().all()
        return jsonify([
            {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "active": u.active}
            for u in users
        ])
    finally:
        db.close()

@api_bp.post("/users")
@auth_required
@roles_required("ADMIN")
def create_user():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    role = (data.get("role") or "CONSULTA").strip().upper()
    password = data.get("password") or None
    active = bool(data.get("active", True))

    if not name or not email:
        return jsonify({"error": "name e email são obrigatórios"}), 400

    if role not in ("ADMIN", "GESTOR", "FISCAL", "CONSULTA"):
        return jsonify({"error": "role inválido"}), 400

    db = SessionLocal()
    try:
        exists = db.execute(select(User).where(User.email == email)).scalars().first()
        if exists:
            return jsonify({"error": "email já cadastrado"}), 409

        u = User(name=name, email=email, role=role, active=active)
        if password:
            u.set_password(password)

        db.add(u)
        db.commit()
        db.refresh(u)

        return jsonify({"id": u.id, "name": u.name, "email": u.email, "role": u.role, "active": u.active}), 201
    finally:
        db.close()
        
# =========================
# MOVIMENTAÇÕES DE SALDO (PROTEGIDO)
# =========================

def _can_manage_contract(user_role: str, user_id: int, contract: Contract) -> bool:
    """
    ADMIN: pode tudo
    GESTOR/FISCAL: somente se estiver vinculado ao contrato
    """
    if user_role == "ADMIN":
        return True
    if user_role in ("GESTOR", "FISCAL"):
        # Ajuste aqui se seus campos tiverem outro nome:
        return (getattr(contract, "gestor_id", None) == user_id) or (getattr(contract, "fiscal_id", None) == user_id)
    return False


@api_bp.get("/contracts/<int:contract_id>/movements")
@auth_required
def list_movements(contract_id: int):
    from flask import g

    db = SessionLocal()
    try:
        contract = db.execute(select(Contract).where(Contract.id == contract_id)).scalars().first()
        if not contract:
            return jsonify({"error": "Contrato não encontrado"}), 404

        # leitura permitida para todos autenticados (inclusive CONSULTA)
        rows = (
            db.execute(
                select(SaldoMovement)
                .where(SaldoMovement.contract_id == contract_id)
                .order_by(SaldoMovement.data_movimento.desc())
            )
            .scalars()
            .all()
        )

        return jsonify([
            {
                "id": m.id,
                "contract_id": m.contract_id,
                "data_movimento": m.data_movimento.isoformat() if m.data_movimento else None,
                "tipo": m.tipo,
                "valor": float(m.valor),
                "descricao": m.descricao,
                "numero_nf": getattr(m, "numero_nf", None),
                "created_at": m.created_at.isoformat() if getattr(m, "created_at", None) else None,
                "created_by": getattr(m, "created_by", None),
            }
            for m in rows
        ])
    finally:
        db.close()


@api_bp.post("/contracts/<int:contract_id>/movements")
@auth_required
def create_movement(contract_id: int):
    """
    Cria movimentação:
      - EXECUCAO: reduz saldo
      - ESTORNO: aumenta saldo
      - AJUSTE: aumenta ou reduz conforme valor (recomendação: usar valor positivo e tipo define sentido, mas aqui seguimos seu modelo atual)
    Regras:
      - ADMIN pode lançar em qualquer contrato
      - GESTOR/FISCAL apenas nos contratos em que são responsáveis
      - CONSULTA não pode lançar
    """
    from flask import g

    db = SessionLocal()
    try:
        contract = db.execute(select(Contract).where(Contract.id == contract_id)).scalars().first()
        if not contract:
            return jsonify({"error": "Contrato não encontrado"}), 404

        # Permissão de escrita
        if g.user_role == "CONSULTA":
            return jsonify({"error": "Forbidden"}), 403

        if not _can_manage_contract(g.user_role, g.user_id, contract):
            return jsonify({"error": "Forbidden"}), 403

        data = request.get_json(force=True) or {}

        tipo = (data.get("tipo") or "").strip().upper()
        if tipo not in ("EXECUCAO", "ESTORNO", "AJUSTE"):
            return jsonify({"error": "tipo inválido (EXECUCAO, ESTORNO, AJUSTE)"}), 400

        valor = _dec(data.get("valor"))
        if valor <= 0:
            return jsonify({"error": "valor deve ser > 0"}), 400

        data_mov = data.get("data_movimento")
        try:
            data_movimento = dt.date.fromisoformat(data_mov) if data_mov else dt.date.today()
        except Exception:
            return jsonify({"error": "data_movimento inválida (use YYYY-MM-DD)"}), 400

        descricao = (data.get("descricao") or "").strip()
        numero_nf = (data.get("numero_nf") or "").strip() if data.get("numero_nf") is not None else None

        # Cria registro
        m = SaldoMovement(
            contract_id=contract_id,
            data_movimento=data_movimento,
            tipo=tipo,
            valor=valor,
            descricao=descricao,
        )

        # Se existir coluna numero_nf / created_by no seu model, preenche
        if hasattr(m, "numero_nf"):
            setattr(m, "numero_nf", numero_nf)
        if hasattr(m, "created_by"):
            setattr(m, "created_by", g.user_id)

        db.add(m)
        db.commit()
        db.refresh(m)

        # Retorno
        return jsonify({
            "id": m.id,
            "contract_id": m.contract_id,
            "data_movimento": m.data_movimento.isoformat() if m.data_movimento else None,
            "tipo": m.tipo,
            "valor": float(m.valor),
            "descricao": m.descricao,
            "numero_nf": getattr(m, "numero_nf", None),
        }), 201

    finally:
        db.close()
