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


async def _fetch_desc_from_llm(name: str, settings) -> Optional[dict]:
    if not settings.openai_api_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.openai_model,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "한국 약사입니다. 약 이름이 주어지면 20자 이내의 쉬운 효능 설명만 출력하세요. "
                                "전문 용어 없이 노인도 이해하기 쉽게 쓰세요. "
                                "약 이름을 모르면 빈 문자열만 출력하세요."
                            ),
                        },
                        {"role": "user", "content": name},
                    ],
                    "max_tokens": 40,
                    "temperature": 0,
                },
            )
        desc = resp.json()["choices"][0]["message"]["content"].strip()
        if desc:
            return {"desc": desc[:30], "dosage": ""}
    except Exception:
        pass
    return None


async def get_drug_descriptions(drug_names: List[str]) -> Dict[str, dict]:
    """약품명 목록 → {약품명: {desc, dosage}} 딕셔너리"""
    settings = get_settings()
    if not drug_names:
        return {}

    info: Dict[str, dict] = {}
    missing: List[str] = []

    if settings.public_data_service_key:
        async with httpx.AsyncClient(timeout=10) as client:
            tasks = [_fetch_easy_drug(name, client, settings) for name in drug_names]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        for name, item in zip(drug_names, results):
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

    # API에서 못 찾은 약은 LLM으로 설명 생성
    if missing and settings.openai_api_key:
        llm_tasks = [_fetch_desc_from_llm(name, settings) for name in missing]
        llm_results = await asyncio.gather(*llm_tasks, return_exceptions=True)
        for name, llm_item in zip(missing, llm_results):
            if isinstance(llm_item, dict) and llm_item.get("desc"):
                info[name] = llm_item

    return info
