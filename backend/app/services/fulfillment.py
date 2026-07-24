"""Client request fulfillment — simulated document upload."""

from __future__ import annotations

import re
from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from ..enums import (
    DocType,
    DocumentStatus,
    LinkTarget,
    RequestStatus,
    ReturnStatus,
    Role,
    TaskStatus,
)
from ..extensions import db
from ..models import (
    Document,
    DocumentPage,
    Membership,
    Request,
    ReturnField,
    ReturnSection,
    Task,
    TaxReturn,
    Thread,
    ThreadLink,
)
from ..schemas.documents import DocumentListItem
from ..schemas.fulfillment import FulfillmentResult
from ..schemas.threads import RequestOut


class FulfillmentAccessDenied(Exception):
    """Raised when a firm-side or wrong-client membership tries to fulfill."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class RequestNotOutstandingError(Exception):
    """Raised when the request is not in an fulfillable state."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


_OPEN_TASK_STATUSES = (
    TaskStatus.OPEN,
    TaskStatus.IN_PROGRESS,
    TaskStatus.BLOCKED,
)

_CLIENT_ROLES: frozenset[Role] = frozenset(
    {Role.INDIVIDUAL_TAXPAYER, Role.BUSINESS_OWNER}
)


def fulfill_request(
    request_id: str,
    *,
    role: Role,
    user_id: str,
) -> FulfillmentResult:
    req = db.session.scalars(
        select(Request)
        .where(Request.id == request_id)
        .options(
            selectinload(Request.thread).selectinload(Thread.links),
            selectinload(Request.thread).selectinload(Thread.requests),
        )
    ).first()
    if req is None:
        raise LookupError(request_id)

    if req.status is not RequestStatus.OUTSTANDING:
        raise RequestNotOutstandingError(
            f"Request {request_id} is {req.status.value}, not outstanding."
        )

    client_id, tax_return = _resolve_scope(req)
    _assert_client_actor(role=role, user_id=user_id, client_id=client_id)

    now = datetime.now(timezone.utc)
    doc_type = _infer_doc_type(req.label)
    filename = f"{_slugify(req.label)}.pdf"
    document_id = f"doc_upl_{request_id}"
    page_id = f"page_upl_{request_id}"

    document = Document(
        id=document_id,
        client_id=client_id,
        doc_type=doc_type,
        title=req.label,
        filename=filename,
        issuer=None,
        tax_year=tax_return.tax_year,
        page_count=1,
        status=DocumentStatus.UPLOADED,
        uploaded_at=now,
        uploaded_by_id=user_id,
    )
    page = DocumentPage(
        id=page_id,
        document_id=document_id,
        page_no=1,
        body_html=(
            "<p>Uploaded by client — processing</p>"
        ),
        ocr_text="Uploaded by client — processing",
    )
    db.session.add(document)
    db.session.add(page)
    db.session.flush()

    req.status = RequestStatus.FULFILLED
    req.fulfilled_by_document_id = document_id
    req.updated_at = now

    _close_related_tasks(tax_return.id, req.label)
    _maybe_advance_return(tax_return, client_id)

    db.session.commit()

    return FulfillmentResult(
        request=RequestOut(
            id=req.id,
            label=req.label,
            status=req.status,
            owner_user_id=req.owner_user_id,
            due_date=req.due_date.isoformat() if req.due_date is not None else None,
            fulfilled_by_document_id=req.fulfilled_by_document_id,
        ),
        document=DocumentListItem(
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
        ),
        return_status=tax_return.status,
    )


def _assert_client_actor(*, role: Role, user_id: str, client_id: str) -> None:
    if role.is_firm_side:
        raise FulfillmentAccessDenied("Clients fulfill their own requests.")

    membership = db.session.scalars(
        select(Membership).where(
            Membership.user_id == user_id,
            Membership.role == role,
            Membership.client_id == client_id,
        )
    ).first()
    if membership is None:
        raise FulfillmentAccessDenied("Clients fulfill their own requests.")


def _resolve_scope(req: Request) -> tuple[str, TaxReturn]:
    thread = req.thread
    if thread is None:
        raise LookupError(req.id)

    for link in thread.links:
        tax_return = _tax_return_for_link(link)
        if tax_return is not None:
            return tax_return.client_id, tax_return

    raise LookupError(f"Request {req.id} is not linked to a return")


