from flask import Flask, jsonify
from flask_cors import CORS
import os

from .db import init_db
from .routes import api_bp
from .auth_routes import auth_bp
from .scheduler import init_scheduler

def create_app():
    app = Flask(__name__)

    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    app.config["JWT_SECRET"] = os.getenv("JWT_SECRET", "dev-jwt-secret")
    app.config["ENVIRONMENT"] = os.getenv("ENVIRONMENT", "development")

    app.config["SMTP_HOST"] = os.getenv("SMTP_HOST")
    app.config["SMTP_PORT"] = os.getenv("SMTP_PORT", "587")
    app.config["SMTP_USER"] = os.getenv("SMTP_USER")
    app.config["SMTP_PASS"] = os.getenv("SMTP_PASS")
    app.config["SMTP_FROM"] = os.getenv("SMTP_FROM")

    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
    )

    init_db()
    app.register_blueprint(api_bp, url_prefix="/api")
    init_scheduler(app)

    return app
