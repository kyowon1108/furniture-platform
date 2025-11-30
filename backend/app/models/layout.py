"""Layout model with JSON storage for furniture state."""

import json

from app.database import Base
from sqlalchemy import (
    TEXT,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    TypeDecorator,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class JSONEncodedDict(TypeDecorator):
    """
    Custom SQLAlchemy type for storing dictionaries as JSON text.
    Compatible with all database backends.
    """

    impl = TEXT
    cache_ok = True

    def process_bind_param(self, value, dialect):
        """Convert dict to JSON string when saving to database."""
        if value is not None:
            return json.dumps(value)
        return None

    def process_result_value(self, value, dialect):
        """Convert JSON string to dict when loading from database."""
        if value is not None:
            return json.loads(value)
        return None


class Layout(Base):
    """Layout table storing furniture arrangements."""

    __tablename__ = "layouts"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, nullable=False)
    furniture_state = Column(JSONEncodedDict, nullable=False)
    is_current = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Free Build Mode tile state
    # Stores textures and depth maps applied to tiles
    # Format: {"textures": {...}, "depthMaps": {...}, "displacementScales": {...}}
    tile_state = Column(JSONEncodedDict, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="layouts")
    history_entries = relationship("History", back_populates="layout", cascade="all, delete-orphan")
