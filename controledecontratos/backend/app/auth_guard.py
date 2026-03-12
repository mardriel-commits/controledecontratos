import os
import functools
from datetime import datetime, timedelta, timezone

import jwt
from flask import request, jsonify, g

JWT_SECRET = os.getenv("JWT_SECRET", "dev-jwt-secret")
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "15"))

def _unauthorized(msg="Unauthorized"):
    return jsonify({"error": msg}), 401

def create_access_token(user_id: int, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ACCESS_TOKEN_MINUTES)).timestamp()),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])

def auth_required(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return _unauthorized("Missing Bearer token")

        token = auth.split(" ", 1)[1].strip()
        try:
            payload = decode_token(token)
            if payload.get("type") != "access":
                return _unauthorized("Invalid token type")
            g.user_id = int(payload["sub"])
            g.user_role = payload.get("role", "CONSULTA")
        except Exception:
            return _unauthorized("Invalid or expired token")

        return fn(*args, **kwargs)
    return wrapper

def roles_required(*roles):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            role = getattr(g, "user_role", None)
            if role not in roles:
                return jsonify({"error": "Forbidden"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
