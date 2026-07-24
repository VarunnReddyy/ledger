"""Firm overview routes."""

from __future__ import annotations

from flask import abort, jsonify, request

from ..enums import Role
from ..services import firm as firm_service
from ..services.firm import FirmAccessDenied
from . import api_bp


@api_bp.get("/firm/overview")
def firm_overview():
    role_raw = request.args.get("role")
    user_id = request.args.get("user")
    if not role_raw or not user_id:
        raise ValueError("Query params role and user are required")
    try:
        role = Role(role_raw)
    except ValueError as exc:
        raise ValueError(f"Unknown role {role_raw!r}") from exc

    try:
        overview = firm_service.get_overview(role=role, user_id=user_id)
    except FirmAccessDenied as exc:
        abort(403, description=exc.message)
    return jsonify(overview.model_dump(mode="json"))
