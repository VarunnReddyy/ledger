"""Identity / role-switcher response schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from ..enums import EntityType, Role


class MembershipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    role: Role
    client_id: str | None
    label: str
    client_name: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    initials: str
    title: str | None
    memberships: list[MembershipOut]


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    display_name: str
    entity_type: EntityType
    primary_contact_id: str | None


class MeResponse(BaseModel):
    users: list[UserOut]
    role_context: str | None
    active_membership: MembershipOut | None
    active_user: UserOut | None
