"""Source documents and their pages."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..enums import DocType, DocumentStatus
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .provenance import Provenance


class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    client_id: Mapped[str] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    doc_type: Mapped[DocType] = mapped_column(
        SAEnum(DocType, native_enum=False), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    issuer: Mapped[str | None] = mapped_column(String(160), index=True)
    tax_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    page_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[DocumentStatus] = mapped_column(
        SAEnum(DocumentStatus, native_enum=False), nullable=False, index=True
    )
    uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    uploaded_by_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    pages: Mapped[list["DocumentPage"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentPage.page_no",
    )


class DocumentPage(Base):
    """One page of a source document.

    We do not store PDFs. `body_html` holds a styled HTML rendering of the form,
    which the frontend displays in an iframe. This makes the provenance bounding
    box a trivially positioned overlay instead of a PDF-coordinate problem, and
    it looks sharper than an embedded viewer. Noted as simulated in the README.
    """

    __tablename__ = "document_pages"

    document_id: Mapped[str] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    page_no: Mapped[int] = mapped_column(Integer, nullable=False)
    body_html: Mapped[str] = mapped_column(Text, nullable=False, default="")
    ocr_text: Mapped[str] = mapped_column(Text, nullable=False, default="")

    document: Mapped["Document"] = relationship(back_populates="pages")
    provenances: Mapped[list["Provenance"]] = relationship(
        back_populates="page", cascade="all, delete-orphan"
    )
