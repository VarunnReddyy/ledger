"""Request fulfillment response schemas."""

from __future__ import annotations

from pydantic import BaseModel

from ..enums import ReturnStatus
from .documents import DocumentListItem
from .threads import RequestOut


class FulfillmentResult(BaseModel):
    request: RequestOut
    document: DocumentListItem
    return_status: ReturnStatus
