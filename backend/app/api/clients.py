"""Client routes."""

from __future__ import annotations

from flask import jsonify

from ..services import clients as clients_service
from . import api_bp


@api_bp.get("/clients")
def list_clients():
    items = clients_service.list_clients()
    return jsonify([item.model_dump(mode="json") for item in items])
