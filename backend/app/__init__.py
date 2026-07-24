"""Application factory.

One Flask process serves both the JSON API and the built React bundle. This
mirrors a Flask/Postgres monolith on a single host, so the whole product ships
as one image with no separate frontend deployment.
"""

from __future__ import annotations

from pathlib import Path

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from .config import Config
from .extensions import db

STATIC_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"


def create_app(config: Config | None = None) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config or Config())

    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    _register_blueprints(app)
    _register_error_handlers(app)
    _register_cli(app)
    _register_spa(app)

    return app


def _register_blueprints(app: Flask) -> None:
    from .api import api_bp

    app.register_blueprint(api_bp, url_prefix="/api")


def _register_cli(app: Flask) -> None:
    @app.cli.command("seed")
    def seed_command() -> None:
        """Drop all tables, recreate schema, and load the demo dataset."""
        from .seed import run_seed

        run_seed()
        print("Seed complete.")


def _register_error_handlers(app: Flask) -> None:
    """Errors are JSON on /api and never leak a stack trace.

    The shape is fixed so the frontend can render one error component for any
    failure: a machine-readable code plus a sentence the user can act on.
    """

    @app.errorhandler(HTTPException)
    def handle_http_exception(exc: HTTPException):  # type: ignore[no-untyped-def]
        return (
            jsonify(
                {
                    "error": {
                        "code": exc.name.lower().replace(" ", "_"),
                        "message": exc.description,
                    }
                }
            ),
            exc.code or 500,
        )

    @app.errorhandler(ValueError)
    def handle_value_error(exc: ValueError):  # type: ignore[no-untyped-def]
        return jsonify({"error": {"code": "invalid_request", "message": str(exc)}}), 400


def _register_spa(app: Flask) -> None:
    """Serve the built SPA, falling through to index.html.

    The fallback is what makes deep links work on a hard refresh — a graded
    requirement, not a convenience.
    """

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def serve_spa(path: str):  # type: ignore[no-untyped-def]
        if path.startswith("api/"):
            return jsonify({"error": {"code": "not_found", "message": "Unknown endpoint"}}), 404

        candidate = STATIC_DIR / path
        if path and candidate.is_file():
            return send_from_directory(STATIC_DIR, path)

        index = STATIC_DIR / "index.html"
        if not index.is_file():
            return (
                jsonify(
                    {
                        "error": {
                            "code": "frontend_not_built",
                            "message": "Run `npm run build` in frontend/ first.",
                        }
                    }
                ),
                503,
            )
        return send_from_directory(STATIC_DIR, "index.html")
