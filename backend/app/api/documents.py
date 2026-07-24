"""Document and page routes."""

from __future__ import annotations

from flask import Response, abort, jsonify, request

from ..enums import DocType, DocumentStatus, Role
from ..services import access as access_service
from ..services import documents as documents_service
from . import api_bp


@api_bp.get("/documents")
def list_documents():
    q = request.args.get("q") or None
    type_raw = request.args.get("type")
    status_raw = request.args.get("status")
    year_raw = request.args.get("year")
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 50))

    doc_type = DocType(type_raw) if type_raw else None
    status = DocumentStatus(status_raw) if status_raw else None
    year = int(year_raw) if year_raw else None

    result = documents_service.list_documents(
        q=q,
        doc_type=doc_type,
        status=status,
        year=year,
        page=page,
        per_page=per_page,
    )
    return jsonify(result.model_dump(mode="json"))


@api_bp.get("/documents/<document_id>")
def get_document(document_id: str):
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

    detail = documents_service.get_document(
        document_id, include_internal=include_internal
    )
    if detail is None:
        abort(404, description=f"Document {document_id} was not found.")
    return jsonify(detail.model_dump(mode="json"))


@api_bp.get("/pages/<page_id>/html")
def get_page_html(page_id: str):
    html = documents_service.get_page_html(page_id)
    if html is None:
        abort(404, description=f"Page {page_id} was not found.")
    return Response(html, mimetype="text/html")
