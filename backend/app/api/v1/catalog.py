"""
S3 Furniture Catalog API endpoints.
Handles furniture catalog metadata via DB and GLB file management via S3.

Flow:
- Server startup: Sync S3 GLB files -> DB
- API requests: Read from DB, generate presigned URLs on demand
"""

from typing import List, Optional

import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db, SessionLocal
from app.models.catalog_item import CatalogItem


router = APIRouter()


# Pydantic models
class FurnitureDimensions(BaseModel):
    width: float
    height: float
    depth: float


class FurnitureCatalogItemSchema(BaseModel):
    id: str
    name: str
    type: str
    category: str
    dimensions: FurnitureDimensions
    thumbnail: str
    color: str
    price: Optional[int] = None
    tags: List[str]
    mountType: Optional[str] = None
    glbUrl: Optional[str] = None
    glbKey: Optional[str] = None


class CatalogResponse(BaseModel):
    items: List[FurnitureCatalogItemSchema]
    total: int


def get_s3_client():
    """Create S3 client with credentials."""
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        return boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
    return boto3.client('s3', region_name=settings.AWS_REGION)


def generate_presigned_url(s3_client, glb_key: str) -> Optional[str]:
    """Generate presigned URL for a GLB file."""
    if not glb_key:
        return None
    try:
        return s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.S3_BUCKET_NAME,
                'Key': glb_key
            },
            ExpiresIn=3600  # 1 hour
        )
    except ClientError:
        return None


def sync_catalog_from_s3():
    """
    Sync GLB files from S3 to database.
    Called on server startup.
    """
    print("🔄 Syncing catalog from S3...")

    try:
        s3 = get_s3_client()
        db = SessionLocal()

        # List all GLB files in S3
        response = s3.list_objects_v2(
            Bucket=settings.S3_BUCKET_NAME,
            Prefix="catalog/models/"
        )

        s3_items = {}
        for obj in response.get('Contents', []):
            if obj['Key'].endswith('.glb'):
                item_id = obj['Key'].split('/')[-1].replace('.glb', '')
                s3_items[item_id] = obj['Key']

        print(f"📦 Found {len(s3_items)} GLB files in S3")

        # Get existing items from DB
        existing_items = {item.id: item for item in db.query(CatalogItem).all()}
        print(f"📋 Found {len(existing_items)} items in DB")

        added = 0
        updated = 0

        for item_id, glb_key in s3_items.items():
            if item_id in existing_items:
                # Update glb_key if changed
                if existing_items[item_id].glb_key != glb_key:
                    existing_items[item_id].glb_key = glb_key
                    updated += 1
            else:
                # Create new item
                name_parts = item_id.replace('_', ' ').title()

                # Guess category from name
                category = "decoration"
                item_type = "decoration"
                if "bed" in item_id.lower():
                    category = "bedroom"
                    item_type = "bed"
                elif "chair" in item_id.lower() or "lounge" in item_id.lower():
                    category = "living"
                    item_type = "chair"
                elif "table" in item_id.lower() or "desk" in item_id.lower():
                    category = "office"
                    item_type = "table"
                elif "sofa" in item_id.lower():
                    category = "living"
                    item_type = "sofa"
                elif "closet" in item_id.lower() or "dresser" in item_id.lower() or "wardrobe" in item_id.lower():
                    category = "bedroom"
                    item_type = "wardrobe"
                elif "lamp" in item_id.lower():
                    category = "decoration"
                    item_type = "desk-lamp"
                elif "tv" in item_id.lower():
                    category = "living"
                    item_type = "wall-tv"
                elif "fridge" in item_id.lower() or "kitchen" in item_id.lower():
                    category = "kitchen"
                    item_type = "table"
                elif "shelf" in item_id.lower():
                    category = "office"
                    item_type = "shelf"

                new_item = CatalogItem(
                    id=item_id,
                    name=name_parts,
                    type=item_type,
                    category=category,
                    width=1.0,
                    height=1.0,
                    depth=1.0,
                    thumbnail=f"/furniture/{item_id}.png",
                    color="#8B4513",
                    price=100000,
                    tags=[item_type, category],
                    mount_type="floor",
                    glb_key=glb_key,
                )
                db.add(new_item)
                added += 1

        db.commit()
        print(f"✅ Catalog sync complete: {added} added, {updated} updated")

    except ClientError as e:
        print(f"❌ S3 error during sync: {e}")
    except Exception as e:
        print(f"❌ Error during catalog sync: {e}")
    finally:
        db.close()


