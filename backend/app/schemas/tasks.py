"""Task list response schemas."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict

from ..enums import Role, TaskPriority, TaskStatus


class TaskListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    return_id: str
    return_tax_year: int
    return_form_type: str
    client_id: str
    client_name: str
    title: str
    detail: str | None
    status: TaskStatus
    priority: TaskPriority
    owner_role: Role
    owner_user_id: str | None
    due_date: date | None
    blocked_by_id: str | None
    priority_score: float
