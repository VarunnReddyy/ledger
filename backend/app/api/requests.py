"""Request fulfillment routes."""

from __future__ import annotations

from flask import abort, jsonify, request

from ..enums import Role
from ..services import fulfillment as fulfillment_service
from ..services.fulfillment import FulfillmentAccessDenied, RequestNotOutstandingError
from . import api_bp


@api_bp.post("/requests/<request_id>/fulfill")
def fulfill_request(request_id: str):
    role_raw = request.args.get("role")
    user_id = request.args.get("user")
    if not role_raw or not user_id:
        raise ValueError("Query params role and user are required")
    try:
        role = Role(role_raw)
    except ValueError as exc:
        raise ValueError(f"Unknown role {role_raw!r}") from exc

    try:
        result = fulfillment_service.fulfill_request(
            request_id, role=role, user_id=user_id
        )
    except LookupError:
        abort(404, description=f"Request {request_id} was not found.")
    except FulfillmentAccessDenied as exc:
        abort(403, description=exc.message)
    except RequestNotOutstandingError as exc:
        abort(409, description=exc.message)

    return jsonify(result.model_dump(mode="json"))
