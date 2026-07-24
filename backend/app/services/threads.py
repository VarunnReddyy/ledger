"""Thread serialization helpers shared by return and document detail views."""

from __future__ import annotations

import secrets

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..enums import LinkTarget, Role, Visibility
from ..extensions import db
from ..models import Message, Thread, ThreadLink, User
from ..schemas.threads import (
    MessageCreateRequest,
    MessageOut,
    RequestOut,
    ThreadLinkOut,
    ThreadOut,
)
from . import access as access_service


class ThreadAccessDenied(Exception):
    """Raised when a membership cannot post to (or see) a thread."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def serialize_message(message: Message) -> MessageOut:
    author_name = message.author.name if message.author is not None else ""
    return MessageOut(
        id=message.id,
        author_id=message.author_id,
        author_name=author_name,
        body=message.body,
        visibility=message.visibility,
        created_at=message.created_at,
    )


def serialize_thread(thread: Thread, *, include_internal: bool = True) -> ThreadOut:
    messages: list[MessageOut] = []
    for message in thread.messages:
        if not include_internal and message.visibility is Visibility.INTERNAL:
            continue
        messages.append(serialize_message(message))

    requests: list[RequestOut] = []
    for req in thread.requests:
        requests.append(
            RequestOut(
                id=req.id,
                label=req.label,
                status=req.status,
                owner_user_id=req.owner_user_id,
                due_date=req.due_date.isoformat() if req.due_date is not None else None,
                fulfilled_by_document_id=req.fulfilled_by_document_id,
            )
        )

    return ThreadOut(
        id=thread.id,
        subject=thread.subject,
        visibility=thread.visibility,
        resolved_at=thread.resolved_at,
        awaiting_role=thread.awaiting_role,
        awaiting_user_id=thread.awaiting_user_id,
        is_resolved=thread.is_resolved,
        links=[
            ThreadLinkOut(
                id=link.id,
                target_type=link.target_type,
                target_id=link.target_id,
            )
            for link in thread.links
        ],
        messages=messages,
        requests=requests,
    )


def load_threads_for_targets(
    targets: list[tuple[LinkTarget, str]],
    *,
    include_internal: bool = True,
) -> list[ThreadOut]:
    if not targets:
        return []

    target_ids = {target_id for _, target_id in targets}
    target_types = {target_type for target_type, _ in targets}

    stmt = (
        select(Thread)
        .join(ThreadLink, ThreadLink.thread_id == Thread.id)
        .where(
            ThreadLink.target_type.in_(target_types),
            ThreadLink.target_id.in_(target_ids),
        )
        .options(
            selectinload(Thread.links),
            selectinload(Thread.messages).selectinload(Message.author),
            selectinload(Thread.requests),
            selectinload(Thread.awaiting_user),
        )
        .order_by(Thread.created_at.asc())
    )
    threads = list(db.session.scalars(stmt).unique().all())

    wanted = set(targets)
    result: list[ThreadOut] = []
    seen: set[str] = set()
    for thread in threads:
        if not include_internal and thread.visibility is Visibility.INTERNAL:
            continue
        if not any(
            (link.target_type, link.target_id) in wanted for link in thread.links
        ):
            continue
        if thread.id in seen:
            continue
        seen.add(thread.id)
        result.append(serialize_thread(thread, include_internal=include_internal))
    return result


def get_thread(
    thread_id: str, *, include_internal: bool = True
) -> ThreadOut | None:
    thread = _load_thread(thread_id)
    if thread is None:
        return None
    if not include_internal and thread.visibility is Visibility.INTERNAL:
        return None
    return serialize_thread(thread, include_internal=include_internal)


def post_message(
    thread_id: str,
    body: MessageCreateRequest,
    *,
    role: Role,
    user_id: str,
) -> MessageOut:
    """Create a message with server-side visibility enforcement.

    Client memberships cannot see or post to internal threads, and cannot mark
    a message internal even on a client-visible thread.
    """
    include_internal = access_service.include_internal_messages(
        role=role, user_id=user_id
    )

    thread = _load_thread(thread_id)
    if thread is None:
        raise LookupError(thread_id)
    if not include_internal and thread.visibility is Visibility.INTERNAL:
        raise LookupError(thread_id)

    visibility = body.visibility
    if thread.visibility is Visibility.INTERNAL:
        visibility = Visibility.INTERNAL
    elif not include_internal:
        if visibility is Visibility.INTERNAL:
            raise ThreadAccessDenied(
                "Client memberships can only post client-visible messages."
            )
        visibility = Visibility.CLIENT_VISIBLE

    author = db.session.get(User, user_id)
    if author is None:
        raise ValueError(f"Unknown user {user_id!r}")

    text = body.body.strip()
    if not text:
        raise ValueError("Message body is required")

    message = Message(
        id=f"msg_{secrets.token_hex(4)}",
        thread_id=thread.id,
        author_id=user_id,
        body=text,
        visibility=visibility,
    )
    db.session.add(message)
    db.session.commit()
    db.session.refresh(message)
    # Ensure author is available for serialization after refresh.
    _ = message.author
    return serialize_message(message)


def _load_thread(thread_id: str) -> Thread | None:
    return db.session.scalars(
        select(Thread)
        .where(Thread.id == thread_id)
        .options(
            selectinload(Thread.links),
            selectinload(Thread.messages).selectinload(Message.author),
            selectinload(Thread.requests),
        )
    ).first()
