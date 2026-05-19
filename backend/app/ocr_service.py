import base64
import json
from typing import Any, Dict, List

import httpx
from fastapi import UploadFile

from app.config import get_settings

OCR_SYSTEM_PROMPT = """너는 한국 약봉투/처방전 OCR 보조기다.
진단/처방/위험판정은 하지 말고 이미지에서 보이는 약 이름만 구조화한다.
여러 장은 각각 별도 bag으로 유지한다.
약 이름에 용량(mg, 밀리그램), 제형(정, 캡슐, 시럽 등)이 보이면 medicine_names에 함께 포함한다.
확실하지 않은 글자는 guessed=true로 표시한다.
반드시 JSON만 반환한다.
"""


def _image_data_url(content: bytes, content_type: str) -> str:
    mime = content_type or "image/jpeg"
    encoded = base64.b64encode(content).decode("ascii")
    return f"data:{mime};base64,{encoded}"


async def extract_medicine_bags_from_images(files: List[UploadFile]) -> Dict[str, Any]:
    settings = get_settings()
    if not files:
        return {"ok": False, "reason": "이미지 파일이 필요합니다.", "medicine_bags": []}
    if not settings.openai_api_key:
        return {
            "ok": False,
            "mode": "openai_vision_unavailable",
            "reason": "OPENAI_API_KEY가 없어서 이미지 OCR을 실행할 수 없습니다.",
            "medicine_bags": [],
        }

    content_parts: List[Dict[str, Any]] = [
        {
            "type": "text",
            "text": "각 이미지에서 약봉투/처방전의 약 이름을 추출해 JSON으로 반환해줘. 스키마: {ok, mode, medicine_bags:[{bag_id, source_label, medicine_names, guessed_items:[{text, reason}]}]}",
        }
    ]
    file_meta = []
    for index, file in enumerate(files, start=1):
        content = await file.read()
        if not content:
            continue
        file_meta.append({"bag_id": f"photo_{index}", "filename": file.filename or f"photo_{index}"})
        content_parts.append({"type": "text", "text": f"이미지 {index}: bag_id=photo_{index}, filename={file.filename or ''}"})
        content_parts.append({
            "type": "image_url",
            "image_url": {
                "url": _image_data_url(content, file.content_type or "image/jpeg"),
                "detail": "high",
            },
        })

    body = {
        "model": settings.openai_model,
        "messages": [
            {"role": "system", "content": OCR_SYSTEM_PROMPT},
            {"role": "user", "content": content_parts},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.0,
        "max_tokens": 1600,
    }
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=body)
        response.raise_for_status()
        parsed = json.loads(response.json()["choices"][0]["message"]["content"])
        parsed.setdefault("ok", True)
        parsed.setdefault("mode", "openai_vision")
        parsed.setdefault("medicine_bags", [])
        parsed["file_count"] = len(file_meta)
        parsed["file_meta"] = file_meta
        parsed["safety_note"] = "OCR은 약명 추출만 합니다. 최종 위험도는 DUR 제품코드/성분코드 검사 결과를 사용하세요."
        return parsed
    except Exception as exc:
        return {
            "ok": False,
            "mode": "openai_vision_error",
            "reason": str(exc)[:300],
            "medicine_bags": [],
            "file_count": len(file_meta),
            "file_meta": file_meta,
        }