def _tax_return_for_link(link: ThreadLink) -> TaxReturn | None:
    if link.target_type is LinkTarget.RETURN:
        return db.session.get(TaxReturn, link.target_id)

    if link.target_type is LinkTarget.TASK:
        task = db.session.get(Task, link.target_id)
        if task is None:
            return None
        return db.session.get(TaxReturn, task.return_id)

    if link.target_type is LinkTarget.DOCUMENT:
        document = db.session.get(Document, link.target_id)
        if document is None:
            return None
        return db.session.scalars(
            select(TaxReturn)
            .where(TaxReturn.client_id == document.client_id)
            .order_by(TaxReturn.tax_year.desc(), TaxReturn.id.asc())
        ).first()

    if link.target_type is LinkTarget.FIELD:
        field = db.session.scalars(
            select(ReturnField)
            .where(ReturnField.id == link.target_id)
            .options(selectinload(ReturnField.section))
        ).first()
        if field is None or field.section is None:
            return None
        return db.session.get(TaxReturn, field.section.return_id)

    return None


def _infer_doc_type(label: str) -> DocType:
    lowered = label.lower()
    if "w-2" in lowered or "w2" in lowered:
        return DocType.W2
    if "k-1" in lowered or "k1" in lowered:
        return DocType.K1
    if "1099-int" in lowered or "1099_int" in lowered:
        return DocType.FORM_1099_INT
    if "1099-nec" in lowered or "1099_nec" in lowered:
        return DocType.FORM_1099_NEC
    if "1099-div" in lowered or "1099_div" in lowered:
        return DocType.FORM_1099_DIV
    if "1099" in lowered:
        return DocType.FORM_1099_NEC
    return DocType.OTHER


def _slugify(label: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", label.lower()).strip("_")
    return slug or "document"


def _close_related_tasks(return_id: str, request_label: str) -> None:
    needle = request_label.casefold()
    tasks = db.session.scalars(
        select(Task).where(
            Task.return_id == return_id,
            Task.status.in_(_OPEN_TASK_STATUSES),
        )
    ).all()
    for task in tasks:
        title = (task.title or "").casefold()
        detail = (task.detail or "").casefold()
        mentions = needle in title or needle in detail
        client_blocked = (
            task.owner_role in _CLIENT_ROLES
            and task.status is TaskStatus.BLOCKED
            and mentions
        )
        if mentions or client_blocked:
            task.status = TaskStatus.DONE


def _maybe_advance_return(tax_return: TaxReturn, client_id: str) -> None:
    if tax_return.status is not ReturnStatus.DOCS_REQUESTED:
        return

    outstanding = _count_outstanding_requests_for_return(tax_return.id)
    requested_docs = int(
        db.session.scalar(
            select(func.count())
            .select_from(Document)
            .where(
                Document.client_id == client_id,
                Document.status == DocumentStatus.REQUESTED,
            )
        )
        or 0
    )
    if outstanding == 0 and requested_docs == 0:
        tax_return.status = ReturnStatus.DOCS_RECEIVED


def _count_outstanding_requests_for_return(return_id: str) -> int:
    """Outstanding requests on threads linked to this return (or its fields/tasks)."""
    field_ids = db.session.scalars(
        select(ReturnField.id)
        .join(ReturnSection, ReturnField.section_id == ReturnSection.id)
        .where(ReturnSection.return_id == return_id)
    ).all()
    task_ids = db.session.scalars(
        select(Task.id).where(Task.return_id == return_id)
    ).all()

    link_filters = [
        (ThreadLink.target_type == LinkTarget.RETURN)
        & (ThreadLink.target_id == return_id)
    ]
    if field_ids:
        link_filters.append(
            (ThreadLink.target_type == LinkTarget.FIELD)
            & (ThreadLink.target_id.in_(field_ids))
        )
    if task_ids:
        link_filters.append(
            (ThreadLink.target_type == LinkTarget.TASK)
            & (ThreadLink.target_id.in_(task_ids))
        )

    thread_ids = db.session.scalars(
        select(ThreadLink.thread_id).where(or_(*link_filters)).distinct()
    ).all()
    if not thread_ids:
        return 0

    return int(
        db.session.scalar(
            select(func.count())
            .select_from(Request)
            .where(
                Request.thread_id.in_(thread_ids),
                Request.status == RequestStatus.OUTSTANDING,
            )
        )
        or 0
    )
