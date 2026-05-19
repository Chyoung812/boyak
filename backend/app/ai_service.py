from typing import Any, Dict

from app.config import get_settings


async def route_user_text_with_ai(text: str) -> Dict[str, Any]:
    """사용자 자유 텍스트 → 앱 내 기능으로 라우팅."""
    settings = get_settings()

    if not settings.openai_api_key:
        return _rule_based_route(text)

    try:
        import httpx

        prompt = (
            "다음 사용자 입력을 분석해 가장 적합한 기능을 골라주세요.\n"
            "반환은 JSON 단 하나: {\"intent\": \"<기능>\", \"params\": {<추출값>}}\n\n"
            "가능한 intent:\n"
            "- safety_check : 약 안전성/상호작용 확인 (params: medicine_names)\n"
            "- hospital_search : 병원 검색 (params: symptom, region)\n"
            "- cost_estimate : 진료비 조회 (params: body, treatment)\n"
            "- drug_search : 약 정보 검색 (params: query)\n"
            "- unknown : 위에 해당 없음\n\n"
            f"사용자 입력: {text}"
        )

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={
                    "model": settings.openai_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                    "max_tokens": 200,
                },
            )
        body = resp.json()
        import json
        content = body["choices"][0]["message"]["content"]
        return {"ok": True, "source": "openai", **json.loads(content)}
    except Exception as exc:
        return {**_rule_based_route(text), "fallback_reason": str(exc)}


def _rule_based_route(text: str) -> Dict[str, Any]:
    t = text.lower()
    if any(k in t for k in ["약", "복용", "먹", "처방", "부작용", "상호작용", "병용"]):
        return {"ok": True, "source": "rule", "intent": "safety_check", "params": {"medicine_names": []}}
    if any(k in t for k in ["병원", "의원", "진료", "진통", "아파", "아프"]):
        return {"ok": True, "source": "rule", "intent": "hospital_search", "params": {}}
    if any(k in t for k in ["비용", "가격", "얼마", "진료비", "검사비"]):
        return {"ok": True, "source": "rule", "intent": "cost_estimate", "params": {}}
    return {"ok": True, "source": "rule", "intent": "unknown", "params": {}}
