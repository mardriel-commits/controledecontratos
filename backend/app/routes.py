import datetime as dt
from decimal import Decimal

from flask import Blueprint, request, jsonify, current_app, g
from sqlalchemy import select, func, case

from .db import SessionLocal
from .models import Company, Contract, SaldoMovement, AuditLog, AlertsLog
from .services.audit import log_audit
from .services.balance import saldo_atual
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


@api_bp.get("/contracts/<int:contract_id>")
@auth_required
def get_contract(contract_id: int):
    db = SessionLocal()
    try:
        row = db.execute(
            select(Contract, Company)
            .join(Company, Company.id == Contract.company_id)
            .where(Contract.id == contract_id)
        ).first()
        if not row:
            return jsonify({"error": "Contrato não encontrado"}), 404

        c, comp = row
        today = dt.date.today()
        dias = (c.data_fim - today).days
        saldo = saldo_atual(db, c.id, c.valor_inicial, c.valor_aditivado_acumulado)
        limite = data_limite_renovacao(c.data_inicio)

        gestor = None
        if c.gestor:
            gestor = {
                "id": c.gestor.id,
                "name": c.gestor.name,
                "email": c.gestor.email,
                "role": c.gestor.role,
            }

        fiscal = None
        if c.fiscal:
            fiscal = {
                "id": c.fiscal.id,
                "name": c.fiscal.name,
                "email": c.fiscal.email,
                "role": c.fiscal.role,
            }

        return jsonify({
            "id": c.id,
            "numero_contrato": c.numero_contrato,
            "objeto": c.objeto,
            "empresa": comp.razao_social,
            "cnpj": comp.cnpj,
            "data_inicio": c.data_inicio.isoformat(),
            "data_fim": c.data_fim.isoformat(),
            "dias_para_vencer": dias,
            "semaforo": semaforo_vencimento(dias),
            "status": c.status,
            "renovavel": c.renovavel,
            "pode_renovar": pode_renovar(c.data_inicio, c.data_fim) if c.renovavel else False,
            "limite_renovacao": limite.isoformat(),
            "valor_inicial": float(c.valor_inicial or 0),
            "valor_aditivado_acumulado": float(c.valor_aditivado_acumulado or 0),
            "saldo_atual": float(saldo),
            "gestor": gestor,
            "fiscal": fiscal,
            "observacoes": c.observacoes,
        })
    finally:
        db.close()


