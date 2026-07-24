"""Who people are and what they may see."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..enums import EntityType, Role
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .returns import TaxReturn


class User(Base, TimestampMixin):
    """A person. Deliberately holds no role of its own.

    Roles live on `Membership` so that a single human can be a preparer at the
    firm *and* an individual taxpayer with a personal return in the same
    system, without duplicate accounts or a role-switching hack.
    """

    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    initials: Mapped[str] = mapped_column(String(4), nullable=False)
    title: Mapped[str | None] = mapped_column(String(120))

    memberships: Mapped[list["Membership"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )

    @property
    def roles(self) -> set[Role]:
        return {m.role for m in self.memberships}

    def has_firm_access(self) -> bool:
        return any(r.is_firm_side for r in self.roles)


class Client(Base, TimestampMixin):
    """A taxpayer or business the firm does work for."""

    __tablename__ = "clients"

    display_name: Mapped[str] = mapped_column(String(160), nullable=False)
    entity_type: Mapped[EntityType] = mapped_column(
        SAEnum(EntityType, native_enum=False), nullable=False
    )
    primary_contact_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )

    returns: Mapped[list["TaxReturn"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    memberships: Mapped[list["Membership"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )


class Membership(Base, TimestampMixin):
    """A user's role, optionally scoped to one client.

    - Firm-side roles (preparer, reviewer, admin, seasonal) have
      `client_id is None` — they act across the whole firm.
    - Client-side roles are always scoped to exactly one client.

    The union of a user's memberships is the menu in the role switcher.
    """

    __tablename__ = "memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "role", "client_id", name="uq_membership"),
    )

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[Role] = mapped_column(
        SAEnum(Role, native_enum=False), nullable=False
    )
    client_id: Mapped[str | None] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), index=True
    )
    label: Mapped[str] = mapped_column(String(120), nullable=False)

    user: Mapped["User"] = relationship(back_populates="memberships")
    client: Mapped["Client | None"] = relationship(back_populates="memberships")
