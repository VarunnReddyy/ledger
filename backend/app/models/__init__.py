"""SQLAlchemy models.

Import order matters only for `Base.metadata` registration; every model module
is imported here so `create_all` sees the full schema.
"""

from .ai import AiAnnotation, AiCorrection
from .base import Base, TimestampMixin, utcnow
from .collaboration import Message, Request, Task, Thread, ThreadLink
from .documents import Document, DocumentPage
from .identity import Client, Membership, User
from .provenance import Provenance, Transform, TransformInput
from .returns import ReturnField, ReturnSection, TaxReturn

__all__ = [
    "AiAnnotation",
    "AiCorrection",
    "Base",
    "Client",
    "Document",
    "DocumentPage",
    "Membership",
    "Message",
    "Provenance",
    "Request",
    "ReturnField",
    "ReturnSection",
    "Task",
    "TaxReturn",
    "Thread",
    "ThreadLink",
    "TimestampMixin",
    "Transform",
    "TransformInput",
    "User",
    "utcnow",
]
