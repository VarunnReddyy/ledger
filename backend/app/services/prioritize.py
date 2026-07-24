"""Task priority scoring for the staff dashboard.

Formula (persisted on ``Task.priority_score``):

    score = priority_weight
          + days_overdue * 8
          + (20 if this task blocks another task)
          - (15 if status is blocked)

Priority weights: critical=100, high=60, normal=30, low=10.

``days_overdue`` is ``max(0, (as_of - due_date).days)`` when a due date is
set, otherwise 0. A task "blocks another" when at least one other task has
``blocked_by_id`` pointing at it.
"""

from __future__ import annotations

from datetime import date
from typing import Sequence

from ..enums import TaskPriority, TaskStatus
from ..models.collaboration import Task

PRIORITY_WEIGHTS: dict[TaskPriority, int] = {
    TaskPriority.CRITICAL: 100,
    TaskPriority.HIGH: 60,
    TaskPriority.NORMAL: 30,
    TaskPriority.LOW: 10,
}


def days_overdue(due_date: date | None, as_of: date) -> int:
    if due_date is None:
        return 0
    delta = (as_of - due_date).days
    return delta if delta > 0 else 0


def compute_priority_score(
    priority: TaskPriority,
    status: TaskStatus,
    due_date: date | None,
    *,
    is_blocking: bool,
    as_of: date,
) -> float:
    """Compute a single task's dashboard ranking score."""
    score = float(PRIORITY_WEIGHTS[priority])
    score += days_overdue(due_date, as_of) * 8
    if is_blocking:
        score += 20
    if status is TaskStatus.BLOCKED:
        score -= 15
    return score


def score_tasks(tasks: Sequence[Task], *, as_of: date) -> None:
    """Set ``priority_score`` on every task in ``tasks`` in place."""
    blocking_ids = {t.blocked_by_id for t in tasks if t.blocked_by_id is not None}
    for task in tasks:
        task.priority_score = compute_priority_score(
            task.priority,
            task.status,
            task.due_date,
            is_blocking=task.id in blocking_ids,
            as_of=as_of,
        )
