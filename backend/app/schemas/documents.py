"""Document list and detail response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from ..enums import DocType, DocumentStatus, FieldState
from .fields import BBoxOut
from .threads import ThreadOut


class DocumentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    client_id: str
    doc_type: DocType
    title: str
    filename: str
    issuer: str | None
    tax_year: int
    page_count: int
    status: DocumentStatus
    uploaded_at: datetime | None
    uploaded_by_id: str | None


class DocumentListResponse(BaseModel):
    items: list[DocumentListItem]
    total: int
    page: int
    per_page: int


class DocumentPageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    page_no: int
    body_html: str


class DocumentProvenanceOut(BaseModel):
    """A provenance on this document, with the field that consumes it."""

    id: str
    box_label: str
    raw_value: str | None
    page_id: str
    page_no: int
    bbox: BBoxOut
    field_id: str
    field_line_ref: str
    field_label: str
    field_state: FieldState


class DocumentDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    client_id: str
    doc_type: DocType
    title: str
    filename: str
    issuer: str | None
    tax_year: int
    page_count: int
    status: DocumentStatus
    uploaded_at: datetime | None
    uploaded_by_id: str | None
    pages: list[DocumentPageOut]
    provenances: list[DocumentProvenanceOut]
    threads: list[ThreadOut]
