"""Shared serialization helpers for API schemas."""

from __future__ import annotations

from decimal import Decimal
from typing import Any


def money_str(value: Decimal | None) -> str | None:
    if value is None:
        return None
    return f"{value:.2f}"


def parse_money(value: Any) -> Decimal:
    """Accept a number or numeric string for field corrections."""
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    if isinstance(value, str):
        return Decimal(value.strip())
    raise ValueError("value must be a number or numeric string")
