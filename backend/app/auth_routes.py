import os
from datetime import datetime, timedelta, timezone

import jwt
from flask import Blueprint, request, jsonify, make_response, g

from .auth_guard import create_access_token, decode_token, auth_required, JWT_SECRET
from .db import SessionLocal
from .models.user import User

auth_bp = Blueprint("auth_bp", __name__)

REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", "7"))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true").lower() == "true"


def _create_refresh_token(user_id: int, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=REFRESH_TOKEN_DAYS)).timestamp()),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


@auth_bp.post("/login")
def login():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email e senha são obrigatórios"}), 400

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email, User.active == True).first()
        if not user or not user.check_password(password):
            return jsonify({"error": "Credenciais inválidas"}), 401

        access_token = create_access_token(user.id, user.role)
        refresh_token = _create_refresh_token(user.id, user.role)

        resp = make_response(jsonify({
            "access_token": access_token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role
            }
        }))
        resp.set_cookie(
            "refresh_token",
            refresh_token,
            httponly=True,
            secure=COOKIE_SECURE,
            samesite="Lax",
            max_age=REFRESH_TOKEN_DAYS * 24 * 3600,
            path="/",
        )
        return resp
    finally:
        db.close()


@auth_bp.post("/refresh")
def refresh():
    rt = request.cookies.get("refresh_token")
    if not rt:
        return jsonify({"error": "Missing refresh token"}), 401
    try:
        payload = decode_token(rt)
        if payload.get("type") != "refresh":
            return jsonify({"error": "Invalid refresh token"}), 401
        user_id = int(payload["sub"])
        role = payload.get("role", "CONSULTA")
        access_token = create_access_token(user_id, role)
        return jsonify({"access_token": access_token})
    except Exception:
        return jsonify({"error": "Invalid or expired refresh token"}), 401


@auth_bp.post("/logout")
def logout():
    resp = make_response(jsonify({"ok": True}))
    resp.set_cookie("refresh_token", "", expires=0, path="/")
    return resp


@auth_bp.get("/me")
@auth_required
def me():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == g.user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        })
    finally:
        db.close()
