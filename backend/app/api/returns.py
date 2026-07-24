"""Return routes."""

from __future__ import annotations

from flask import abort, jsonify, request

from ..enums import Role
from ..services import access as access_service
from ..services import returns as returns_service
from . import api_bp


@api_bp.get("/returns")
def list_returns():
    items = returns_service.list_returns()
    return jsonify([item.model_dump(mode="json") for item in items])


@api_bp.get("/returns/<return_id>")
def get_return(return_id: str):
    role_raw = request.args.get("role")
    user_id = request.args.get("user")
    include_internal = True
    if role_raw and user_id:
        try:
            role = Role(role_raw)
        except ValueError as exc:
            raise ValueError(f"Unknown role {role_raw!r}") from exc
        include_internal = access_service.include_internal_messages(
            role=role, user_id=user_id
        )

    detail = returns_service.get_return(
        return_id, include_internal=include_internal
    )
    if detail is None:
        abort(404, description=f"Return {return_id} was not found.")
    return jsonify(detail.model_dump(mode="json"))
