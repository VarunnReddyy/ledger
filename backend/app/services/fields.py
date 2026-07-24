"""Field verify and correct mutations."""

from __future__ import annotations

from sqlalchemy import func, select

from ..enums import AnnotationKind, FieldState, LinkTarget
from ..extensions import db
from ..models import AiAnnotation, AiCorrection, ReturnField, User
from ..schemas.ai import AiCorrectionOut, FieldCorrectRequest
from ..schemas.common import money_str, parse_money
from ..schemas.fields import FieldCorrectResponse, FieldVerifyResponse
from ..schemas.returns import ReturnFieldOut


class FieldLockedError(Exception):
    """Raised when a mutation targets a locked field."""

    def __init__(self, field_id: str, reason: str | None) -> None:
        self.field_id = field_id
        self.reason = reason or "This field is locked and cannot be changed."
        super().__init__(self.reason)


def verify_field(field_id: str) -> FieldVerifyResponse:
    field = db.session.get(ReturnField, field_id)
    if field is None:
        raise LookupError(field_id)
    if field.state is FieldState.LOCKED:
        raise FieldLockedError(field_id, field.locked_reason)

    field.state = FieldState.VERIFIED
    db.session.commit()
    db.session.refresh(field)
    return FieldVerifyResponse(field=_field_out(field))


def correct_field(
    field_id: str,
    body: FieldCorrectRequest,
    *,
    user_id: str = "usr_dana_reyes",
) -> FieldCorrectResponse:
    field = db.session.get(ReturnField, field_id)
    if field is None:
        raise LookupError(field_id)
    if field.state is FieldState.LOCKED:
        raise FieldLockedError(field_id, field.locked_reason)

    user = db.session.get(User, user_id)
    if user is None:
        raise ValueError(f"Unknown user {user_id!r}")

    new_value = parse_money(body.value)
    old_value = money_str(field.value)

    annotation = db.session.scalars(
        select(AiAnnotation).where(
            AiAnnotation.target_type == LinkTarget.FIELD,
            AiAnnotation.target_id == field_id,
        )
    ).first()
    if annotation is None:
        annotation = AiAnnotation(
            id=f"ann_corr_{field_id}",
            target_type=LinkTarget.FIELD,
            target_id=field_id,
            kind=_annotation_kind_for_state(field.state),
            headline="Human correction",
            rationale="A reviewer supplied a corrected value for this field.",
            uncertainty_note=None,
            suggested_action=None,
            suggested_value=None,
            confidence=0.0,
            model_name="human",
            is_simulated=True,
        )
        db.session.add(annotation)
        db.session.flush()

    suffix = _next_correction_suffix(annotation.id)
    correction = AiCorrection(
        id=f"corr_{field_id}_{suffix}",
        annotation_id=annotation.id,
        user_id=user_id,
        old_value=old_value,
        new_value=money_str(new_value),
        reason=body.reason,
    )
    db.session.add(correction)

    field.value = new_value
    field.state = FieldState.VERIFIED
    db.session.commit()
    db.session.refresh(field)
    db.session.refresh(correction)

    return FieldCorrectResponse(
        field=_field_out(field),
        correction=AiCorrectionOut.model_validate(correction),
    )


def _annotation_kind_for_state(state: FieldState) -> AnnotationKind:
    if state is FieldState.AI_CALCULATED:
        return AnnotationKind.CALCULATION
    return AnnotationKind.EXTRACTION


def _next_correction_suffix(annotation_id: str) -> str:
    count = db.session.scalar(
        select(func.count())
        .select_from(AiCorrection)
        .where(AiCorrection.annotation_id == annotation_id)
    )
    return f"{int(count or 0) + 1:02d}"


def _field_out(field: ReturnField) -> ReturnFieldOut:
    return ReturnFieldOut(
        id=field.id,
        line_ref=field.line_ref,
        label=field.label,
        value=money_str(field.value),
        state=field.state,
        locked_reason=field.locked_reason,
    )
