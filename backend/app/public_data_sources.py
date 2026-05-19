from typing import List, Dict, Any


_SOURCES: List[Dict[str, Any]] = [
    {
        "key": "dur_product",
        "name": "DUR 의약품 목록 (식약처)",
        "base_url": "https://apis.data.go.kr/1471000/DURPrdlstInfoService03",
        "description": "의약품 안전사용서비스(DUR) 품목 정보",
    },
    {
        "key": "easy_drug",
        "name": "의약품 쉬운 정보 (식약처)",
        "base_url": "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService",
        "description": "일반인용 의약품 효능·용법 정보",
    },
    {
        "key": "drug_permission",
        "name": "의약품 허가 정보 (식약처)",
        "base_url": "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07",
        "description": "의약품 품목허가·신고 현황",
    },
    {
        "key": "health_supplement",
        "name": "건강기능식품 정보 (식약처)",
        "base_url": "https://apis.data.go.kr/1471000/HtfsInfoService03",
        "description": "건강기능식품 품목 및 기능성 정보",
    },
    {
        "key": "pill_identification",
        "name": "의약품 낱알 식별 (식약처)",
        "base_url": "https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService03",
        "description": "알약 모양·색상·마크로 검색하는 낱알 식별 서비스",
    },
]

_SOURCE_MAP = {s["key"]: s for s in _SOURCES}


def list_sources() -> List[Dict[str, Any]]:
    return _SOURCES


def get_source(key: str) -> Dict[str, Any] | None:
    return _SOURCE_MAP.get(key)
