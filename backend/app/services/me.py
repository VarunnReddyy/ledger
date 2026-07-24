"""Current users and memberships for the role switcher."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..extensions import db
from ..models import Membership, User
from ..schemas.me import MeResponse, MembershipOut, UserOut


def get_me(*, role_context: str | None = None) -> MeResponse:
    users = list(
        db.session.scalars(
            select(User)
            .options(selectinload(User.memberships).selectinload(Membership.client))
            .order_by(User.name.asc())
        ).all()
    )

    user_outs: list[UserOut] = []
    membership_index: dict[str, tuple[UserOut, MembershipOut]] = {}

    for user in users:
        memberships: list[MembershipOut] = []
        for membership in user.memberships:
            memberships.append(
                MembershipOut(
                    id=membership.id,
                    user_id=membership.user_id,
                    role=membership.role,
                    client_id=membership.client_id,
                    label=membership.label,
                    client_name=(
                        membership.client.display_name
                        if membership.client is not None
                        else None
                    ),
                )
            )
        user_out = UserOut(
            id=user.id,
            name=user.name,
            email=user.email,
            initials=user.initials,
            title=user.title,
            memberships=memberships,
        )
        user_outs.append(user_out)
        for membership in memberships:
            membership_index[membership.id] = (user_out, membership)

    active_membership: MembershipOut | None = None
    active_user: UserOut | None = None
    resolved_context: str | None = None

    if role_context:
        pair = membership_index.get(role_context)
        if pair is None:
            raise ValueError(f"Unknown membership {role_context!r}")
        active_user, active_membership = pair
        resolved_context = role_context

    return MeResponse(
        users=user_outs,
        role_context=resolved_context,
        active_membership=active_membership,
        active_user=active_user,
    )
