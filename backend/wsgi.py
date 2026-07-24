"""Gunicorn / `flask run` entrypoint."""

from __future__ import annotations

from dotenv import load_dotenv

load_dotenv()

from app import create_app  # noqa: E402

app = create_app()
