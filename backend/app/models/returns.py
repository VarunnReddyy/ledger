"""The tax return itself."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..enums import FieldState, ReturnStatus
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .identity import Client, User
    from .provenance import Provenance, Transform


class TaxReturn(Base, TimestampMixin):
    __tablename__ = "tax_returns"

    client_id: Mapped[str] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tax_year: Mapped[int] = mapped_column(Integer, nullable=False)
    form_type: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[ReturnStatus] = mapped_column(
        SAEnum(ReturnStatus, native_enum=False), nullable=False, index=True
    )
    preparer_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    reviewer_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    refund_estimate: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))

    client: Mapped["Client"] = relationship(back_populates="returns")
    preparer: Mapped["User | None"] = relationship(foreign_keys=[preparer_id])
    reviewer: Mapped["User | None"] = relationship(foreign_keys=[reviewer_id])
    sections: Mapped[list["ReturnSection"]] = relationship(
        back_populates="tax_return",
        cascade="all, delete-orphan",
        order_by="ReturnSection.sort_order",
    )


class ReturnSection(Base):
    """A logical grouping of lines, e.g. 'Income' or 'Deductions'."""

    __tablename__ = "return_sections"

    return_id: Mapped[str] = mapped_column(
        ForeignKey("tax_returns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    tax_return: Mapped["TaxReturn"] = relationship(back_populates="sections")
    fields: Mapped[list["ReturnField"]] = relationship(
        back_populates="section",
        cascade="all, delete-orphan",
        order_by="ReturnField.sort_order",
    )


class ReturnField(Base, TimestampMixin):
    """One line on the return.

    `state` is the most important column in the schema. It drives every visual
    affordance decision in the product — what looks clickable, what looks
    editable, what is marked as machine-generated, what is locked and why.
    See AGENTS.md section 6.
    """

    __tablename__ = "return_fields"

    section_id: Mapped[str] = mapped_column(
        ForeignKey("return_sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    line_ref: Mapped[str] = mapped_column(String(24), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    unit: Mapped[str] = mapped_column(String(8), nullable=False, default="USD")
    state: Mapped[FieldState] = mapped_column(
        SAEnum(FieldState, native_enum=False), nullable=False, index=True
    )
    locked_reason: Mapped[str | None] = mapped_column(String(240))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    section: Mapped["ReturnSection"] = relationship(back_populates="fields")
    provenances: Mapped[list["Provenance"]] = relationship(
        back_populates="field", cascade="all, delete-orphan"
    )
    transforms: Mapped[list["Transform"]] = relationship(
        back_populates="field",
        cascade="all, delete-orphan",
        order_by="Transform.sort_order",
    )

    def __init__(self, **kwargs: object) -> None:
        super().__init__(**kwargs)
        self._assert_lock_has_reason()

    def _assert_lock_has_reason(self) -> None:
        """A locked field the user cannot get an explanation for is a dead end.

        The UI promises 'what can't be changed, and why'. Enforce the 'why'
        here so no seed row or service can ever violate that promise.
        """
        if self.state is FieldState.LOCKED and not self.locked_reason:
            raise ValueError(f"Locked field {self.id!r} requires a locked_reason")
