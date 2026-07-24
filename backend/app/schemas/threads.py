"""Thread / message response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from ..enums import LinkTarget, RequestStatus, Role, Visibility


class ThreadLinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    target_type: LinkTarget
    target_id: str


class MessageCreateRequest(BaseModel):
    body: str = Field(min_length=1)
    visibility: Visibility


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    author_id: str
    author_name: str
    body: str
    visibility: Visibility
    created_at: datetime


class RequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    label: str
    status: RequestStatus
    owner_user_id: str | None
    due_date: str | None
    fulfilled_by_document_id: str | None


class ThreadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subject: str
    visibility: Visibility
    resolved_at: datetime | None
    awaiting_role: Role | None
    awaiting_user_id: str | None
    is_resolved: bool
    links: list[ThreadLinkOut]
    messages: list[MessageOut]
    requests: list[RequestOut]
