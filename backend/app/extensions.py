"""Flask extension singletons, initialised in the app factory."""

from __future__ import annotations

from flask_sqlalchemy import SQLAlchemy

from .models.base import Base

db = SQLAlchemy(model_class=Base)
