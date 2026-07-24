"""Client list services."""

from __future__ import annotations

from sqlalchemy import select

from ..extensions import db
from ..models import Client
from ..schemas.clients import ClientListItem


def list_clients() -> list[ClientListItem]:
    clients = db.session.scalars(
        select(Client).order_by(Client.display_name.asc(), Client.id.asc())
    ).all()
    return [
        ClientListItem(
            id=client.id,
            display_name=client.display_name,
            entity_type=client.entity_type,
        )
        for client in clients
    ]
