"""AI annotation and correction response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from ..enums import AnnotationKind, ConfidenceBand, LinkTarget


class AiAnnotationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: str
    target_type: LinkTarget
    target_id: str
    kind: AnnotationKind
    headline: str
    rationale: str
    uncertainty_note: str | None
    suggested_action: str | None
    suggested_value: str | None
    confidence: float
    band: ConfidenceBand
    model_name: str
    is_simulated: bool


class TraceAnnotationOut(BaseModel):
    """Compact annotation shape embedded in the traceability payload."""

    confidence: float
    band: ConfidenceBand
    rationale: str
    uncertainty_note: str | None = None


class AiCorrectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    annotation_id: str
    user_id: str
    old_value: str | None
    new_value: str | None
    reason: str | None
    created_at: datetime


class FieldCorrectRequest(BaseModel):
    value: str | float | int = Field(description="Corrected field value")
    reason: str = ""
