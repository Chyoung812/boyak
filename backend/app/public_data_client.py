from typing import Any, Dict, List, Optional
from urllib.parse import quote

import httpx

from app.config import get_settings
from app.public_data_sources import list_sources


class PublicDataClient:
    """Thin client for data.go.kr APIs.

    API keys are read from backend/.env only. Never expose the key to the frontend.
    Endpoint operation names differ by service, so this client accepts an optional
    operation path and query params for smoke tests / adapters.
    """

    def __init__(self) -> None:
        self.settings = get_settings()

    def has_key(self) -> bool:
        return bool(self.settings.public_data_service_key)

    def has_foodsafety_key(self) -> bool:
        return bool(self.settings.foodsafety_api_key)

    def _foodsafety_url(
        self,
        start_idx: int,
        end_idx: int,
        data_type: str,
        field: Optional[str] = None,
        value: Optional[str] = None,
    ) -> str:
        base = self.settings.foodsafety_base_url.rstrip("/")
        service_id = self.settings.foodsafety_supplement_ingredient_service_id
        url = f"{base}/{quote(self.settings.foodsafety_api_key)}/{service_id}/{data_type}/{start_idx}/{end_idx}"
        if field and value:
            url = f"{url}/{field}={quote(value)}"
        return url

    async def _get_foodsafety_json(self, url: str) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url)
        content_type = response.headers.get("content-type", "")
        try:
            payload: Any = response.json() if "json" in content_type else response.text[:2000]
        except Exception:
            payload = response.text[:2000]
        return {"ok": response.is_success, "status_code": response.status_code, "payload": payload}

    def _extract_foodsafety_rows(self, payload: Any) -> List[Dict[str, Any]]:
        if not isinstance(payload, dict):
            return []
        service_id = self.settings.foodsafety_supplement_ingredient_service_id
        rows = payload.get(service_id, {}).get("row", [])
        return rows if isinstance(rows, list) else []

    def _extract_foodsafety_total(self, payload: Any) -> int:
        if not isinstance(payload, dict):
            return 0
        service_id = self.settings.foodsafety_supplement_ingredient_service_id
        total = payload.get(service_id, {}).get("total_count", 0)
        try:
            return int(total)
        except (TypeError, ValueError):
            return 0

    def _supplement_search_terms(self, name: Optional[str]) -> List[str]:
        if not name:
            return []
        # 원료/제품명으로만 검색한다. "관절" 같은 효능어를 특정 원료로 단정 변환하지 않는다.
        return [name.strip()]

    def _build_supplement_safety_summary(self, query: Optional[str], rows: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not query:
            return {
                "level": "정보입력필요",
                "elderly_message": "제품명이나 원료명을 입력하면 확인할 수 있어요.",
                "action": "제품 라벨의 원료명/성분명을 입력하세요.",
            }
        if not rows:
            return {
                "level": "판단불가",
                "elderly_message": "이 이름만으로는 안전 여부를 판단할 수 없어요.",
                "action": "영양제 제품명, 원료명, 지금 먹는 약 이름을 같이 확인해야 해요.",
                "reason": "식품안전나라 I0760에서 해당 원료명이 바로 매칭되지 않았습니다.",
            }
        return {
            "level": "확인필요",
            "elderly_message": "원료 정보는 찾았지만, 약과 같이 먹어도 되는지는 별도 확인이 필요해요.",
            "action": "복용 중인 약이 있으면 약사/의사에게 같이 먹어도 되는지 확인하세요.",
            "reason": "I0760은 원료 분류 데이터라 병용금기·노인주의 위험 판정 데이터가 아닙니다.",
        }

    async def request_foodsafety_supplement_ingredients(
        self,
        name: Optional[str] = None,
        start_idx: int = 1,
        end_idx: int = 10,
        data_type: str = "json",
    ) -> Dict[str, Any]:
        source = list_sources()["supplement_ingredient"]
        if not self.has_foodsafety_key():
            return {
                "ok": False,
                "reason": "FOODSAFETY_API_KEY is empty. Put the key in backend/.env, not in frontend.",
                "source": source,
                "sample_url_without_real_key": "http://openapi.foodsafetykorea.go.kr/api/sample/I0760/json/1/5",
            }

        base = self.settings.foodsafety_base_url.rstrip("/")
        service_id = self.settings.foodsafety_supplement_ingredient_service_id
        search_terms = self._supplement_search_terms(name)

        if not search_terms:
            url = self._foodsafety_url(start_idx, end_idx, data_type)
            result = await self._get_foodsafety_json(url)
            rows = self._extract_foodsafety_rows(result["payload"])
            result.update({
                "source": source,
                "search_mode": "list",
                "url_used_without_key": f"{base}/[REDACTED]/{service_id}/{data_type}/{start_idx}/{end_idx}",
                "rows": rows,
                "total_count": self._extract_foodsafety_total(result["payload"]),
                "safety_summary": self._build_supplement_safety_summary(name, rows),
            })
            return result

        combined_rows: List[Dict[str, Any]] = []
        term_results: List[Dict[str, Any]] = []
        seen = set()
        status_ok = True
        status_codes: List[int] = []

        for term in search_terms:
            url = self._foodsafety_url(start_idx, end_idx, data_type, "HELT_ITM_GRP_NM", term)
            result = await self._get_foodsafety_json(url)
            status_ok = status_ok and bool(result["ok"])
            status_codes.append(int(result["status_code"]))
            rows = self._extract_foodsafety_rows(result["payload"])
            total = self._extract_foodsafety_total(result["payload"])
            term_results.append({
                "term": term,
                "field": "HELT_ITM_GRP_NM",
                "total_count": total,
                "row_count": len(rows),
            })
            for row in rows:
                key = (row.get("HELT_ITM_GRP_CD"), row.get("HELT_ITM_GRP_NM"), row.get("MLSFC_NM"), row.get("SCLAS_NM"))
                if key in seen:
                    continue
                seen.add(key)
                combined_rows.append(row)

        return {
            "ok": status_ok,
            "status_codes": sorted(set(status_codes)),
            "source": source,
            "search_mode": "ingredient_name",
            "input_name": name,
            "search_terms": search_terms,
            "term_results": term_results,
            "url_used_without_key": f"{base}/[REDACTED]/{service_id}/{data_type}/{start_idx}/{end_idx}/HELT_ITM_GRP_NM=...",
            "total_count": len(combined_rows),
            "rows": combined_rows,
            "safety_summary": self._build_supplement_safety_summary(name, combined_rows),
            "payload": {
                "note": "I0760은 원료명/분류 데이터입니다. 효능어를 특정 원료로 단정 변환하지 않고, 안전 판단은 DUR 병용금기·노인주의 데이터와 결합해야 합니다."
            },
        }

    async def request(
        self,
        source_key: str,
        operation: str = "",
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        sources = list_sources()
        if source_key not in sources:
            raise ValueError(f"unknown source: {source_key}")
        source = sources[source_key]
        base_url = source.get("base_url")
        if not base_url:
            raise ValueError(f"source has no OpenAPI base_url: {source_key}")
        if not self.has_key():
            return {
                "ok": False,
                "reason": "PUBLIC_DATA_SERVICE_KEY is empty. Put the key in backend/.env, not in frontend.",
                "source": source,
            }

        url = base_url.rstrip("/")
        if operation:
            url = f"{url}/{operation.lstrip('/')}"

        query = dict(params or {})
        query.setdefault("serviceKey", self.settings.public_data_service_key)
        query.setdefault("pageNo", 1)
        query.setdefault("numOfRows", 10)
        query.setdefault("type", "json")

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=query)
        content_type = response.headers.get("content-type", "")
        try:
            payload: Any = response.json() if "json" in content_type else response.text[:2000]
        except Exception:
            payload = response.text[:2000]
        return {
            "ok": response.is_success,
            "status_code": response.status_code,
            "source": source,
            "url_used_without_key": url,
            "payload": payload,
        }
