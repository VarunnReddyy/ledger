"""Declarative base and shared column conventions."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """Shared declarative base.

    Primary keys are human-readable prefixed strings (`ret_northwind_2025`),
    not UUIDs. See AGENTS.md section 4 — this makes every URL in the product
    self-documenting and every deep link demoable.
    """

    id: Mapped[str] = mapped_column(String(64), primary_key=True)

    def __repr__(self) -> str:
        return f"<{type(self).__name__} {self.id}>"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
