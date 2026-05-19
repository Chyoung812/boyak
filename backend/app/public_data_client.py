from typing import Any, Dict, Optional
from urllib.parse import urljoin

import httpx

from app.config import get_settings
from app.public_data_sources import get_source


class PublicDataClient:
    def __init__(self) -> None:
        self._settings = get_settings()

    def _service_key(self) -> str:
        return self._settings.public_data_service_key

    async def request(
        self,
        source_key: str,
        operation: str = "",
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        source = get_source(source_key)
        if not source:
            return {"ok": False, "error": f"unknown source: {source_key}"}

        base = source["base_url"].rstrip("/")
        url = f"{base}/{operation}" if operation else base

        merged: Dict[str, Any] = {
            "serviceKey": self._service_key(),
            "type": "json",
            "numOfRows": 10,
            "pageNo": 1,
        }
        if params:
            merged.update(params)

        try:
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.get(url, params=merged)
            return {"ok": True, "status_code": resp.status_code, "body": resp.json()}
        except Exception as exc:
            return {"ok": False, "error": str(exc)}

    async def request_foodsafety_supplement_ingredients(
        self,
        name: Optional[str] = None,
        start_idx: int = 1,
        end_idx: int = 10,
        data_type: str = "json",
    ) -> Dict[str, Any]:
        s = self._settings
        service_id = s.foodsafety_supplement_ingredient_service_id
        api_key = s.foodsafety_api_key
        base = s.foodsafety_base_url.rstrip("/")
        url = f"{base}/{api_key}/{service_id}/{data_type}/{start_idx}/{end_idx}"
        if name:
            url += f"/HELT_ITM_GRP_NM={name}"

        try:
            async with httpx.AsyncClient(timeout=8) as client:
                resp = await client.get(url)
            return {"ok": True, "status_code": resp.status_code, "body": resp.json()}
        except Exception as exc:
            return {"ok": False, "error": str(exc)}
