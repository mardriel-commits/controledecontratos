from flask import Flask, jsonify
from flask_cors import CORS
from .db import create_tables as init_db
from .routes import api_bp
from .scheduler import init_scheduler

def create_app():
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY=(app.config.get("SECRET_KEY") or "dev-secret"),
        DATABASE_URL=(app.config.get("DATABASE_URL") or "sqlite:///instance/app.db"),
        ENVIRONMENT=(app.config.get("ENVIRONMENT") or "development"),
        SMTP_HOST=app.config.get("SMTP_HOST"),
        SMTP_PORT=int(app.config.get("SMTP_PORT") or 587),
        SMTP_USER=app.config.get("SMTP_USER"),
        SMTP_PASS=app.config.get("SMTP_PASS"),
        SMTP_FROM=app.config.get("SMTP_FROM"),
    )
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    init_db(app)
    app.register_blueprint(api_bp, url_prefix="/api")

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    init_scheduler(app)
    return app
