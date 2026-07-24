"""The AI trust layer.

Model output is never stored as a bare value. It always carries the four things
a user needs in order to decide whether to accept it: what the model did, why,
what evidence supports it, and how sure it is. A correction is a first-class
record, not a silent overwrite — so the user can always see that a human
intervened and what the machine had originally said.
"""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Numeric, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..enums import AnnotationKind, ConfidenceBand, LinkTarget
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .identity import User


class AiAnnotation(Base, TimestampMixin):
    """Everything the model has to say about one object.

    Attached polymorphically so the same trust component renders identically
    over a field, a document, or a whole return.
    """

    __tablename__ = "ai_annotations"

    target_type: Mapped[LinkTarget] = mapped_column(
        SAEnum(LinkTarget, native_enum=False), nullable=False, index=True
    )
    target_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    kind: Mapped[AnnotationKind] = mapped_column(
        SAEnum(AnnotationKind, native_enum=False), nullable=False, index=True
    )
    headline: Mapped[str] = mapped_column(String(200), nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    uncertainty_note: Mapped[str | None] = mapped_column(Text)
    suggested_action: Mapped[str | None] = mapped_column(String(200))
    suggested_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))

    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    model_name: Mapped[str] = mapped_column(String(80), nullable=False)
    is_simulated: Mapped[bool] = mapped_column(nullable=False, default=True)

    corrections: Mapped[list["AiCorrection"]] = relationship(
        back_populates="annotation", cascade="all, delete-orphan"
    )

    @property
    def band(self) -> ConfidenceBand:
        """What the UI actually keys off.

        The raw score stays available behind a disclosure, but the interface
        makes decisions on the band. A user cannot act differently on 0.82
        versus 0.79; they can act differently on 'check this' versus 'fine'.
        """
        return ConfidenceBand.from_score(self.confidence)

    @property
    def needs_human_check(self) -> bool:
        return self.band is not ConfidenceBand.HIGH


class AiCorrection(Base, TimestampMixin):
    """A human overriding the model.

    Kept forever. Two reasons: the user can see what the AI originally said
    after correcting it, and the product can honestly show how often the model
    is wrong — which builds more trust than hiding it would.
    """

    __tablename__ = "ai_corrections"

    annotation_id: Mapped[str] = mapped_column(
        ForeignKey("ai_annotations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    old_value: Mapped[str | None] = mapped_column(String(240))
    new_value: Mapped[str | None] = mapped_column(String(240))
    reason: Mapped[str | None] = mapped_column(Text)

    annotation: Mapped["AiAnnotation"] = relationship(back_populates="corrections")
    user: Mapped["User"] = relationship()