@api_bp.post("/contracts")
@auth_required
@roles_required("ADMIN")
def create_contract():
    db = SessionLocal()
    try:
        data = request.get_json(force=True) or {}

        razao_social = (data.get("razao_social") or "").strip()
        cnpj = (data.get("cnpj") or "").strip()
        cnpj_digits = "".join([ch for ch in cnpj if ch.isdigit()])

        if not razao_social:
            return jsonify({"error": "razao_social é obrigatório"}), 400
        if not cnpj_digits:
            return jsonify({"error": "cnpj é obrigatório"}), 400

        numero_contrato = (data.get("numero_contrato") or "").strip()
        objeto = (data.get("objeto") or "").strip() or None
        status = (data.get("status") or "ATIVO").strip().upper()
        renovavel = bool(data.get("renovavel", False))

        if status not in ("ATIVO", "SUSPENSO", "ENCERRADO"):
            return jsonify({"error": "status inválido"}), 400

        valor_inicial = _dec(data.get("valor_inicial"))
        if not numero_contrato:
            return jsonify({"error": "numero_contrato é obrigatório"}), 400
        if valor_inicial <= 0:
            return jsonify({"error": "valor_inicial deve ser > 0"}), 400

        try:
            data_inicio = dt.date.fromisoformat(data.get("data_inicio"))
            data_fim = dt.date.fromisoformat(data.get("data_fim"))
        except Exception:
            return jsonify({"error": "data_inicio e data_fim devem estar em YYYY-MM-DD"}), 400

        if data_fim < data_inicio:
            return jsonify({"error": "data_fim não pode ser menor que data_inicio"}), 400

        gestor_id = data.get("gestor_id")
        fiscal_id = data.get("fiscal_id")

        exists = db.execute(
            select(Contract).where(Contract.numero_contrato == numero_contrato)
        ).scalars().first()
        if exists:
            return jsonify({"error": "numero_contrato já cadastrado"}), 409

        comp = db.execute(
            select(Company).where(Company.cnpj == cnpj_digits)
        ).scalars().first()

        if not comp:
            comp = Company(razao_social=razao_social, cnpj=cnpj_digits)
            db.add(comp)
            db.flush()
        else:
            if razao_social and comp.razao_social != razao_social:
                comp.razao_social = razao_social

        c = Contract(
            company_id=comp.id,
            numero_contrato=numero_contrato,
            objeto=objeto,
            data_inicio=data_inicio,
            data_fim=data_fim,
            status=status,
            renovavel=renovavel,
            valor_inicial=valor_inicial,
            valor_aditivado_acumulado=_dec(data.get("valor_aditivado_acumulado") or 0),
            gestor_id=int(gestor_id) if gestor_id else None,
            fiscal_id=int(fiscal_id) if fiscal_id else None,
            observacoes=(data.get("observacoes") or None),
        )

        db.add(c)
        db.commit()
        db.refresh(c)

        try:
            log_audit(
                db,
                g.user_id,
                "CREATE",
                "contract",
                c.id,
                {"numero_contrato": c.numero_contrato, "cnpj": cnpj_digits},
            )
            db.commit()
        except Exception as audit_err:
            db.rollback()
            print("ERRO_AUDIT_CREATE_CONTRACT:", repr(audit_err))

        return jsonify({"id": c.id, "numero_contrato": c.numero_contrato}), 201

    except Exception as e:
        db.rollback()
        print("ERRO_CREATE_CONTRACT:", repr(e))
        return jsonify({"error": f"create_contract_failed: {str(e)}"}), 500
    finally:
        db.close()

