"""Firm-wide overview aggregates for staff dashboards."""

from __future__ import annotations

from collections import defaultdict
from datetime import date

from sqlalchemy import func, select

from ..enums import ReturnStatus, Role, TaskStatus
from ..extensions import db
from ..models import Membership, Task, TaxReturn, User
from ..schemas.firm import FirmOverview, ReturnsByStatusItem, StaffLoadItem
from .prioritize import days_overdue

_OPEN_TASK_STATUSES = (
    TaskStatus.OPEN,
    TaskStatus.IN_PROGRESS,
    TaskStatus.BLOCKED,
)

_AWAITING_CLIENT_STATUSES = (
    ReturnStatus.DOCS_REQUESTED,
    ReturnStatus.CLIENT_APPROVAL,
)


class FirmAccessDenied(Exception):
    """Raised when a non-firm membership requests firm-scoped data."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def get_overview(*, role: Role, user_id: str, as_of: date | None = None) -> FirmOverview:
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

    if not role.is_firm_side:
        raise FirmAccessDenied("Firm overview is available to firm staff only.")

    today = as_of if as_of is not None else date.today()

    status_counts = {
        row.status: int(row.count)
        for row in db.session.execute(
            select(TaxReturn.status, func.count(TaxReturn.id).label("count")).group_by(
                TaxReturn.status
            )
        ).all()
    }
    returns_by_status = [
        ReturnsByStatusItem(
            status=status,
            staff_label=status.staff_label,
            count=status_counts.get(status, 0),
        )
        for status in ReturnStatus
    ]

    awaiting_client = sum(
        status_counts.get(status, 0) for status in _AWAITING_CLIENT_STATUSES
    )

    open_tasks = db.session.scalars(
        select(Task).where(Task.status.in_(_OPEN_TASK_STATUSES))
    ).all()

    overdue_tasks = sum(
        1 for task in open_tasks if days_overdue(task.due_date, today) > 0
    )
    blocked_tasks = sum(1 for task in open_tasks if task.status is TaskStatus.BLOCKED)

    load: dict[str, dict[str, int]] = defaultdict(
        lambda: {"open_tasks": 0, "overdue": 0}
    )
    for task in open_tasks:
        if task.owner_user_id is None or not task.owner_role.is_firm_side:
            continue
        bucket = load[task.owner_user_id]
        bucket["open_tasks"] += 1
        if days_overdue(task.due_date, today) > 0:
            bucket["overdue"] += 1

    staff_ids = list(load.keys())
    names = {
        row.id: row.name
        for row in db.session.scalars(select(User).where(User.id.in_(staff_ids))).all()
    } if staff_ids else {}

    staff_load = [
        StaffLoadItem(
            user_id=user_id_key,
            name=names.get(user_id_key, user_id_key),
            open_tasks=counts["open_tasks"],
            overdue=counts["overdue"],
        )
        for user_id_key, counts in load.items()
    ]
    staff_load.sort(key=lambda item: (-item.open_tasks, item.name, item.user_id))

    return FirmOverview(
        returns_by_status=returns_by_status,
        overdue_tasks=overdue_tasks,
        blocked_tasks=blocked_tasks,
        awaiting_client=awaiting_client,
        staff_load=staff_load,
    )
