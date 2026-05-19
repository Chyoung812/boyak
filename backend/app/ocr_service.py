import base64
from typing import Any, Dict, List

from fastapi import UploadFile

from app.config import get_settings


async def extract_medicine_bags_from_images(files: List[UploadFile]) -> Dict[str, Any]:
    """약봉투 이미지 → 약 이름 목록 추출."""
    settings = get_settings()

    bags = []
    for i, file in enumerate(files):
        raw = await file.read()
        names: List[str] = []

        if settings.openai_api_key:
            names = await _ocr_with_openai(raw, file.content_type or "image/jpeg", settings)

        bags.append({
            "bag_id": f"bag_{i + 1}",
            "source_label": file.filename or f"이미지 {i + 1}",
            "medicine_names": names,
            "ocr_source": "openai_vision" if names else "unavailable",
        })

    return {"ok": True, "bag_count": len(bags), "medicine_bags": bags}


async def _ocr_with_openai(
    image_bytes: bytes, content_type: str, settings
) -> List[str]:
    try:
        import httpx

        b64 = base64.b64encode(image_bytes).decode()
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": (
                                        "이 약봉투 이미지에서 약품명만 추출하세요. "
                                        "약품명을 JSON 배열로만 반환하세요. 예: [\"타이레놀정\", \"아모디핀정\"]\n"
                                        "약품명이 없으면 빈 배열 []을 반환하세요."
                                    ),
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{content_type};base64,{b64}",
                                        "detail": "high"
                                    },
                                },
                            ],
                        }
                    ],
                    "max_tokens": 300,
                },
            )
        content = resp.json()["choices"][0]["message"]["content"].strip()
        import json, re
        match = re.search(r"\[.*?\]", content, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return []
