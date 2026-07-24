"""API blueprints.

Routes are thin: parse input, call a service, serialize output. Anything longer
than about fifteen lines belongs in `app/services/`.
"""

from __future__ import annotations

from flask import Blueprint, jsonify

api_bp = Blueprint("api", __name__)


@api_bp.get("/health")
def health() -> tuple[dict[str, str], int]:
    return {"status": "ok"}, 200


# Domain route modules register themselves on `api_bp` at import time.
from . import (  # noqa: E402, F401
    clients,
    documents,
    fields,
    me,
    requests,
    returns,
    tasks,
    threads,
)
