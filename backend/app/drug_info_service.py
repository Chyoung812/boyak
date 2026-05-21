import asyncio
import re
from typing import Dict, List, Optional

import httpx

from app.config import get_settings


async def _fetch_easy_drug(name: str, client: httpx.AsyncClient, settings) -> Optional[dict]:
    try:
        resp = await client.get(
            f"{settings.easy_drug_info_base_url}/getDrbEasyDrugList",
            params={
                "serviceKey": settings.public_data_service_key,
                "type": "json",
                "itemName": name,
                "numOfRows": 3,
                "pageNo": 1,
            },
        )
        body = resp.json().get("body") or {}
        items = body.get("items") or []
        if isinstance(items, dict):
            items = [items]
        if items:
            return items[0]
    except Exception:
        pass
    return None


def _clean_efficacy(text: str) -> str:
    """API 효능 텍스트를 어르신이 이해하기 쉬운 형태로 정리."""
    if not text:
        return ""
    # 앞에 붙는 상투적 문구 제거
    text = re.sub(r"^이 약(의 효능)?은?\s*(무엇입니까[?.]*\s*)?", "", text.strip())
    # 괄호 안 전문 용어 제거 (한글만 남기기)
    text = re.sub(r"\([^)]*[a-zA-Z][^)]*\)", "", text)
    # 연속 공백 정리
    text = re.sub(r"\s{2,}", " ", text).strip()
    # 너무 길면 첫 문장만
    sentences = re.split(r"[.。]", text)
    short = sentences[0].strip() if sentences else text
    return short[:80] if len(short) > 80 else short


async def get_drug_descriptions(drug_names: List[str]) -> Dict[str, str]:
    """약품명 목록 → {약품명: 효능 한 줄 설명} 딕셔너리"""
    settings = get_settings()
    if not settings.public_data_service_key or not drug_names:
        return {}

    async with httpx.AsyncClient(timeout=10) as client:
        tasks = [_fetch_easy_drug(name, client, settings) for name in drug_names]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    descriptions: Dict[str, str] = {}
    for name, item in zip(drug_names, results):
        if isinstance(item, dict):
            efficacy = item.get("efcyQesitm", "") or ""
            cleaned = _clean_efficacy(efficacy)
            if cleaned:
                descriptions[name] = cleaned

    return descriptions
