"""Identity / role-switcher routes."""

from __future__ import annotations

from flask import jsonify, request

from ..services import me as me_service
from . import api_bp


@api_bp.get("/me")
def get_me():
    role_context = request.args.get("role_context") or None
    result = me_service.get_me(role_context=role_context)
    return jsonify(result.model_dump(mode="json"))
