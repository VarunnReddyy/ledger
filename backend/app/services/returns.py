"""Return list and detail services."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from ..enums import DocType, DocumentStatus, LinkTarget, RequestStatus, TaskStatus
from ..extensions import db
from ..models import (
    AiAnnotation,
    Client,
    Document,
    ReturnField,
    ReturnSection,
    Task,
    TaxReturn,
)
from ..schemas.ai import AiAnnotationOut
from ..schemas.common import money_str
from ..schemas.returns import (
    ClientNextStepOut,
    ReturnDetail,
    ReturnFieldOut,
    ReturnListItem,
    ReturnSectionOut,
)
from ..schemas.threads import ThreadOut
from .threads import load_threads_for_targets

DOC_TYPE_CLIENT_LABELS: dict[DocType, str] = {
    DocType.W2: "W-2",
    DocType.FORM_1099_NEC: "1099-NEC",
    DocType.FORM_1099_INT: "1099-INT",
    DocType.FORM_1099_DIV: "1099-DIV",
    DocType.FORM_1098: "1098",
    DocType.K1: "Schedule K-1",
    DocType.RECEIPT: "receipt",
    DocType.BANK_STATEMENT: "bank statement",
    DocType.PRIOR_RETURN: "prior-year return",
    DocType.OTHER: "document",
}

DOC_TYPE_ESTIMATE_MINUTES: dict[DocType, int] = {
    DocType.W2: 2,
    DocType.FORM_1099_NEC: 2,
    DocType.FORM_1099_INT: 2,
    DocType.FORM_1099_DIV: 2,
    DocType.FORM_1098: 3,
    DocType.K1: 5,
    DocType.RECEIPT: 3,
    DocType.BANK_STATEMENT: 4,
    DocType.PRIOR_RETURN: 5,
    DocType.OTHER: 3,
}

REQUEST_ESTIMATE_MINUTES = 3


def list_returns(*, client_id: str | None = None) -> list[ReturnListItem]:
    open_statuses = [
        TaskStatus.OPEN,
        TaskStatus.IN_PROGRESS,
        TaskStatus.BLOCKED,
    ]
    open_count = (
        select(func.count(Task.id))
        .where(
            Task.return_id == TaxReturn.id,
            Task.status.in_(open_statuses),
        )
        .correlate(TaxReturn)
        .scalar_subquery()
        .label("open_task_count")
    )
    field_count = (
        select(func.count(ReturnField.id))
        .select_from(ReturnField)
        .join(ReturnSection, ReturnField.section_id == ReturnSection.id)
        .where(ReturnSection.return_id == TaxReturn.id)
        .correlate(TaxReturn)
        .scalar_subquery()
        .label("field_count")
    )

    stmt = (
        select(TaxReturn, Client, open_count, field_count)
        .join(Client, TaxReturn.client_id == Client.id)
        .options(
            selectinload(TaxReturn.preparer),
            selectinload(TaxReturn.reviewer),
        )
        .order_by(TaxReturn.due_date.asc(), TaxReturn.id.asc())
    )
    if client_id:
        stmt = stmt.where(TaxReturn.client_id == client_id)
    rows = db.session.execute(stmt).all()

    items: list[ReturnListItem] = []
    for tax_return, client, count, fields in rows:
        preparer = tax_return.preparer
        reviewer = tax_return.reviewer
        items.append(
            ReturnListItem(
                id=tax_return.id,
                client_id=client.id,
                client_name=client.display_name,
                tax_year=tax_return.tax_year,
                status=tax_return.status,
                staff_label=tax_return.status.staff_label,
                client_label=tax_return.status.client_label,
                due_date=tax_return.due_date,
                preparer_id=tax_return.preparer_id,
                preparer_name=preparer.name if preparer is not None else None,
                reviewer_id=tax_return.reviewer_id,
                reviewer_name=reviewer.name if reviewer is not None else None,
                open_task_count=int(count or 0),
                has_fields=int(fields or 0) > 0,
            )
        )
    return items


def get_return(
    return_id: str, *, include_internal: bool = True
) -> ReturnDetail | None:
    tax_return = db.session.scalars(
        select(TaxReturn)
        .where(TaxReturn.id == return_id)
        .options(
            selectinload(TaxReturn.client),
            selectinload(TaxReturn.preparer),
            selectinload(TaxReturn.reviewer),
            selectinload(TaxReturn.sections).selectinload(ReturnSection.fields),
        )
    ).first()
    if tax_return is None:
        return None

    client = tax_return.client
    preparer = tax_return.preparer
    reviewer = tax_return.reviewer

    sections: list[ReturnSectionOut] = []
    field_ids: list[str] = []
    for section in tax_return.sections:
        fields: list[ReturnFieldOut] = []
        for field in section.fields:
            field_ids.append(field.id)
            fields.append(_field_out(field))
        sections.append(
            ReturnSectionOut(
                id=section.id,
                code=section.code,
                label=section.label,
                sort_order=section.sort_order,
                fields=fields,
            )
        )

    annotations = _annotations_for_return(return_id, field_ids)
    targets: list[tuple[LinkTarget, str]] = [(LinkTarget.RETURN, return_id)]
    targets.extend((LinkTarget.FIELD, fid) for fid in field_ids)
    threads = load_threads_for_targets(targets, include_internal=include_internal)
    client_next_step = resolve_client_next_step(
        client_id=client.id,
        threads=threads,
    )

    return ReturnDetail(
        id=tax_return.id,
        client_id=client.id,
        client_name=client.display_name,
        tax_year=tax_return.tax_year,
        form_type=tax_return.form_type,
        status=tax_return.status,
        staff_label=tax_return.status.staff_label,
        client_label=tax_return.status.client_label,
        due_date=tax_return.due_date,
        preparer_id=tax_return.preparer_id,
        preparer_name=preparer.name if preparer is not None else None,
        reviewer_id=tax_return.reviewer_id,
        reviewer_name=reviewer.name if reviewer is not None else None,
        refund_estimate=money_str(tax_return.refund_estimate),
        sections=sections,
        annotations=annotations,
        threads=threads,
        client_next_step=client_next_step,
    )


def resolve_client_next_step(
    *,
    client_id: str,
    threads: list[ThreadOut],
) -> ClientNextStepOut | None:
    """First outstanding Request, else first requested Document for the client."""
    outstanding: list[tuple[str, str]] = []
    for thread in threads:
        for req in thread.requests:
            if req.status == RequestStatus.OUTSTANDING:
                outstanding.append((req.id, req.label))
    outstanding.sort(key=lambda item: item[0])
    if outstanding:
        req_id, label = outstanding[0]
        return ClientNextStepOut(
            source="request",
            id=req_id,
            headline=label,
            estimate_minutes=REQUEST_ESTIMATE_MINUTES,
        )

    docs = db.session.scalars(
        select(Document)
        .where(
            Document.client_id == client_id,
            Document.status == DocumentStatus.REQUESTED,
        )
        .order_by(Document.id.asc())
    ).all()
    if not docs:
        return None

    doc = docs[0]
    label = DOC_TYPE_CLIENT_LABELS.get(doc.doc_type, "document")
    return ClientNextStepOut(
        source="document",
        id=doc.id,
        headline=f"Upload your {label}",
        estimate_minutes=DOC_TYPE_ESTIMATE_MINUTES.get(doc.doc_type, 3),
    )


def _field_out(field: ReturnField) -> ReturnFieldOut:
    return ReturnFieldOut(
        id=field.id,
        line_ref=field.line_ref,
        label=field.label,
        value=money_str(field.value),
        state=field.state,
        locked_reason=field.locked_reason,
    )


def _annotations_for_return(
    return_id: str,
    field_ids: list[str],
) -> dict[str, AiAnnotationOut]:
    target_ids = [return_id, *field_ids]
    if not target_ids:
        return {}

    rows = db.session.scalars(
        select(AiAnnotation).where(AiAnnotation.target_id.in_(target_ids))
    ).all()

    result: dict[str, AiAnnotationOut] = {}
    for annotation in rows:
        result[annotation.target_id] = AiAnnotationOut(
            id=annotation.id,
            target_type=annotation.target_type,
            target_id=annotation.target_id,
            kind=annotation.kind,
            headline=annotation.headline,
            rationale=annotation.rationale,
            uncertainty_note=annotation.uncertainty_note,
            suggested_action=annotation.suggested_action,
            suggested_value=money_str(annotation.suggested_value),
            confidence=annotation.confidence,
            band=annotation.band,
            model_name=annotation.model_name,
            is_simulated=annotation.is_simulated,
        )
    return result