@api_bp.patch("/contracts/<int:contract_id>")
@auth_required
@roles_required("ADMIN")
def update_contract(contract_id: int):
    db = SessionLocal()
    try:
        data = request.get_json(force=True) or {}

        c = db.execute(
            select(Contract).where(Contract.id == contract_id)
        ).scalars().first()
        if not c:
            return jsonify({"error": "Contrato não encontrado"}), 404

        comp = db.execute(
            select(Company).where(Company.id == c.company_id)
        ).scalars().first()
        if not comp:
            return jsonify({"error": "Empresa do contrato não encontrada"}), 404

        before = {
            "razao_social": comp.razao_social,
            "cnpj": comp.cnpj,
            "numero_contrato": c.numero_contrato,
            "objeto": c.objeto,
            "data_inicio": c.data_inicio.isoformat() if c.data_inicio else None,
            "data_fim": c.data_fim.isoformat() if c.data_fim else None,
            "status": c.status,
            "renovavel": c.renovavel,
            "valor_inicial": float(c.valor_inicial or 0),
            "gestor_id": c.gestor_id,
            "fiscal_id": c.fiscal_id,
            "observacoes": c.observacoes,
        }

        if "razao_social" in data and data["razao_social"] is not None:
            razao_social = str(data["razao_social"]).strip()
            if not razao_social:
                return jsonify({"error": "razao_social não pode ser vazio"}), 400
            comp.razao_social = razao_social

        if "cnpj" in data and data["cnpj"] is not None:
            cnpj = str(data["cnpj"]).strip()
            cnpj_digits = "".join([ch for ch in cnpj if ch.isdigit()])
            if not cnpj_digits:
                return jsonify({"error": "cnpj inválido"}), 400

            existing_company = db.execute(
                select(Company).where(
                    Company.cnpj == cnpj_digits,
                    Company.id != comp.id
                )
            ).scalars().first()

            if existing_company:
                return jsonify({"error": "cnpj já cadastrado para outra empresa"}), 409

            comp.cnpj = cnpj_digits

        if "numero_contrato" in data and data["numero_contrato"] is not None:
            numero_contrato = str(data["numero_contrato"]).strip()
            if not numero_contrato:
                return jsonify({"error": "numero_contrato não pode ser vazio"}), 400

            exists = db.execute(
                select(Contract).where(
                    Contract.numero_contrato == numero_contrato,
                    Contract.id != contract_id
                )
            ).scalars().first()

            if exists:
                return jsonify({"error": "numero_contrato já cadastrado"}), 409

            c.numero_contrato = numero_contrato

        if "objeto" in data:
            c.objeto = (data.get("objeto") or "").strip() or None

        if "status" in data and data["status"] is not None:
            status = str(data["status"]).strip().upper()
            if status not in ("ATIVO", "SUSPENSO", "ENCERRADO"):
                return jsonify({"error": "status inválido"}), 400
            c.status = status

        if "renovavel" in data:
            c.renovavel = bool(data["renovavel"])

        if "valor_inicial" in data and data["valor_inicial"] is not None:
            valor_inicial = _dec(data["valor_inicial"])
            if valor_inicial <= 0:
                return jsonify({"error": "valor_inicial deve ser > 0"}), 400
            c.valor_inicial = valor_inicial

        nova_data_inicio = c.data_inicio
        nova_data_fim = c.data_fim

        if "data_inicio" in data and data["data_inicio"]:
            try:
                nova_data_inicio = dt.date.fromisoformat(data["data_inicio"])
            except Exception:
                return jsonify({"error": "data_inicio inválida (use YYYY-MM-DD)"}), 400

        if "data_fim" in data and data["data_fim"]:
            try:
                nova_data_fim = dt.date.fromisoformat(data["data_fim"])
            except Exception:
                return jsonify({"error": "data_fim inválida (use YYYY-MM-DD)"}), 400

        if nova_data_fim < nova_data_inicio:
            return jsonify({"error": "data_fim não pode ser menor que data_inicio"}), 400

        c.data_inicio = nova_data_inicio
        c.data_fim = nova_data_fim

        if "gestor_id" in data:
            gestor_id = data.get("gestor_id")
            c.gestor_id = int(gestor_id) if gestor_id else None

        if "fiscal_id" in data:
            fiscal_id = data.get("fiscal_id")
            c.fiscal_id = int(fiscal_id) if fiscal_id else None

        if "observacoes" in data:
            c.observacoes = data.get("observacoes") or None

        db.commit()
        db.refresh(c)
        db.refresh(comp)

        after = {
            "razao_social": comp.razao_social,
            "cnpj": comp.cnpj,
            "numero_contrato": c.numero_contrato,
            "objeto": c.objeto,
            "data_inicio": c.data_inicio.isoformat() if c.data_inicio else None,
            "data_fim": c.data_fim.isoformat() if c.data_fim else None,
            "status": c.status,
            "renovavel": c.renovavel,
            "valor_inicial": float(c.valor_inicial or 0),
            "gestor_id": c.gestor_id,
            "fiscal_id": c.fiscal_id,
            "observacoes": c.observacoes,
        }

        log_audit(
            db,
            g.user_id,
            "UPDATE",
            "contract",
            c.id,
            {"before": before, "after": after},
        )
        db.commit()

        return jsonify({
            "id": c.id,
            "numero_contrato": c.numero_contrato,
            "message": "Contrato atualizado com sucesso",
        })
    finally:
        db.close()


@api_bp.post("/jobs/run-alerts")
@auth_required
@roles_required("ADMIN")
def run_alerts_manual():
    from .scheduler import run_alerts
    return jsonify(run_alerts(current_app))


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

        log_audit(db, g.user_id, "CREATE", "user", u.id, {"email": u.email, "role": u.role})
        db.commit()

        return jsonify({"id": u.id, "name": u.name, "email": u.email, "role": u.role, "active": u.active}), 201
    finally:
        db.close()


