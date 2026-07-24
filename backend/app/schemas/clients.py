"""Client list schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ..enums import EntityType


class ClientListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    display_name: str
    entity_type: EntityType
