"""Pydantic v2 API schemas — the single source of response truth."""

from __future__ import annotations

from .ai import (
    AiAnnotationOut,
    AiCorrectionOut,
    FieldCorrectRequest,
    TraceAnnotationOut,
)
from .documents import (
    DocumentDetail,
    DocumentListItem,
    DocumentListResponse,
    DocumentPageOut,
    DocumentProvenanceOut,
)
from .fields import (
    FieldCorrectResponse,
    FieldTrace,
    FieldVerifyResponse,
    TraceFieldSummary,
    TraceProvenanceOut,
    TraceTransformOut,
)
from .me import ClientOut, MeResponse, MembershipOut, UserOut
from .returns import (
    ClientNextStepOut,
    ReturnDetail,
    ReturnFieldOut,
    ReturnListItem,
    ReturnSectionOut,
)
from .tasks import TaskListItem
from .threads import (
    MessageCreateRequest,
    MessageOut,
    RequestOut,
    ThreadLinkOut,
    ThreadOut,
)

__all__ = [
    "AiAnnotationOut",
    "AiCorrectionOut",
    "ClientNextStepOut",
    "ClientOut",
    "DocumentDetail",
    "DocumentListItem",
    "DocumentListResponse",
    "DocumentPageOut",
    "DocumentProvenanceOut",
    "FieldCorrectRequest",
    "FieldCorrectResponse",
    "FieldTrace",
    "FieldVerifyResponse",
    "MeResponse",
    "MembershipOut",
    "MessageCreateRequest",
    "MessageOut",
    "RequestOut",
    "ReturnDetail",
    "ReturnFieldOut",
    "ReturnListItem",
    "ReturnSectionOut",
    "TaskListItem",
    "ThreadLinkOut",
    "ThreadOut",
    "TraceAnnotationOut",
    "TraceFieldSummary",
    "TraceProvenanceOut",
    "TraceTransformOut",
    "UserOut",
]