# Movimentações
def _can_manage_contract(user_role: str, user_id: int, contract: Contract) -> bool:
    if user_role == "ADMIN":
        return True
    if user_role in ("GESTOR", "FISCAL"):
        return (contract.gestor_id == user_id) or (contract.fiscal_id == user_id)
    return False


@api_bp.get("/contracts/<int:contract_id>/movements")
@auth_required
def list_movements(contract_id: int):
    db = SessionLocal()
    try:
        contract = db.execute(select(Contract).where(Contract.id == contract_id)).scalars().first()
        if not contract:
            return jsonify({"error": "Contrato não encontrado"}), 404

        rows = (
            db.execute(
                select(SaldoMovement)
                .where(SaldoMovement.contract_id == contract_id)
                .order_by(SaldoMovement.data_movimento.desc(), SaldoMovement.id.desc())
            )
            .scalars()
            .all()
        )

        return jsonify([
            {
                "id": m.id,
                "contract_id": m.contract_id,
                "data_movimento": m.data_movimento.isoformat(),
                "tipo": m.tipo,
                "valor": float(m.valor),
                "numero_nf": m.numero_nf,
                "descricao": m.descricao,
                "created_by": m.created_by,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "is_deleted": m.is_deleted,
                "deleted_at": m.deleted_at.isoformat() if m.deleted_at else None,
                "deleted_by": m.deleted_by,
                "delete_reason": m.delete_reason,
            }
            for m in rows
        ])
    finally:
        db.close()


@api_bp.post("/contracts/<int:contract_id>/movements")
@auth_required
def create_movement(contract_id: int):
    db = SessionLocal()
    try:
        contract = db.execute(select(Contract).where(Contract.id == contract_id)).scalars().first()
        if not contract:
            return jsonify({"error": "Contrato não encontrado"}), 404

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

        numero_nf = (data.get("numero_nf") or "").strip() if data.get("numero_nf") is not None else None
        descricao = (data.get("descricao") or "").strip() if data.get("descricao") is not None else None

        m = SaldoMovement(
            contract_id=contract_id,
            data_movimento=data_movimento,
            tipo=tipo,
            valor=valor,
            numero_nf=numero_nf,
            descricao=descricao,
            created_by=g.user_id,
        )
        db.add(m)
        db.commit()
        db.refresh(m)

        log_audit(
            db,
            g.user_id,
            "CREATE",
            "movement",
            m.id,
            {"contract_id": contract_id, "tipo": tipo, "valor": float(valor)},
        )
        db.commit()

        return jsonify({
            "id": m.id,
            "contract_id": m.contract_id,
            "data_movimento": m.data_movimento.isoformat(),
            "tipo": m.tipo,
            "valor": float(m.valor),
            "numero_nf": m.numero_nf,
            "descricao": m.descricao,
            "created_by": m.created_by,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "is_deleted": m.is_deleted,
        }), 201
    finally:
        db.close()


# =========================
# EXCLUIR MOVIMENTAÇÃO (ADMIN) - SOFT DELETE
# =========================
@api_bp.delete("/movements/<int:movement_id>")
@auth_required
@roles_required("ADMIN")
def delete_movement(movement_id: int):
    db = SessionLocal()
    try:
        data = request.get_json(silent=True) or {}
        reason = (data.get("reason") or "").strip()
        if not reason:
            return jsonify({"error": "reason é obrigatório"}), 400

        m = db.execute(select(SaldoMovement).where(SaldoMovement.id == movement_id)).scalars().first()
        if not m:
            return jsonify({"error": "Movimentação não encontrada"}), 404
        if m.is_deleted:
            return jsonify({"ok": True, "already_deleted": True}), 200

        m.is_deleted = True
        m.deleted_at = dt.datetime.now(dt.timezone.utc)
        m.deleted_by = g.user_id
        m.delete_reason = reason
        db.commit()

        log_audit(
            db,
            g.user_id,
            "DELETE",
            "movement",
            m.id,
            {"reason": reason, "contract_id": m.contract_id},
        )
        db.commit()

        return jsonify({"ok": True})
    finally:
        db.close()


