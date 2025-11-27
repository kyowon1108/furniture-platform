"""Project model for room configurations."""

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Project(Base):
    """Project table storing room configurations."""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    room_width = Column(Float, nullable=False)
    room_height = Column(Float, nullable=False)
    room_depth = Column(Float, nullable=False)
    is_shared = Column(Boolean, default=False, nullable=False)

    # 3D file support (PLY or GLB)
    has_3d_file = Column(Boolean, default=False, nullable=False)
    file_type = Column(String, nullable=True)  # 'ply' or 'glb'
    file_path = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)  # bytes

    # Legacy PLY support (for backward compatibility)
    has_ply_file = Column(Boolean, default=False, nullable=False)
    ply_file_path = Column(String, nullable=True)
    ply_file_size = Column(Integer, nullable=True)  # bytes

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="projects")
    layouts = relationship("Layout", back_populates="project", cascade="all, delete-orphan")
