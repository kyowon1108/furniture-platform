#!/usr/bin/env python3
"""
GLB 파일 분리 스크립트
여러 오브젝트가 포함된 GLB 파일을 개별 GLB 파일로 분리하여 S3에 업로드합니다.

사용법:
    python scripts/split_glb.py <glb_file> [--prefix PREFIX] [--category CATEGORY]

예시:
    python scripts/split_glb.py models/tv_models.glb --prefix tv --category living
"""

import argparse
import json
import os
import sys
import tempfile

# 프로젝트 루트를 path에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import boto3
import trimesh


def get_s3_client():
    """S3 클라이언트 생성"""
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        return boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
    return boto3.client('s3', region_name=settings.AWS_REGION)


def guess_item_type(name: str) -> str:
    """이름에서 가구 타입 추론"""
    name_lower = name.lower()
    if "bed" in name_lower:
        return "bed"
    elif "chair" in name_lower or "seat" in name_lower:
        return "chair"
    elif "table" in name_lower or "desk" in name_lower:
        return "table"
    elif "sofa" in name_lower or "couch" in name_lower:
        return "sofa"
    elif "tv" in name_lower or "monitor" in name_lower or "screen" in name_lower:
        return "wall-tv"
    elif "lamp" in name_lower or "light" in name_lower:
        return "desk-lamp"
    elif "shelf" in name_lower or "cabinet" in name_lower:
        return "shelf"
    elif "wardrobe" in name_lower or "closet" in name_lower:
        return "wardrobe"
    return "decoration"


def split_glb(glb_path: str, prefix: str = "item", category: str = "decoration"):
    """GLB 파일을 분리하여 S3에 업로드"""

    if not os.path.exists(glb_path):
        print(f"❌ 파일을 찾을 수 없습니다: {glb_path}")
        return

    print(f"📂 GLB 파일 로딩: {glb_path}")
    scene = trimesh.load(glb_path, force='scene')

    s3 = get_s3_client()
    split_items = []

    if isinstance(scene, trimesh.Scene):
        geometries = dict(scene.geometry)
        print(f"🔍 {len(geometries)}개의 지오메트리 발견")

        if len(geometries) == 0:
            print("❌ GLB 파일에 지오메트리가 없습니다")
            return

        for idx, (name, geometry) in enumerate(geometries.items()):
            if not isinstance(geometry, trimesh.Trimesh):
                print(f"  ⏭️ {name}: Trimesh가 아님, 건너뜀")
                continue

            # ID 생성
            clean_name = name.replace(' ', '_').replace('.', '_').lower()
            # 특수문자 제거
            clean_name = ''.join(c for c in clean_name if c.isalnum() or c == '_')
            item_id = f"{prefix}_{clean_name}_{idx:03d}"

            print(f"  📦 처리 중: {name} -> {item_id}")

            # 개별 GLB로 내보내기
            single_scene = trimesh.Scene()
            single_scene.add_geometry(geometry, node_name=name)

            with tempfile.NamedTemporaryFile(delete=False, suffix='.glb') as tmp_file:
                single_scene.export(tmp_file.name, file_type='glb')
                tmp_path = tmp_file.name

            # S3 업로드
            glb_key = f"catalog/models/{item_id}.glb"
            with open(tmp_path, 'rb') as f:
                s3.upload_fileobj(
                    f,
                    settings.S3_BUCKET_NAME,
                    glb_key,
                    ExtraArgs={'ContentType': 'model/gltf-binary'}
                )
            os.unlink(tmp_path)

            # 바운딩 박스에서 크기 계산
            bounds = geometry.bounding_box.bounds
            dimensions = {
                "width": round(float(bounds[1][0] - bounds[0][0]), 2),
                "height": round(float(bounds[1][1] - bounds[0][1]), 2),
                "depth": round(float(bounds[1][2] - bounds[0][2]), 2)
            }

            item_type = guess_item_type(name)

            split_items.append({
                "id": item_id,
                "name": name.replace('_', ' ').title(),
                "type": item_type,
                "category": category,
                "dimensions": dimensions,
                "thumbnail": f"/furniture/{item_id}.png",
                "color": "#8B4513",
                "price": 100,
                "tags": [prefix, category, item_type],
                "mountType": "floor",
                "glbKey": glb_key
            })

            print(f"    ✅ 업로드 완료: s3://{settings.S3_BUCKET_NAME}/{glb_key}")
            print(f"       크기: {dimensions['width']}m x {dimensions['height']}m x {dimensions['depth']}m")

    elif isinstance(scene, trimesh.Trimesh):
        print("📦 단일 메시 파일입니다. 그대로 업로드합니다.")
        item_id = f"{prefix}_001"
        glb_key = f"catalog/models/{item_id}.glb"

        with open(glb_path, 'rb') as f:
            s3.upload_fileobj(
                f,
                settings.S3_BUCKET_NAME,
                glb_key,
                ExtraArgs={'ContentType': 'model/gltf-binary'}
            )

        bounds = scene.bounding_box.bounds
        dimensions = {
            "width": round(float(bounds[1][0] - bounds[0][0]), 2),
            "height": round(float(bounds[1][1] - bounds[0][1]), 2),
            "depth": round(float(bounds[1][2] - bounds[0][2]), 2)
        }

        split_items.append({
            "id": item_id,
            "name": prefix.replace('_', ' ').title(),
            "type": "decoration",
            "category": category,
            "dimensions": dimensions,
            "thumbnail": f"/furniture/{item_id}.png",
            "color": "#8B4513",
            "price": 100,
            "tags": [prefix, category],
            "mountType": "floor",
            "glbKey": glb_key
        })

        print(f"  ✅ 업로드 완료: s3://{settings.S3_BUCKET_NAME}/{glb_key}")

    # catalog.json 업데이트
    print("\n📝 카탈로그 업데이트 중...")
    try:
        response = s3.get_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key="catalog/catalog.json"
        )
        catalog_data = json.loads(response['Body'].read().decode('utf-8'))
    except Exception:
        catalog_data = {"items": []}

    # 중복 제거하면서 추가
    existing_ids = {item['id'] for item in catalog_data.get('items', [])}
    added_count = 0
    for item in split_items:
        if item['id'] not in existing_ids:
            catalog_data['items'].append(item)
            added_count += 1

    # 저장
    s3.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key="catalog/catalog.json",
        Body=json.dumps(catalog_data, ensure_ascii=False, indent=2),
        ContentType="application/json"
    )

    print(f"\n✨ 완료!")
    print(f"   - 분리된 아이템: {len(split_items)}개")
    print(f"   - 카탈로그에 추가: {added_count}개")
    print(f"   - 전체 카탈로그 아이템: {len(catalog_data['items'])}개")


def main():
    parser = argparse.ArgumentParser(
        description='GLB 파일을 분리하여 S3에 업로드합니다.'
    )
    parser.add_argument('glb_file', help='분리할 GLB 파일 경로')
    parser.add_argument('--prefix', '-p', default='item', help='아이템 ID 접두사 (기본: item)')
    parser.add_argument('--category', '-c', default='decoration',
                        choices=['bedroom', 'living', 'office', 'kitchen', 'decoration'],
                        help='카테고리 (기본: decoration)')

    args = parser.parse_args()

    split_glb(args.glb_file, args.prefix, args.category)


if __name__ == '__main__':
    main()
