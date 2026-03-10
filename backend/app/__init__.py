from flask import Flask, jsonify
from flask_cors import CORS
import os

from .db import init_db
from .routes import api_bp
from .scheduler import init_scheduler

def create_app():
    app = Flask(__name__)

    # Config básica (não força SQLite em produção)
    app.config.from_mapping(
        SECRET_KEY=os.getenv("SECRET_KEY", "dev-secret"),
        ENVIRONMENT=os.getenv("ENVIRONMENT", "development"),
        SMTP_HOST=os.getenv("SMTP_HOST"),
        SMTP_PORT=int(os.getenv("SMTP_PORT", "587")),
        SMTP_USER=os.getenv("SMTP_USER"),
        SMTP_PASS=os.getenv("SMTP_PASS"),
        SMTP_FROM=os.getenv("SMTP_FROM"),
    )

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Cria tabelas (se necessário)
    init_db()

    # Rotas
    app.register_blueprint(api_bp, url_prefix="/api")

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    # Scheduler (alertas/e-mails)
    init_scheduler(app)

    return app
