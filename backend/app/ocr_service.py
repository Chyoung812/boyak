import base64
import io
import json
import re
from typing import Any, Dict, List

from fastapi import UploadFile
from PIL import Image

from app.config import get_settings


def _compress_image(image_bytes: bytes) -> bytes:
    """이미지를 적절한 크기로 압축해서 반환 (API 비용/속도 최적화)."""
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = image.size
    # 너무 크면 리사이즈 (긴 변 기준 2000px 이하)
    max_side = 2000
    if max(w, h) > max_side:
        ratio = max_side / max(w, h)
        image = image.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=92)
    return buf.getvalue()


async def extract_medicine_bags_from_images(files: List[UploadFile]) -> Dict[str, Any]:
    settings = get_settings()

    bags = []
    for i, file in enumerate(files):
        raw = await file.read()
        names: List[str] = []
        ocr_source = "unavailable"

        if settings.openai_api_key:
            names = await _ocr_with_openai(raw, file.content_type or "image/jpeg", settings)
            if names:
                ocr_source = "openai_vision"

        bags.append({
            "bag_id": f"bag_{i + 1}",
            "source_label": file.filename or f"이미지 {i + 1}",
            "medicine_names": names,
            "ocr_source": ocr_source,
        })

    return {"ok": True, "bag_count": len(bags), "medicine_bags": bags}


async def _ocr_with_openai(image_bytes: bytes, content_type: str, settings) -> List[str]:
    try:
        import httpx

        compressed = _compress_image(image_bytes)
        b64 = base64.b64encode(compressed).decode()

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={
                    "model": settings.openai_model,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": (
                                        "이 이미지는 한국 약봉투 또는 복약안내지 사진입니다.\n"
                                        "이미지 안에서 '약품명', '약품사진', '의약품명' 등의 컬럼 헤더를 찾고,\n"
                                        "그 아래에 세로로 나열된 의약품 상품명만 추출하세요.\n\n"
                                        "【반드시 지킬 규칙】\n"
                                        "1. 이미지에서 실제로 보이는 글자만 읽을 것 — 추측·상상·합성 절대 금지\n"
                                        "2. 약품명 컬럼에 있는 이름만 추출 (복약 설명·주의사항·성분명 컬럼 제외)\n"
                                        "3. 각 줄을 하나의 약품명으로 처리 (여러 줄 합치기 금지)\n"
                                        "4. 약 상품명만 추출. 예: 클락신정, 부코정, 엘도스타캡슐, 세프로바이정\n"
                                        "5. 성분명(영문·한글), 용량(250mg·1정 등), 복약 지시사항 제외\n"
                                        "6. 한 글자라도 확실하지 않으면 그 약품명은 제외\n\n"
                                        "출력: JSON 배열만. 예: [\"클락신정\", \"부코정\", \"엘도스타캡슐\"]\n"
                                        "JSON 외 다른 텍스트 절대 금지."
                                    ),
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{b64}",
                                        "detail": "high",
                                    },
                                },
                            ],
                        }
                    ],
                    "max_tokens": 300,
                    "temperature": 0,
                },
            )
        content = resp.json()["choices"][0]["message"]["content"].strip()
        print(f"OCR 응답: {content}")
        match = re.search(r"\[.*?\]", content, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        import traceback
        traceback.print_exc()
    return []
