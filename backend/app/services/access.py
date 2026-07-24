"""Role-scoped visibility helpers shared by list and detail services."""

from __future__ import annotations

from sqlalchemy import select

from ..enums import Role
from ..extensions import db
from ..models import Membership


def include_internal_messages(*, role: Role, user_id: str) -> bool:
    """Return whether internal collaboration is visible for this membership.

    Validates that the user holds the claimed role. Client-side roles never see
    internal threads or messages — that filter runs server-side.
    """
    membership = db.session.scalars(
        select(Membership).where(
            Membership.user_id == user_id,
            Membership.role == role,
        )
    ).first()
    if membership is None:
        raise ValueError(f"User {user_id!r} has no membership for role {role.value!r}")
    return role.is_firm_side