# =========================
# AUDITORIA (ADMIN)
# =========================
@api_bp.get("/audit")
@auth_required
@roles_required("ADMIN")
def list_audit():
    db = SessionLocal()
    try:
        q_entity = request.args.get("entity")
        q_action = request.args.get("action")
        q_user = request.args.get("user_id")
        q_from = request.args.get("from")
        q_to = request.args.get("to")

        q_limit = request.args.get("limit", "200")
        try:
            limit = min(max(int(q_limit), 1), 1000)
        except Exception:
            limit = 200

        stmt = select(AuditLog).order_by(AuditLog.id.desc()).limit(limit)
        if q_entity:
            stmt = stmt.where(AuditLog.entity == q_entity)
        if q_action:
            stmt = stmt.where(AuditLog.action == q_action)
        if q_user:
            try:
                stmt = stmt.where(AuditLog.user_id == int(q_user))
            except Exception:
                pass
        if q_from:
            try:
                dfrom = dt.datetime.fromisoformat(q_from)
                stmt = stmt.where(AuditLog.created_at >= dfrom)
            except Exception:
                pass
        if q_to:
            try:
                dto = dt.datetime.fromisoformat(q_to)
                stmt = stmt.where(AuditLog.created_at <= dto)
            except Exception:
                pass

        rows = db.execute(stmt).scalars().all()
        return jsonify([
            {
                "id": a.id,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "user_id": a.user_id,
                "action": a.action,
                "entity": a.entity,
                "entity_id": a.entity_id,
                "changes": a.changes,
                "ip": a.ip,
            }
            for a in rows
        ])
    finally:
        db.close()


# =========================
# ALERTAS (ADMIN)
# =========================
@api_bp.get("/alerts")
@auth_required
@roles_required("ADMIN")
def list_alerts():
    db = SessionLocal()
    try:
        stmt = select(AlertsLog).order_by(AlertsLog.id.desc()).limit(500)
        rows = db.execute(stmt).scalars().all()
        return jsonify([
            {
                "id": a.id,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "contract_id": a.contract_id,
                "alert_type": a.alert_type,
                "recipients": a.recipients,
                "status": a.status,
                "error": a.error,
                "meta": a.meta,
            }
            for a in rows
        ])
    except Exception as e:
        print("ERRO_LIST_ALERTS:", repr(e))
        return jsonify([]), 200
    finally:
        db.close()


@api_bp.patch("/users/<int:user_id>")
@auth_required
@roles_required("ADMIN")
def update_user(user_id: int):
    data = request.get_json(force=True) or {}
    db = SessionLocal()
    try:
        u = db.execute(select(User).where(User.id == user_id)).scalars().first()
        if not u:
            return jsonify({"error": "Usuário não encontrado"}), 404

        before = {"name": u.name, "email": u.email, "role": u.role, "active": u.active}

        if "name" in data and data["name"] is not None:
            u.name = str(data["name"]).strip()
        if "role" in data and data["role"] is not None:
            role = str(data["role"]).strip().upper()
            if role not in ("ADMIN", "GESTOR", "FISCAL", "CONSULTA"):
                return jsonify({"error": "role inválido"}), 400
            u.role = role
        if "active" in data and data["active"] is not None:
            u.active = bool(data["active"])
        if "password" in data and data["password"]:
            u.set_password(str(data["password"]))

        db.commit()

        after = {"name": u.name, "email": u.email, "role": u.role, "active": u.active}
        log_audit(db, g.user_id, "UPDATE", "user", u.id, {"before": before, "after": after})
        db.commit()

        return jsonify({"id": u.id, "name": u.name, "email": u.email, "role": u.role, "active": u.active})
    finally:
        db.close()
