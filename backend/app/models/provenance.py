"""Traceability: how a number on the return got there.

This module is the spine of the product. A CPA must be able to take any figure
and walk backwards through every calculation to the exact region of the exact
page of the exact document it came from.

A single foreign key cannot express that, because a field is often derived from
several sources through an operation. So the structure is a small DAG:

    ReturnField
        └── Transform            (the operation: sum, subtract, lookup, ...)
              └── TransformInput (each operand)
                    ├── Provenance   -> a region on a document page   [leaf]
                    └── ReturnField  -> another field, recurse        [branch]

Walking that tree renders the explanation the user actually reads:

    Line 1  $84,200
      = Box 1 of W-2 (Acme Corp, page 1)      $61,500
      + Box 1 of W-2 (Beta LLC, page 1)       $22,700
"""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..enums import TransformKind
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .documents import DocumentPage
    from .returns import ReturnField


class Provenance(Base):
    """A leaf: one value read off one region of one page.

    `bbox` is stored as percentages of page width and height rather than
    absolute pixels, so the highlight overlay stays correct at any zoom level
    or container size.
    """

    __tablename__ = "provenances"

    field_id: Mapped[str] = mapped_column(
        ForeignKey("return_fields.id", ondelete="CASCADE"), nullable=False, index=True
    )
    page_id: Mapped[str] = mapped_column(
        ForeignKey("document_pages.id", ondelete="CASCADE"), nullable=False, index=True
    )
    box_label: Mapped[str] = mapped_column(String(80), nullable=False)
    raw_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    snippet: Mapped[str] = mapped_column(Text, nullable=False, default="")

    bbox_x: Mapped[float] = mapped_column(nullable=False)
    bbox_y: Mapped[float] = mapped_column(nullable=False)
    bbox_w: Mapped[float] = mapped_column(nullable=False)
    bbox_h: Mapped[float] = mapped_column(nullable=False)

    field: Mapped["ReturnField"] = relationship(back_populates="provenances")
    page: Mapped["DocumentPage"] = relationship(back_populates="provenances")

    @property
    def bbox(self) -> dict[str, float]:
        return {
            "x": self.bbox_x,
            "y": self.bbox_y,
            "w": self.bbox_w,
            "h": self.bbox_h,
        }


class Transform(Base, TimestampMixin):
    """The operation that produced a field's value from its inputs."""

    __tablename__ = "transforms"

    field_id: Mapped[str] = mapped_column(
        ForeignKey("return_fields.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[TransformKind] = mapped_column(
        SAEnum(TransformKind, native_enum=False), nullable=False
    )
    expression: Mapped[str] = mapped_column(String(240), nullable=False)
    human_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    authority: Mapped[str | None] = mapped_column(String(160))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    field: Mapped["ReturnField"] = relationship(back_populates="transforms")
    inputs: Mapped[list["TransformInput"]] = relationship(
        back_populates="transform",
        cascade="all, delete-orphan",
        order_by="TransformInput.sort_order",
    )


class TransformInput(Base):
    """One operand of a transform.

    Exactly one of `provenance_id` (a document region) or `source_field_id`
    (another field on the return) must be set. That XOR is what makes the
    structure a well-formed tree: document references terminate the walk,
    field references continue it.
    """

    __tablename__ = "transform_inputs"
    __table_args__ = (
        CheckConstraint(
            "(provenance_id IS NOT NULL) <> (source_field_id IS NOT NULL)",
            name="ck_transform_input_exactly_one_source",
        ),
    )

    transform_id: Mapped[str] = mapped_column(
        ForeignKey("transforms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provenance_id: Mapped[str | None] = mapped_column(
        ForeignKey("provenances.id", ondelete="CASCADE")
    )
    source_field_id: Mapped[str | None] = mapped_column(
        ForeignKey("return_fields.id", ondelete="CASCADE")
    )
    operator: Mapped[str] = mapped_column(String(8), nullable=False, default="+")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    transform: Mapped["Transform"] = relationship(back_populates="inputs")
    provenance: Mapped["Provenance | None"] = relationship()
    source_field: Mapped["ReturnField | None"] = relationship(
        foreign_keys=[source_field_id]
    )

    @property
    def is_leaf(self) -> bool:
        return self.provenance_id is not None
