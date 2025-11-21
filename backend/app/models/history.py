"""History model for tracking layout changes."""

from app.database import Base
from app.models.layout import JSONEncodedDict
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class History(Base):
    """History table for tracking furniture state changes."""

    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    layout_id = Column(Integer, ForeignKey("layouts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    change_type = Column(String, nullable=False)  # 'add', 'move', 'delete', 'update'
    before_state = Column(JSONEncodedDict, nullable=True)
    after_state = Column(JSONEncodedDict, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    layout = relationship("Layout", back_populates="history_entries")
    user = relationship("User", back_populates="history_entries")
