"""Task routes."""

from __future__ import annotations

from flask import jsonify, request

from ..enums import Role
from ..services import tasks as tasks_service
from . import api_bp


@api_bp.get("/tasks")
def list_tasks():
    role_raw = request.args.get("role")
    user_id = request.args.get("user")
    if not role_raw or not user_id:
        raise ValueError("Query params role and user are required")
    try:
        role = Role(role_raw)
    except ValueError as exc:
        raise ValueError(f"Unknown role {role_raw!r}") from exc

    items = tasks_service.list_tasks(role=role, user_id=user_id)
    return jsonify([item.model_dump(mode="json") for item in items])
