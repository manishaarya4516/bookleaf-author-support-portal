import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify

from app.models import db

load_dotenv()


def create_app(test_config=None):
    app = Flask(__name__)

    default_database = (
        "sqlite:///" + str(Path(__file__).resolve().parents[1] / "bookleaf.db")
    )

    database_url = os.getenv("DATABASE_URL", default_database)

    if database_url.startswith("postgres://"):
        database_url = database_url.replace(
            "postgres://", "postgresql+psycopg://", 1
        )
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace(
            "postgresql://", "postgresql+psycopg://", 1
        )

    secret_key = os.getenv("SECRET_KEY", "development-only-change-me")

    if os.getenv("RENDER") and (
        secret_key == "development-only-change-me"
        or database_url.startswith("sqlite:")
    ):
        raise RuntimeError(
            "Production requires SECRET_KEY and a PostgreSQL DATABASE_URL"
        )

    app.config.update(
        SECRET_KEY=secret_key,
        SQLALCHEMY_DATABASE_URI=database_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JSON_SORT_KEYS=False,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SECURE=bool(os.getenv("RENDER")),
        SESSION_COOKIE_SAMESITE="Lax",
    )

    if test_config:
        app.config.update(test_config)

    db.init_app(app)

    from app.routes.auth import auth_bp
    from app.routes.api import api_bp
    from app.routes.ai import ai_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(ai_bp)

    @app.get("/api/health")
    def health():
        return jsonify({
            "status": "ok",
            "application": "BookLeaf Author Support Portal",
        })
        
        from flask import send_from_directory

    frontend_dist = (
        Path(__file__).resolve().parents[2]
        / "frontend"
        / "dist"
    )

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        if path.startswith("api/"):
            return jsonify(error="API endpoint not found"), 404

        requested_file = frontend_dist / path

        if path and requested_file.is_file():
            return send_from_directory(frontend_dist, path)

        if not (frontend_dist / "index.html").exists():
            return jsonify(error="Frontend build not found"), 404

        return send_from_directory(frontend_dist, "index.html")
    

    with app.app_context():
        db.create_all()

    return app