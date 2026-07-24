"""Recursive field traceability — the spine of the provenance UI."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..enums import ConfidenceBand, LinkTarget
from ..extensions import db
from ..models import (
    AiAnnotation,
    AiCorrection,
    Document,
    DocumentPage,
    Provenance,
    ReturnField,
    Transform,
    TransformInput,
)
from ..schemas.common import money_str
from ..schemas.fields import (
    BBoxOut,
    FieldTrace,
    TraceDocumentOut,
    TraceFieldInput,
    TraceFieldSummary,
    TracePageOut,
    TraceProvenanceInput,
    TraceProvenanceOut,
    TraceTransformOut,
)
from ..schemas.ai import AiCorrectionOut, TraceAnnotationOut

MAX_TRACE_DEPTH = 6


def get_field_trace(field_id: str) -> FieldTrace | None:
    field = db.session.get(ReturnField, field_id)
    if field is None:
        return None
    return _build_trace(field, depth=0, seen=set())


def _build_trace(
    field: ReturnField,
    *,
    depth: int,
    seen: set[str],
) -> FieldTrace:
    summary = TraceFieldSummary(
        id=field.id,
        line_ref=field.line_ref,
        label=field.label,
        value=money_str(field.value),
        state=field.state,
    )
    annotation = _annotation_for_field(field.id)
    correction = _latest_correction_for_field(field.id)

    if field.id in seen or depth >= MAX_TRACE_DEPTH:
        return FieldTrace(
            field=summary,
            annotation=annotation,
            transform=None,
            correction=correction,
        )

    next_seen = seen | {field.id}
    transform = _primary_transform(field.id)
    if transform is None:
        return FieldTrace(
            field=summary,
            annotation=annotation,
            transform=None,
            correction=correction,
        )

    inputs: list[TraceProvenanceInput | TraceFieldInput] = []
    for raw_input in transform.inputs:
        if raw_input.provenance_id is not None and raw_input.provenance is not None:
            inputs.append(
                TraceProvenanceInput(
                    operator=raw_input.operator,
                    provenance=_serialize_provenance(raw_input.provenance),
                )
            )
        elif raw_input.source_field_id is not None:
            source = raw_input.source_field
            if source is None:
                source = db.session.get(ReturnField, raw_input.source_field_id)
            if source is None:
                continue
            inputs.append(
                TraceFieldInput(
                    operator=raw_input.operator,
                    field=_build_trace(source, depth=depth + 1, seen=next_seen),
                )
            )

    return FieldTrace(
        field=summary,
        annotation=annotation,
        transform=TraceTransformOut(
            kind=transform.kind,
            expression=transform.expression,
            human_explanation=transform.human_explanation,
            inputs=inputs,
        ),
        correction=correction,
    )


def _primary_transform(field_id: str) -> Transform | None:
    return db.session.scalars(
        select(Transform)
        .where(Transform.field_id == field_id)
        .options(
            selectinload(Transform.inputs)
            .selectinload(TransformInput.provenance)
            .selectinload(Provenance.page)
            .selectinload(DocumentPage.document),
            selectinload(Transform.inputs).selectinload(TransformInput.source_field),
        )
        .order_by(Transform.sort_order.asc())
        .limit(1)
    ).first()


def _serialize_provenance(provenance: Provenance) -> TraceProvenanceOut:
    page = provenance.page
    document: Document | None = page.document if page is not None else None
    if page is None:
        page = db.session.get(DocumentPage, provenance.page_id)
    if document is None and page is not None:
        document = page.document
        if document is None:
            document = db.session.get(Document, page.document_id)

    if page is None or document is None:
        raise ValueError(f"Provenance {provenance.id} is missing page or document")

    return TraceProvenanceOut(
        id=provenance.id,
        box_label=provenance.box_label,
        raw_value=money_str(provenance.raw_value),
        document=TraceDocumentOut(
            id=document.id,
            title=document.title,
            issuer=document.issuer,
        ),
        page=TracePageOut(id=page.id, page_no=page.page_no),
        bbox=BBoxOut(
            x=provenance.bbox_x,
            y=provenance.bbox_y,
            w=provenance.bbox_w,
            h=provenance.bbox_h,
        ),
    )


def _annotation_for_field(field_id: str) -> TraceAnnotationOut | None:
    annotation = _field_annotation(field_id)
    if annotation is None:
        return None
    return TraceAnnotationOut(
        confidence=annotation.confidence,
        band=ConfidenceBand.from_score(annotation.confidence),
        rationale=annotation.rationale,
        uncertainty_note=annotation.uncertainty_note,
    )


def _latest_correction_for_field(field_id: str) -> AiCorrectionOut | None:
    annotation = _field_annotation(field_id)
    if annotation is None:
        return None
    correction = db.session.scalars(
        select(AiCorrection)
        .where(AiCorrection.annotation_id == annotation.id)
        .order_by(AiCorrection.created_at.desc())
        .limit(1)
    ).first()
    if correction is None:
        return None
    return AiCorrectionOut.model_validate(correction)


def _field_annotation(field_id: str) -> AiAnnotation | None:
    return db.session.scalars(
        select(AiAnnotation).where(
            AiAnnotation.target_type == LinkTarget.FIELD,
            AiAnnotation.target_id == field_id,
        )
    ).first()
