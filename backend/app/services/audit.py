from flask import request
from ..models.audit_log import AuditLog

def log_audit(db, user_id, action, entity, entity_id=None, changes=None):
    try:
        ip = request.headers.get("X-Forwarded-For", request.remote_addr)
        ua = request.headers.get("User-Agent")
    except Exception:
        ip = None
        ua = None

    a = AuditLog(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        changes=changes,
        ip=ip,
        user_agent=ua,
    )
    db.add(a)
