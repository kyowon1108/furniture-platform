"""
S3 Furniture Catalog API endpoints.
Handles furniture catalog metadata and GLB file management via S3.
"""

import json
from typing import List, Optional

import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from app.config import settings


router = APIRouter()


# Pydantic models
class FurnitureDimensions(BaseModel):
    width: float
    height: float
    depth: float


class FurnitureCatalogItem(BaseModel):
    id: str
    name: str
    type: str
    category: str
    dimensions: FurnitureDimensions
    thumbnail: str
    color: str
    price: Optional[float] = None
    tags: List[str]
    mountType: Optional[str] = None  # floor, wall, surface
    glbUrl: Optional[str] = None  # S3 GLB file URL


class CatalogResponse(BaseModel):
    items: List[FurnitureCatalogItem]
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
    # Use default credentials (from ~/.aws/credentials or IAM role)
    return boto3.client('s3', region_name=settings.AWS_REGION)


@router.get("/catalog", response_model=CatalogResponse)
async def get_catalog():
    """Get furniture catalog from S3."""
    try:
        s3 = get_s3_client()

        response = s3.get_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key="catalog/catalog.json"
        )

        catalog_data = json.loads(response['Body'].read().decode('utf-8'))
        items = catalog_data.get('items', [])

        # Generate presigned URLs for GLB files
        for item in items:
            if item.get('glbKey'):
                try:
                    presigned_url = s3.generate_presigned_url(
                        'get_object',
                        Params={
                            'Bucket': settings.S3_BUCKET_NAME,
                            'Key': item['glbKey']
                        },
                        ExpiresIn=3600  # 1 hour
                    )
                    item['glbUrl'] = presigned_url
                except ClientError:
                    item['glbUrl'] = None

        return CatalogResponse(items=items, total=len(items))

    except s3.exceptions.NoSuchKey:
        # Return empty catalog if not exists
        return CatalogResponse(items=[], total=0)
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"S3 error: {str(e)}")


@router.post("/catalog")
async def upload_catalog(items: List[FurnitureCatalogItem]):
    """Upload furniture catalog to S3."""
    try:
        s3 = get_s3_client()

        catalog_data = {
            "items": [item.model_dump() for item in items]
        }

        s3.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key="catalog/catalog.json",
            Body=json.dumps(catalog_data, ensure_ascii=False, indent=2),
            ContentType="application/json"
        )

        return {"message": "Catalog uploaded successfully", "count": len(items)}

    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"S3 error: {str(e)}")


@router.post("/catalog/glb/{item_id}")
async def upload_glb(item_id: str, file: UploadFile = File(...)):
    """Upload GLB file for a furniture item."""
    if not file.filename.endswith('.glb'):
        raise HTTPException(status_code=400, detail="Only GLB files are allowed")

    try:
        s3 = get_s3_client()

        # Upload GLB file
        glb_key = f"catalog/models/{item_id}.glb"

        s3.upload_fileobj(
            file.file,
            settings.S3_BUCKET_NAME,
            glb_key,
            ExtraArgs={'ContentType': 'model/gltf-binary'}
        )

        # Update catalog.json with glbKey
        try:
            response = s3.get_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key="catalog/catalog.json"
            )
            catalog_data = json.loads(response['Body'].read().decode('utf-8'))

            # Find and update item
            for item in catalog_data.get('items', []):
                if item['id'] == item_id:
                    item['glbKey'] = glb_key
                    break

            # Save updated catalog
            s3.put_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key="catalog/catalog.json",
                Body=json.dumps(catalog_data, ensure_ascii=False, indent=2),
                ContentType="application/json"
            )
        except s3.exceptions.NoSuchKey:
            pass  # Catalog doesn't exist yet, that's okay

        # Generate presigned URL for the uploaded file
        presigned_url = s3.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.S3_BUCKET_NAME,
                'Key': glb_key
            },
            ExpiresIn=3600
        )

        return {
            "message": "GLB file uploaded successfully",
            "item_id": item_id,
            "glb_key": glb_key,
            "glb_url": presigned_url
        }

    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"S3 error: {str(e)}")


@router.get("/catalog/glb/{item_id}")
async def get_glb_url(item_id: str):
    """Get presigned URL for a GLB file."""
    try:
        s3 = get_s3_client()
        glb_key = f"catalog/models/{item_id}.glb"

        # Check if file exists
        try:
            s3.head_object(Bucket=settings.S3_BUCKET_NAME, Key=glb_key)
        except ClientError:
            raise HTTPException(status_code=404, detail="GLB file not found")

        presigned_url = s3.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.S3_BUCKET_NAME,
                'Key': glb_key
            },
            ExpiresIn=3600
        )

        return {"item_id": item_id, "glb_url": presigned_url}

    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"S3 error: {str(e)}")


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


@router.post("/catalog/generate-from-glb")
async def generate_catalog_from_glb():
    """Generate catalog.json from existing GLB files in S3."""
    try:
        s3 = get_s3_client()

        # List all GLB files
        response = s3.list_objects_v2(
            Bucket=settings.S3_BUCKET_NAME,
            Prefix="catalog/models/"
        )

        items = []
        for obj in response.get('Contents', []):
            if obj['Key'].endswith('.glb'):
                item_id = obj['Key'].split('/')[-1].replace('.glb', '')

                # Parse item name from id (e.g., "bed_001" -> "Bed 001")
                name_parts = item_id.replace('_', ' ').title()

                # Guess category from name
                category = "decoration"
                item_type = "decoration"
                if "bed" in item_id:
                    category = "bedroom"
                    item_type = "bed"
                elif "chair" in item_id or "lounge" in item_id:
                    category = "living"
                    item_type = "chair"
                elif "table" in item_id or "desk" in item_id:
                    category = "office"
                    item_type = "table"
                elif "sofa" in item_id:
                    category = "living"
                    item_type = "sofa"
                elif "closet" in item_id or "dresser" in item_id or "wardrobe" in item_id:
                    category = "bedroom"
                    item_type = "wardrobe"
                elif "lamp" in item_id:
                    category = "decoration"
                    item_type = "desk-lamp"
                elif "tv" in item_id:
                    category = "living"
                    item_type = "wall-tv"
                elif "fridge" in item_id or "kitchen" in item_id or "microwave" in item_id or "dish" in item_id or "coffee" in item_id:
                    category = "kitchen"
                    item_type = "table"
                elif "shelf" in item_id:
                    category = "office"
                    item_type = "shelf"
                elif "washing" in item_id or "bathroom" in item_id:
                    category = "kitchen"
                    item_type = "decoration"

                # Generate presigned URL
                presigned_url = s3.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': settings.S3_BUCKET_NAME,
                        'Key': obj['Key']
                    },
                    ExpiresIn=3600
                )

                items.append({
                    "id": item_id,
                    "name": name_parts,
                    "type": item_type,
                    "category": category,
                    "dimensions": {"width": 1.0, "height": 1.0, "depth": 1.0},
                    "thumbnail": f"/furniture/{item_id}.png",
                    "color": "#8B4513",
                    "price": 100,
                    "tags": [item_id.split('_')[0], category],
                    "mountType": "floor",
                    "glbKey": obj['Key'],
                    "glbUrl": presigned_url
                })

        # Save to S3
        catalog_data = {"items": items}
        s3.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key="catalog/catalog.json",
            Body=json.dumps(catalog_data, ensure_ascii=False, indent=2),
            ContentType="application/json"
        )

        return {
            "message": "Catalog generated successfully",
            "total": len(items),
            "items": items
        }

    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"S3 error: {str(e)}")
