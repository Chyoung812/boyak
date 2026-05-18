import json
from typing import Any, Dict, List, Optional

import httpx

from app.config import get_settings

SYSTEM_PROMPT = """너는 어르신 복약·병원방문 보조 서비스의 백엔드 AI 라우터다.
진단/처방을 하지 말고, 입력 문장을 구조화만 한다.
반드시 JSON만 반환한다.
약 이름이 불확실하면 candidates에 넣고, certainty를 낮춘다.
증상은 진료과 후보와 병원 문의 질문으로 바꾼다.
위험 판정은 하지 않는다. 위험 판정은 DUR 룰 엔진이 한다.
"""

FALLBACK_DEPARTMENTS = {
    "무릎": ["정형외과", "통증의학과"],
    "허리": ["정형외과", "신경외과", "통증의학과"],
    "어깨": ["정형외과", "통증의학과"],
    "두통": ["신경과", "가정의학과"],
}


def _rule_based_route(text: str) -> Dict[str, Any]:
    departments: List[str] = []
    symptoms: List[str] = []
    for key, values in FALLBACK_DEPARTMENTS.items():
        if key in text:
            symptoms.append(key)
            for value in values:
                if value not in departments:
                    departments.append(value)
    if not departments:
        departments = ["가정의학과"]

    return {
        "ok": True,
        "mode": "rule_fallback",
        "intent": "symptom_or_medicine_check",
        "symptoms": symptoms,
        "medicine_candidates": [],
        "supplement_or_herbal": {
            "has_herbal_medicine": "한약" in text,
            "has_supplement": any(word in text for word in ["영양제", "건기식", "비타민"]),
        },
        "recommended_departments": departments,
        "questions_for_hospital": [
            "현재 증상으로 어느 진료과를 먼저 보면 될까요?",
            "추가 검사나 치료가 비급여인지 먼저 알 수 있을까요?",
            "어르신 이동이 어려운데 엘리베이터와 계단 여부를 확인할 수 있을까요?",
        ],
        "safety_note": "AI는 문장 정리만 하고, 약 위험도는 DUR 공공데이터로 별도 확인합니다.",
    }


async def route_user_text_with_ai(text: str) -> Dict[str, Any]:
    settings = get_settings()
    if not settings.openai_api_key:
        return _rule_based_route(text)

    schema_hint = {
        "ok": True,
        "mode": "openai",
        "intent": "medicine_check|symptom_hospital|cost_guide|mixed|unknown",
        "symptoms": ["무릎"],
        "medicine_candidates": [{"name": "약 이름 후보", "certainty": "high|medium|low"}],
        "supplement_or_herbal": {"has_herbal_medicine": False, "has_supplement": False},
        "recommended_departments": ["정형외과"],
        "questions_for_hospital": ["병원에 물어볼 질문"],
        "safety_note": "짧은 주의 문장",
    }
    body = {
        "model": settings.openai_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": "아래 문장을 다음 JSON 스키마로 구조화해줘.\n"
                + json.dumps(schema_hint, ensure_ascii=False)
                + "\n문장: "
                + text,
            },
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1,
    }
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=body)
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        parsed.setdefault("ok", True)
        parsed.setdefault("mode", "openai")
        parsed["safety_note"] = "AI는 입력 정리용입니다. 최종 위험도는 DUR 공공데이터 결과를 확인하세요."
        return parsed
    except Exception as exc:
        fallback = _rule_based_route(text)
        fallback["mode"] = "rule_fallback_after_ai_error"
        fallback["ai_error"] = str(exc)[:300]
        return fallback
