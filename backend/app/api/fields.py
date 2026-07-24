"""Field trace, verify, and correct routes."""

from __future__ import annotations

from flask import abort, jsonify, request

from ..schemas.ai import FieldCorrectRequest
from ..services import fields as fields_service
from ..services.fields import FieldLockedError
from ..services.trace import get_field_trace
from . import api_bp


@api_bp.get("/fields/<field_id>/trace")
def field_trace(field_id: str):
    trace = get_field_trace(field_id)
    if trace is None:
        abort(404, description=f"Field {field_id} was not found.")
    return jsonify(trace.model_dump(mode="json"))


@api_bp.post("/fields/<field_id>/verify")
def verify_field(field_id: str):
    try:
        result = fields_service.verify_field(field_id)
    except LookupError:
        abort(404, description=f"Field {field_id} was not found.")
    except FieldLockedError as exc:
        abort(409, description=exc.reason)
    return jsonify(result.model_dump(mode="json"))


@api_bp.post("/fields/<field_id>/correct")
def correct_field(field_id: str):
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object with value and reason")
    body = FieldCorrectRequest.model_validate(payload)
    user_id = request.args.get("user", "usr_dana_reyes")
    try:
        result = fields_service.correct_field(field_id, body, user_id=user_id)
    except LookupError:
        abort(404, description=f"Field {field_id} was not found.")
    except FieldLockedError as exc:
        abort(409, description=exc.reason)
    return jsonify(result.model_dump(mode="json"))
