"""Field mutation and traceability response schemas."""

from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field

from ..enums import FieldState, TransformKind
from .ai import AiCorrectionOut, TraceAnnotationOut
from .returns import ReturnFieldOut


class BBoxOut(BaseModel):
    x: float
    y: float
    w: float
    h: float


class TraceDocumentOut(BaseModel):
    id: str
    title: str
    issuer: str | None


class TracePageOut(BaseModel):
    id: str
    page_no: int


class TraceProvenanceOut(BaseModel):
    id: str
    box_label: str
    raw_value: str | None
    document: TraceDocumentOut
    page: TracePageOut
    bbox: BBoxOut


class TraceFieldSummary(BaseModel):
    id: str
    line_ref: str
    label: str
    value: str | None
    state: FieldState


class TraceProvenanceInput(BaseModel):
    type: Literal["provenance"] = "provenance"
    operator: str
    provenance: TraceProvenanceOut


class TraceFieldInput(BaseModel):
    type: Literal["field"] = "field"
    operator: str
    field: "FieldTrace"


TraceInput = Annotated[
    Union[TraceProvenanceInput, TraceFieldInput],
    Field(discriminator="type"),
]


class TraceTransformOut(BaseModel):
    kind: TransformKind
    expression: str
    human_explanation: str
    inputs: list[TraceInput]


class FieldTrace(BaseModel):
    """Recursive traceability payload for a return field."""

    field: TraceFieldSummary
    annotation: TraceAnnotationOut | None = None
    transform: TraceTransformOut | None = None
    correction: AiCorrectionOut | None = None


class FieldCorrectResponse(BaseModel):
    field: ReturnFieldOut
    correction: AiCorrectionOut


class FieldVerifyResponse(BaseModel):
    field: ReturnFieldOut


TraceFieldInput.model_rebuild()
FieldTrace.model_rebuild()
