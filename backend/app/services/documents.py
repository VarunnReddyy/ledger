"""Document list, detail, and page HTML services."""

from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from ..enums import DocType, DocumentStatus, LinkTarget
from ..extensions import db
from ..models import Document, DocumentPage, Provenance, ReturnField
from ..schemas.common import money_str
from ..schemas.documents import (
    DocumentDetail,
    DocumentListItem,
    DocumentListResponse,
    DocumentPageOut,
    DocumentProvenanceOut,
)
from ..schemas.fields import BBoxOut
from .threads import load_threads_for_targets


def list_documents(
    *,
    q: str | None = None,
    doc_type: DocType | None = None,
    status: DocumentStatus | None = None,
    year: int | None = None,
    page: int = 1,
    per_page: int = 50,
) -> DocumentListResponse:
    if page < 1:
        raise ValueError("page must be >= 1")
    if per_page < 1 or per_page > 200:
        raise ValueError("per_page must be between 1 and 200")

    filters = []
    if q:
        pattern = f"%{q}%"
        filters.append(
            or_(
                Document.title.ilike(pattern),
                Document.issuer.ilike(pattern),
            )
        )
    if doc_type is not None:
        filters.append(Document.doc_type == doc_type)
    if status is not None:
        filters.append(Document.status == status)
    if year is not None:
        filters.append(Document.tax_year == year)

    count_stmt = select(func.count()).select_from(Document)
    if filters:
        count_stmt = count_stmt.where(*filters)
    total = int(db.session.scalar(count_stmt) or 0)

    stmt = select(Document)
    if filters:
        stmt = stmt.where(*filters)
    stmt = (
        stmt.order_by(Document.uploaded_at.desc().nullslast(), Document.id.asc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    docs = list(db.session.scalars(stmt).all())

    items = [
        DocumentListItem(
            id=doc.id,
            client_id=doc.client_id,
            doc_type=doc.doc_type,
            title=doc.title,
            filename=doc.filename,
            issuer=doc.issuer,
            tax_year=doc.tax_year,
            page_count=doc.page_count,
            status=doc.status,
            uploaded_at=doc.uploaded_at,
            uploaded_by_id=doc.uploaded_by_id,
        )
        for doc in docs
    ]
    return DocumentListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
    )


def get_document(
    document_id: str, *, include_internal: bool = True
) -> DocumentDetail | None:
    document = db.session.scalars(
        select(Document)
        .where(Document.id == document_id)
        .options(selectinload(Document.pages).selectinload(DocumentPage.provenances))
    ).first()
    if document is None:
        return None

    page_ids = [page.id for page in document.pages]
    provenances = _provenances_for_pages(page_ids)
    threads = load_threads_for_targets(
        [(LinkTarget.DOCUMENT, document_id)],
        include_internal=include_internal,
    )

    return DocumentDetail(
        id=document.id,
        client_id=document.client_id,
        doc_type=document.doc_type,
        title=document.title,
        filename=document.filename,
        issuer=document.issuer,
        tax_year=document.tax_year,
        page_count=document.page_count,
        status=document.status,
        uploaded_at=document.uploaded_at,
        uploaded_by_id=document.uploaded_by_id,
        pages=[
            DocumentPageOut(
                id=page.id,
                page_no=page.page_no,
                body_html=page.body_html,
            )
            for page in document.pages
        ],
        provenances=provenances,
        threads=threads,
    )


def get_page_html(page_id: str) -> str | None:
    page = db.session.get(DocumentPage, page_id)
    if page is None:
        return None
    return page.body_html


def _provenances_for_pages(page_ids: list[str]) -> list[DocumentProvenanceOut]:
    if not page_ids:
        return []

    rows = db.session.execute(
        select(Provenance, DocumentPage, ReturnField)
        .join(DocumentPage, Provenance.page_id == DocumentPage.id)
        .join(ReturnField, Provenance.field_id == ReturnField.id)
        .where(Provenance.page_id.in_(page_ids))
        .order_by(DocumentPage.page_no.asc(), Provenance.id.asc())
    ).all()

    return [
        DocumentProvenanceOut(
            id=provenance.id,
            box_label=provenance.box_label,
            raw_value=money_str(provenance.raw_value),
            page_id=page.id,
            page_no=page.page_no,
            bbox=BBoxOut(
                x=provenance.bbox_x,
                y=provenance.bbox_y,
                w=provenance.bbox_w,
                h=provenance.bbox_h,
            ),
            field_id=field.id,
            field_line_ref=field.line_ref,
            field_label=field.label,
            field_state=field.state,
        )
        for provenance, page, field in rows
    ]
