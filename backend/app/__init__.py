from flask import Flask, jsonify
from flask_cors import CORS
import os

from .db import init_db
from .routes import api_bp
from .auth_routes import auth_bp
from .scheduler import init_scheduler

def create_app():
    app = Flask(__name__)

    # Config básica
    app.config.from_mapping(
        SECRET_KEY=os.getenv("SECRET_KEY", "dev-secret"),
        ENVIRONMENT=os.getenv("ENVIRONMENT", "development"),
        SMTP_HOST=os.getenv("SMTP_HOST"),
        SMTP_PORT=int(os.getenv("SMTP_PORT", "587")),
        SMTP_USER=os.getenv("SMTP_USER"),
        SMTP_PASS=os.getenv("SMTP_PASS"),
        SMTP_FROM=os.getenv("SMTP_FROM"),
    )

    # CORS (em produção, configure CORS_ORIGINS com a URL do frontend)
    cors_origins = os.getenv("CORS_ORIGINS", "*")
    origins = [o.strip() for o in cors_origins.split(",")] if cors_origins != "*" else "*"
    CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=True)

    # Cria tabelas (se necessário)
    init_db()

    # Rotas
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(api_bp, url_prefix="/api")

    @app.get("/")
    def home():
        return jsonify({"service": "sebrae-contratos-api", "status": "online"})

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    # Scheduler (alertas/e-mails)
    init_scheduler(app)

    return app
