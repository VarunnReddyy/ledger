"""Return list and detail response schemas."""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict

from ..enums import FieldState, ReturnStatus
from .ai import AiAnnotationOut
from .threads import ThreadOut


class ReturnListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    client_id: str
    client_name: str
    tax_year: int
    status: ReturnStatus
    staff_label: str
    client_label: str
    due_date: date
    preparer_id: str | None
    preparer_name: str | None
    reviewer_id: str | None
    reviewer_name: str | None
    open_task_count: int
    has_fields: bool


class ReturnFieldOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    line_ref: str
    label: str
    value: str | None
    state: FieldState
    locked_reason: str | None


class ReturnSectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    label: str
    sort_order: int
    fields: list[ReturnFieldOut]


class ClientNextStepOut(BaseModel):
    """The single action a client should take next during first-run.

    Derived from the first outstanding Request, else the first requested
    Document for the client. Null means nothing is outstanding.
    """

    source: Literal["request", "document"]
    id: str
    headline: str
    estimate_minutes: int


class ReturnDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    client_id: str
    client_name: str
    tax_year: int
    form_type: str
    status: ReturnStatus
    staff_label: str
    client_label: str
    due_date: date
    preparer_id: str | None
    preparer_name: str | None
    reviewer_id: str | None
    reviewer_name: str | None
    refund_estimate: str | None
    sections: list[ReturnSectionOut]
    annotations: dict[str, AiAnnotationOut]
    threads: list[ThreadOut]
    client_next_step: ClientNextStepOut | None
