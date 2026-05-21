import asyncio
import re
from typing import Dict, List, Optional

import httpx

from app.config import get_settings


_DRUG_SUFFIX_RE = re.compile(r"(정|캡슐|캅셀|시럽|현탁액|과립|연고|크림|액|주사|점안액|패취|패치|\d+mg|\d+㎎|\d+g|\d+ml)+$", re.IGNORECASE)


def _name_variants(name: str):
    """검색 후보 이름 목록: 원본 → 접미사 제거 → 앞 4-5글자"""
    variants = [name]
    stripped = _DRUG_SUFFIX_RE.sub("", name).strip()
    if stripped and stripped != name:
        variants.append(stripped)
    if len(name) > 4:
        variants.append(name[:4])
    return list(dict.fromkeys(variants))  # 중복 제거


async def _fetch_easy_drug(name: str, client: httpx.AsyncClient, settings) -> Optional[dict]:
    for variant in _name_variants(name):
        try:
            resp = await client.get(
                f"{settings.easy_drug_info_base_url}/getDrbEasyDrugList",
                params={
                    "serviceKey": settings.public_data_service_key,
                    "type": "json",
                    "itemName": variant,
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
    if not text:
        return ""
    text = re.sub(r"^이 약(의 효능)?은?\s*(무엇입니까[?.]*\s*)?", "", text.strip())
    text = re.sub(r"\([^)]*[a-zA-Z][^)]*\)", "", text)
    text = re.sub(r"\s{2,}", " ", text).strip()
    sentences = re.split(r"[.。]", text)
    short = sentences[0].strip() if sentences else text
    # 쉼표 나열형이면 첫 항목만 사용
    if len(short) > 20 and "," in short:
        short = short.split(",")[0].strip()
    return short[:40] if len(short) > 40 else short


def _parse_dosage(text: str) -> str:
    """용법 텍스트에서 복용 타이밍 추출 → 예: '아침 식후 하루 1번'"""
    if not text:
        return ""
    text = text[:300]
    parts = []

    if re.search(r"아침", text):
        parts.append("아침")
    elif re.search(r"저녁", text):
        parts.append("저녁")

    if re.search(r"식후", text):
        parts.append("식후")
    elif re.search(r"식전", text):
        parts.append("식전")
    elif re.search(r"취침\s*전", text):
        parts.append("취침 전")

    m = re.search(r"1일\s*(\d)\s*회|하루\s*(\d)\s*번", text)
    if m:
        n = m.group(1) or m.group(2)
        parts.append(f"하루 {n}번")
    elif re.search(r"필요시|필요할\s*때", text):
        parts.append("필요시")

    return " ".join(parts)


def _looks_like_confirmed_drug_name(name: str) -> bool:
    """EasyDrug 설명 API에는 DB에서 확인된 약명처럼 보이는 값만 보낸다.

    OCR 잡음(예: '팜봉투', '복약안내', '충분한')을 LLM이 그럴듯한 효능으로
    만들어내면 안전상 문제가 크므로 설명 fallback은 사용하지 않는다.
    """
    if not name:
        return False
    value = str(name).strip()
    if len(value) < 3 or len(value) > 80:
        return False
    if re.search(r"(복약안내|약봉투|주의사항|문의|전문가|반드시|충분한|없어요|사람은|여성은|임산부|병용하지)", value):
        return False
    return bool(_DRUG_SUFFIX_RE.search(value) or re.search(r"\d+\s*(mg|㎎|밀리그램|g|ml|mL)", value, re.IGNORECASE))


async def get_drug_descriptions(drug_names: List[str]) -> Dict[str, dict]:
    """약품명 목록 → {약품명: {desc, dosage}} 딕셔너리"""
    settings = get_settings()
    if not drug_names:
        return {}

    valid_names = []
    seen = set()
    for name in drug_names:
        value = str(name or "").strip()
        key = re.sub(r"\s+", "", value)
        if key and key not in seen and _looks_like_confirmed_drug_name(value):
            seen.add(key)
            valid_names.append(value)

    info: Dict[str, dict] = {}
    missing: List[str] = []

    if settings.public_data_service_key and valid_names:
        async with httpx.AsyncClient(timeout=10) as client:
            tasks = [_fetch_easy_drug(name, client, settings) for name in valid_names]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        for name, item in zip(valid_names, results):
            if isinstance(item, dict):
                efficacy = item.get("efcyQesitm", "") or ""
                method = item.get("useMethodQesitm", "") or ""
                desc = _clean_efficacy(efficacy)
                dosage = _parse_dosage(method)
                if desc or dosage:
                    info[name] = {"desc": desc, "dosage": dosage}
                    continue
            missing.append(name)
    else:
        missing = list(drug_names)

    # API에서 못 찾은 약은 설명을 만들지 않는다.
    # OCR 잡음을 LLM이 그럴듯한 효능으로 hallucination하는 것을 막기 위함.
    return info