@router.get("/catalog", response_model=CatalogResponse)
async def get_catalog(db: Session = Depends(get_db)):
    """Get furniture catalog from DB with presigned URLs."""
    try:
        s3 = get_s3_client()
        items = db.query(CatalogItem).all()

        result = []
        for item in items:
            glb_url = generate_presigned_url(s3, item.glb_key)
            result.append(FurnitureCatalogItemSchema(
                id=item.id,
                name=item.name,
                type=item.type,
                category=item.category,
                dimensions=FurnitureDimensions(
                    width=item.width,
                    height=item.height,
                    depth=item.depth
                ),
                thumbnail=item.thumbnail or "",
                color=item.color,
                price=item.price,
                tags=item.tags or [],
                mountType=item.mount_type,
                glbUrl=glb_url,
                glbKey=item.glb_key,
            ))

        return CatalogResponse(items=result, total=len(result))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/catalog/sync")
async def sync_catalog():
    """Manually trigger S3 to DB sync."""
    sync_catalog_from_s3()
    return {"message": "Catalog synced from S3"}


@router.get("/catalog/{item_id}")
async def get_catalog_item(item_id: str, db: Session = Depends(get_db)):
    """Get a single catalog item."""
    item = db.query(CatalogItem).filter(CatalogItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    s3 = get_s3_client()
    glb_url = generate_presigned_url(s3, item.glb_key)

    return item.to_dict(glb_url)


@router.put("/catalog/{item_id}")
async def update_catalog_item(
    item_id: str,
    name: Optional[str] = None,
    category: Optional[str] = None,
    item_type: Optional[str] = None,
    width: Optional[float] = None,
    height: Optional[float] = None,
    depth: Optional[float] = None,
    price: Optional[int] = None,
    color: Optional[str] = None,
    mount_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update catalog item metadata."""
    item = db.query(CatalogItem).filter(CatalogItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if name is not None:
        item.name = name
    if category is not None:
        item.category = category
    if item_type is not None:
        item.type = item_type
    if width is not None:
        item.width = width
    if height is not None:
        item.height = height
    if depth is not None:
        item.depth = depth
    if price is not None:
        item.price = price
    if color is not None:
        item.color = color
    if mount_type is not None:
        item.mount_type = mount_type

    db.commit()
    db.refresh(item)

    s3 = get_s3_client()
    glb_url = generate_presigned_url(s3, item.glb_key)

    return item.to_dict(glb_url)


@router.delete("/catalog/{item_id}")
async def delete_catalog_item(item_id: str, db: Session = Depends(get_db)):
    """Delete catalog item from DB (does not delete S3 file)."""
    item = db.query(CatalogItem).filter(CatalogItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()

    return {"message": f"Item {item_id} deleted"}


@router.post("/catalog/glb/{item_id}")
async def upload_glb(
    item_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload GLB file for a furniture item."""
    if not file.filename.endswith('.glb'):
        raise HTTPException(status_code=400, detail="Only GLB files are allowed")

    try:
        s3 = get_s3_client()
        glb_key = f"catalog/models/{item_id}.glb"

        # Upload to S3
        s3.upload_fileobj(
            file.file,
            settings.S3_BUCKET_NAME,
            glb_key,
            ExtraArgs={'ContentType': 'model/gltf-binary'}
        )

        # Update or create DB record
        item = db.query(CatalogItem).filter(CatalogItem.id == item_id).first()
        if item:
            item.glb_key = glb_key
        else:
            # Create new item
            name_parts = item_id.replace('_', ' ').title()
            item = CatalogItem(
                id=item_id,
                name=name_parts,
                type="decoration",
                category="decoration",
                glb_key=glb_key,
            )
            db.add(item)

        db.commit()

        presigned_url = generate_presigned_url(s3, glb_key)

        return {
            "message": "GLB file uploaded successfully",
            "item_id": item_id,
            "glb_key": glb_key,
            "glb_url": presigned_url
        }

    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"S3 error: {str(e)}")


@router.get("/catalog/glb/{item_id}")
async def get_glb_url(item_id: str, db: Session = Depends(get_db)):
    """Get presigned URL for a GLB file."""
    item = db.query(CatalogItem).filter(CatalogItem.id == item_id).first()
    if not item or not item.glb_key:
        raise HTTPException(status_code=404, detail="GLB file not found")

    s3 = get_s3_client()
    presigned_url = generate_presigned_url(s3, item.glb_key)

    return {"item_id": item_id, "glb_url": presigned_url}


@router.get("/catalog/list-glb")
async def list_glb_files():
    """List all GLB files in S3."""
    try:
        s3 = get_s3_client()

        response = s3.list_objects_v2(
            Bucket=settings.S3_BUCKET_NAME,
            Prefix="catalog/models/"
        )

        files = []
        for obj in response.get('Contents', []):
            if obj['Key'].endswith('.glb'):
                item_id = obj['Key'].split('/')[-1].replace('.glb', '')
                files.append({
                    "item_id": item_id,
                    "key": obj['Key'],
                    "size": obj['Size'],
                    "last_modified": obj['LastModified'].isoformat()
                })

        return {"files": files, "total": len(files)}

    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"S3 error: {str(e)}")
