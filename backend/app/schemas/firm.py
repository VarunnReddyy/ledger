"""Firm overview response schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ..enums import ReturnStatus


class ReturnsByStatusItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: ReturnStatus
    staff_label: str
    count: int


class StaffLoadItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    name: str
    open_tasks: int
    overdue: int


class FirmOverview(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    returns_by_status: list[ReturnsByStatusItem]
    overdue_tasks: int
    blocked_tasks: int
    awaiting_client: int
    staff_load: list[StaffLoadItem]
