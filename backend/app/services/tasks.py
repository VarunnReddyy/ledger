"""Task listing with role-scoped visibility."""

from __future__ import annotations

from sqlalchemy import select

from ..enums import Role
from ..extensions import db
from ..models import Client, Membership, Task, TaxReturn, User
from ..schemas.tasks import TaskListItem


def list_tasks(*, role: Role, user_id: str) -> list[TaskListItem]:
    user = db.session.get(User, user_id)
    if user is None:
        raise ValueError(f"Unknown user {user_id!r}")

    membership = db.session.scalars(
        select(Membership).where(
            Membership.user_id == user_id,
            Membership.role == role,
        )
    ).first()
    if membership is None:
        raise ValueError(f"User {user_id!r} has no membership for role {role.value!r}")

    stmt = (
        select(Task, TaxReturn, Client)
        .join(TaxReturn, Task.return_id == TaxReturn.id)
        .join(Client, TaxReturn.client_id == Client.id)
        .order_by(Task.priority_score.desc(), Task.id.asc())
    )

    if not role.is_firm_side:
        if membership.client_id is None:
            raise ValueError(
                f"Client-side role {role.value!r} requires a client-scoped membership"
            )
        client_side_roles = [r for r in Role if not r.is_firm_side]
        stmt = stmt.where(
            Task.owner_role.in_(client_side_roles),
            TaxReturn.client_id == membership.client_id,
        )

    rows = db.session.execute(stmt).all()
    return [
        TaskListItem(
            id=task.id,
            return_id=task.return_id,
            return_tax_year=tax_return.tax_year,
            return_form_type=tax_return.form_type,
            client_id=client.id,
            client_name=client.display_name,
            title=task.title,
            detail=task.detail,
            status=task.status,
            priority=task.priority,
            owner_role=task.owner_role,
            owner_user_id=task.owner_user_id,
            due_date=task.due_date,
            blocked_by_id=task.blocked_by_id,
            priority_score=task.priority_score,
        )
        for task, tax_return, client in rows
    ]
