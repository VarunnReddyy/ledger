"""Work and conversation.

The design rule that shapes this module: a thread has no home of its own. It is
always anchored to a document, a field, a task, or a return, and it is only ever
displayed in the context of that object. There is no top-level inbox, because an
inbox is exactly the fragmentation this layer is meant to eliminate.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..enums import LinkTarget, RequestStatus, Role, TaskPriority, TaskStatus, Visibility
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .identity import User


class Task(Base, TimestampMixin):
    """A unit of work. The dashboard is a ranked query over this table."""

    __tablename__ = "tasks"

    return_id: Mapped[str] = mapped_column(
        ForeignKey("tax_returns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text)
    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(TaskStatus, native_enum=False), nullable=False, index=True
    )
    priority: Mapped[TaskPriority] = mapped_column(
        SAEnum(TaskPriority, native_enum=False), nullable=False, index=True
    )
    owner_role: Mapped[Role] = mapped_column(
        SAEnum(Role, native_enum=False), nullable=False, index=True
    )
    owner_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    due_date: Mapped[date | None] = mapped_column(Date, index=True)
    blocked_by_id: Mapped[str | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="SET NULL")
    )

    # Computed by the prioritisation service and persisted so the dashboard can
    # sort in the database rather than pulling every task into memory. This is
    # what keeps the view usable for someone who owns hundreds of returns.
    priority_score: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0, index=True
    )

    owner: Mapped["User | None"] = relationship(foreign_keys=[owner_user_id])
    blocked_by: Mapped["Task | None"] = relationship(remote_side="Task.id")


class Thread(Base, TimestampMixin):
    """A conversation anchored to exactly one object."""

    __tablename__ = "threads"

    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    visibility: Mapped[Visibility] = mapped_column(
        SAEnum(Visibility, native_enum=False), nullable=False, index=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Whose move it is. Rendered as an explicit "waiting on" chip rather than
    # left for the reader to infer from who posted last.
    awaiting_role: Mapped[Role | None] = mapped_column(
        SAEnum(Role, native_enum=False), index=True
    )
    awaiting_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    links: Mapped[list["ThreadLink"]] = relationship(
        back_populates="thread", cascade="all, delete-orphan", lazy="selectin"
    )
    messages: Mapped[list["Message"]] = relationship(
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )
    requests: Mapped[list["Request"]] = relationship(
        back_populates="thread", cascade="all, delete-orphan"
    )
    awaiting_user: Mapped["User | None"] = relationship(
        foreign_keys=[awaiting_user_id]
    )

    @property
    def is_resolved(self) -> bool:
        return self.resolved_at is not None


class ThreadLink(Base):
    """Anchors a thread to a document, field, task, or return."""

    __tablename__ = "thread_links"

    thread_id: Mapped[str] = mapped_column(
        ForeignKey("threads.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_type: Mapped[LinkTarget] = mapped_column(
        SAEnum(LinkTarget, native_enum=False), nullable=False, index=True
    )
    target_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    thread: Mapped["Thread"] = relationship(back_populates="links")


class Message(Base, TimestampMixin):
    """One post in a thread.

    Message-level visibility exists on top of thread-level visibility so a
    client-visible thread can still carry an internal aside. The service layer
    filters on this; the frontend is never trusted to hide anything.
    """

    __tablename__ = "messages"

    thread_id: Mapped[str] = mapped_column(
        ForeignKey("threads.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    visibility: Mapped[Visibility] = mapped_column(
        SAEnum(Visibility, native_enum=False), nullable=False, index=True
    )

    thread: Mapped["Thread"] = relationship(back_populates="messages")
    author: Mapped["User"] = relationship()


class Request(Base, TimestampMixin):
    """An outstanding ask, tracked separately from the conversation.

    A question buried in a message thread is not trackable. Promoting the ask to
    its own record is what lets the product answer 'what is still outstanding?'
    without anyone re-reading the conversation.
    """

    __tablename__ = "requests"

    thread_id: Mapped[str] = mapped_column(
        ForeignKey("threads.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[RequestStatus] = mapped_column(
        SAEnum(RequestStatus, native_enum=False), nullable=False, index=True
    )
    owner_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    due_date: Mapped[date | None] = mapped_column(Date)
    fulfilled_by_document_id: Mapped[str | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL")
    )

    thread: Mapped["Thread"] = relationship(back_populates="requests")
    owner: Mapped["User | None"] = relationship(foreign_keys=[owner_user_id])
