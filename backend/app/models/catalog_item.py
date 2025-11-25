"""CatalogItem model for furniture catalog from S3."""

from sqlalchemy import Column, DateTime, Float, Integer, String, JSON
from sqlalchemy.sql import func

from app.database import Base


class CatalogItem(Base):
    """Furniture catalog item synced from S3."""

    __tablename__ = "catalog_items"

    id = Column(String, primary_key=True, index=True)  # e.g., "bed-001"
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # bed, chair, desk, etc.
    category = Column(String, nullable=False)  # bedroom, office, living, etc.

    # Dimensions
    width = Column(Float, nullable=False, default=1.0)
    height = Column(Float, nullable=False, default=1.0)
    depth = Column(Float, nullable=False, default=1.0)

    # Display
    thumbnail = Column(String, nullable=True)
    color = Column(String, nullable=False, default="#8B4513")
    price = Column(Integer, nullable=True)

    # Tags stored as JSON array
    tags = Column(JSON, nullable=False, default=list)

    # Mount type: floor, wall, surface
    mount_type = Column(String, nullable=True, default="floor")

    # S3 reference
    glb_key = Column(String, nullable=True)  # S3 key path

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def to_dict(self, glb_url: str = None):
        """Convert to dictionary for API response."""
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "category": self.category,
            "dimensions": {
                "width": self.width,
                "height": self.height,
                "depth": self.depth,
            },
            "thumbnail": self.thumbnail,
            "color": self.color,
            "price": self.price,
            "tags": self.tags or [],
            "mountType": self.mount_type,
            "glbKey": self.glb_key,
            "glbUrl": glb_url,
        }
