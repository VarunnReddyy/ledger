"""Thread routes.

Thread payloads are primarily nested under returns and documents. This module
exists so collaboration endpoints can grow without reshaping the blueprint map.
"""

from __future__ import annotations

from flask import abort, jsonify, request

from ..enums import Role
from ..schemas.threads import MessageCreateRequest
from ..services import access as access_service
from ..services import threads as threads_service
from ..services.threads import ThreadAccessDenied
from . import api_bp


def _role_scope() -> tuple[Role, str] | None:
    role_raw = request.args.get("role")
    user_id = request.args.get("user")
    if not role_raw or not user_id:
        return None
    try:
        role = Role(role_raw)
    except ValueError as exc:
        raise ValueError(f"Unknown role {role_raw!r}") from exc
    return role, user_id


@api_bp.get("/threads/<thread_id>")
def get_thread(thread_id: str):
    scope = _role_scope()
    include_internal = True
    if scope is not None:
        role, user_id = scope
        include_internal = access_service.include_internal_messages(
            role=role, user_id=user_id
        )

    thread = threads_service.get_thread(
        thread_id, include_internal=include_internal
    )
    if thread is None:
        abort(404, description=f"Thread {thread_id} was not found.")
    return jsonify(thread.model_dump(mode="json"))


@api_bp.post("/threads/<thread_id>/messages")
def post_thread_message(thread_id: str):
    scope = _role_scope()
    if scope is None:
        raise ValueError("Query params role and user are required")
    role, user_id = scope

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object with body and visibility")
    body = MessageCreateRequest.model_validate(payload)

    try:
        message = threads_service.post_message(
            thread_id, body, role=role, user_id=user_id
        )
    except LookupError:
        abort(404, description=f"Thread {thread_id} was not found.")
    except ThreadAccessDenied as exc:
        abort(403, description=exc.message)
    return jsonify(message.model_dump(mode="json")), 201
