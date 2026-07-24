"""Application configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass, field


def _env(key: str, default: str) -> str:
    return os.environ.get(key, default)


def _database_url() -> str:
    """Normalize DATABASE_URL for SQLAlchemy + psycopg3.

    Hosted Postgres (Render, Heroku) often injects ``postgres://`` or
    ``postgresql://``. This app uses the ``psycopg`` driver, so the URI must
    include ``+psycopg``.
    """
    url = _env(
        "DATABASE_URL",
        "postgresql+psycopg://ledger:ledger@localhost:5432/ledger",
    )
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url.removeprefix("postgres://")
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url.removeprefix("postgresql://")
    return url


@dataclass(frozen=True)
class Config:
    """Runtime configuration, read once at startup."""

    SECRET_KEY: str = field(default_factory=lambda: _env("SECRET_KEY", "dev-only"))
    SQLALCHEMY_DATABASE_URI: str = field(default_factory=_database_url)
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False

    # "stub" | "live" — see AGENTS.md section 9. The demo must be fully
    # functional in stub mode with no key and no network.
    AI_MODE: str = field(default_factory=lambda: _env("AI_MODE", "stub"))
    ANTHROPIC_API_KEY: str = field(
        default_factory=lambda: _env("ANTHROPIC_API_KEY", "")
    )
    AI_MODEL: str = field(default_factory=lambda: _env("AI_MODEL", "claude-sonnet-4-6"))

    # Fixed seed keeps the fabricated dataset byte-identical across rebuilds, so
    # a deep link recorded in the walkthrough video still resolves later.
    SEED: int = field(default_factory=lambda: int(_env("SEED", "20260723")))

    @property
    def ai_is_live(self) -> bool:
        return self.AI_MODE == "live" and bool(self.ANTHROPIC_API_KEY)
