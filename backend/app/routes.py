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
