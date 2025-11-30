"""
Depth Estimation API
AI 기반 Depth Map 생성 API (Depth Anything V2)
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import logging
import base64
import io
import os

from PIL import Image
import numpy as np

from app.models import User
from app.api.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

# Depth Estimation 모델 (lazy loading)
_depth_estimator = None
_device = None


class DepthFromUrlRequest(BaseModel):
    """URL에서 Depth Map 생성 요청"""
    image_url: str
    output_format: Optional[str] = "png"  # png or jpeg


class DepthMapResponse(BaseModel):
    """Depth Map 응답"""
    depth_map_url: str
    width: int
    height: int
    model: str


def get_depth_estimator():
    """
    Depth Anything V2 모델 초기화 (lazy loading)
    GPU 사용 가능시 GPU 사용, 없으면 CPU
    """
    global _depth_estimator, _device

    if _depth_estimator is not None:
        return _depth_estimator

    try:
        import torch
        from transformers import pipeline

        # 디바이스 설정
        if torch.cuda.is_available():
            _device = "cuda"
            logger.info("Using CUDA for depth estimation")
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            _device = "mps"
            logger.info("Using MPS (Apple Silicon) for depth estimation")
        else:
            _device = "cpu"
            logger.info("Using CPU for depth estimation")

        # Depth Anything V2 Small 모델 로드
        # Apache 2.0 라이선스로 상업적 사용 가능
        _depth_estimator = pipeline(
            "depth-estimation",
            model="depth-anything/Depth-Anything-V2-Small-hf",
            device=_device if _device != "mps" else -1,  # MPS는 직접 지원 안됨
        )

        logger.info("Depth Anything V2 model loaded successfully")
        return _depth_estimator

    except ImportError as e:
        logger.error(f"Required packages not installed: {e}")
        logger.error("Please install: pip install transformers torch")
        return None
    except Exception as e:
        logger.error(f"Failed to load depth estimation model: {e}")
        return None


def image_to_base64(image: Image.Image, format: str = "PNG") -> str:
    """PIL Image를 Base64 문자열로 변환"""
    buffer = io.BytesIO()
    image.save(buffer, format=format)
    img_str = base64.b64encode(buffer.getvalue()).decode()
    mime_type = "image/png" if format.upper() == "PNG" else "image/jpeg"
    return f"data:{mime_type};base64,{img_str}"


def normalize_depth_map(depth_array: np.ndarray) -> Image.Image:
    """
    Depth 배열을 0-255 그레이스케일 이미지로 정규화
    가까운 곳: 밝게 (255)
    먼 곳: 어둡게 (0)
    """
    # NaN 처리
    depth_array = np.nan_to_num(depth_array, nan=0.0)

    # 정규화
    depth_min = depth_array.min()
    depth_max = depth_array.max()

    if depth_max - depth_min > 0:
        normalized = (depth_array - depth_min) / (depth_max - depth_min)
    else:
        normalized = np.zeros_like(depth_array)

    # 0-255 범위로 변환 (가까운 곳이 밝도록)
    depth_uint8 = (normalized * 255).astype(np.uint8)

    return Image.fromarray(depth_uint8, mode='L')


@router.post("/generate-depth", response_model=DepthMapResponse)
async def generate_depth_map(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    업로드된 이미지에서 Depth Map 생성

    - **file**: 이미지 파일 (JPEG, PNG)

    Returns:
        Depth Map 이미지 (Base64)
    """
    # 파일 타입 검증
    allowed_types = ["image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 파일 형식입니다. 지원: {', '.join(allowed_types)}"
        )

    # 모델 로드
    depth_estimator = get_depth_estimator()
    if depth_estimator is None:
        raise HTTPException(
            status_code=503,
            detail="Depth estimation 서비스를 사용할 수 없습니다. 서버 관리자에게 문의하세요."
        )

    try:
        # 이미지 로드
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        logger.info(f"Processing image: {image.size}")

        # Depth 추정
        result = depth_estimator(image)

        # 결과 처리
        if "depth" in result:
            depth_image = result["depth"]
        elif "predicted_depth" in result:
            # 일부 모델은 다른 키 사용
            depth_array = np.array(result["predicted_depth"])
            depth_image = normalize_depth_map(depth_array)
        else:
            raise ValueError("Unexpected model output format")

        # Base64로 변환
        depth_base64 = image_to_base64(depth_image, "PNG")

        logger.info(f"Depth map generated: {depth_image.size}")

        return DepthMapResponse(
            depth_map_url=depth_base64,
            width=depth_image.width,
            height=depth_image.height,
            model="depth-anything-v2-small"
        )

    except Exception as e:
        logger.error(f"Depth estimation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Depth Map 생성 실패: {str(e)}"
        )


@router.post("/generate-depth-from-url", response_model=DepthMapResponse)
async def generate_depth_from_url(
    request: DepthFromUrlRequest,
    current_user: User = Depends(get_current_user),
):
    """
    URL 또는 Base64 이미지에서 Depth Map 생성

    - **image_url**: 이미지 URL 또는 data:image/... Base64 문자열

    Returns:
        Depth Map 이미지 (Base64)
    """
    import requests

    # 모델 로드
    depth_estimator = get_depth_estimator()
    if depth_estimator is None:
        raise HTTPException(
            status_code=503,
            detail="Depth estimation 서비스를 사용할 수 없습니다."
        )

    try:
        # Base64 데이터인 경우
        if request.image_url.startswith("data:image"):
            # data:image/png;base64,xxx... 형식 파싱
            header, base64_data = request.image_url.split(",", 1)
            image_bytes = base64.b64decode(base64_data)
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        else:
            # URL에서 다운로드
            response = requests.get(request.image_url, timeout=30)
            response.raise_for_status()
            image = Image.open(io.BytesIO(response.content)).convert("RGB")

        logger.info(f"Processing image from URL: {image.size}")

        # Depth 추정
        result = depth_estimator(image)

        # 결과 처리
        if "depth" in result:
            depth_image = result["depth"]
        elif "predicted_depth" in result:
            depth_array = np.array(result["predicted_depth"])
            depth_image = normalize_depth_map(depth_array)
        else:
            raise ValueError("Unexpected model output format")

        # 출력 포맷 결정
        output_format = request.output_format.upper()
        if output_format not in ["PNG", "JPEG"]:
            output_format = "PNG"

        # Base64로 변환
        depth_base64 = image_to_base64(depth_image, output_format)

        logger.info(f"Depth map generated from URL: {depth_image.size}")

        return DepthMapResponse(
            depth_map_url=depth_base64,
            width=depth_image.width,
            height=depth_image.height,
            model="depth-anything-v2-small"
        )

    except requests.RequestException as e:
        logger.error(f"Failed to fetch image from URL: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"이미지 URL을 가져올 수 없습니다: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Depth estimation from URL failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Depth Map 생성 실패: {str(e)}"
        )


@router.get("/model-status")
async def get_model_status(
    current_user: User = Depends(get_current_user),
):
    """
    Depth Estimation 모델 상태 확인
    """
    global _depth_estimator, _device

    model_loaded = _depth_estimator is not None

    # 모델이 로드되지 않았으면 로드 시도
    if not model_loaded:
        depth_estimator = get_depth_estimator()
        model_loaded = depth_estimator is not None

    return {
        "model_loaded": model_loaded,
        "model_name": "depth-anything/Depth-Anything-V2-Small-hf",
        "device": _device or "not initialized",
        "status": "ready" if model_loaded else "unavailable"
    }
