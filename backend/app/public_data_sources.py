from app.config import get_settings


PUBLIC_DATA_SOURCES = {
    "dur_product": {
        "label": "DUR 품목정보",
        "base_url_attr": "dur_prdlst_info_base_url",
        "role": "복용 중인 약의 DUR 기준 정보 확인",
        "status": "openapi_applied",
    },
    "easy_drug": {
        "label": "약품 상세정보/복약 안내",
        "base_url_attr": "easy_drug_info_base_url",
        "role": "일반 사용자에게 보여줄 효능·주의사항·복용법 설명",
        "status": "openapi_applied",
    },
    "drug_permission": {
        "label": "약품 허가정보",
        "base_url_attr": "drug_prdt_prmsn_info_base_url",
        "role": "제품명/성분/업체/허가상태 보강. MVP에서는 상세정보 매칭 실패 시 보조 데이터",
        "status": "openapi_applied_optional",
    },
    "health_supplement": {
        "label": "건강기능식품 정보",
        "base_url_attr": "htfs_info_base_url",
        "role": "관절 영양제/건기식 성분 확인 및 약과 구분",
        "status": "openapi_applied",
    },
    "supplement_ingredient": {
        "label": "영양제 원료 정보",
        "url": "https://www.data.go.kr/data/15085712/openapi.do",
        "base_url_attr": "foodsafety_base_url",
        "service_id_attr": "foodsafety_supplement_ingredient_service_id",
        "role": "건기식 원료 기능성/주의사항 보강. 식품안전나라 I0760 경로형 API",
        "status": "openapi_applied",
        "request_format": "/api/{keyId}/{serviceId}/{dataType}/{startIdx}/{endIdx}/HELT_ITM_GRP_NM=값",
        "output_fields": [
            "HELT_ITM_GRP_CD",
            "HELT_ITM_GRP_NM",
            "LCLAS_CD",
            "LCLAS_NM",
            "MLSFC_CD",
            "MLSFC_NM",
            "SCLAS_CD",
            "SCLAS_NM",
        ],
    },
    "pill_identification": {
        "label": "알약 낱알 식별정보",
        "base_url_attr": "pill_id_info_base_url",
        "role": "색깔/모양/각인 기반 약 후보 찾기. OCR 실패 보완",
        "status": "openapi_applied",
    },
    "contraindicated_drugs_file": {
        "label": "병용금기약물 파일",
        "url": "https://www.data.go.kr/data/15089525/fileData.do",
        "role": "로컬 CSV/XLSX로 병용금기 룰 캐시 구축",
        "status": "file_download_required",
    },
    "dur_drug_list_file": {
        "label": "DUR 의약품 목록 파일",
        "url": "https://www.data.go.kr/data/15127983/fileData.do",
        "role": "OCR 약명 정규화/검색 후보 사전 구축",
        "status": "file_download_required",
    },
}


def list_sources() -> dict:
    settings = get_settings()
    out = {}
    for key, value in PUBLIC_DATA_SOURCES.items():
        item = dict(value)
        attr = item.pop("base_url_attr", None)
        if attr:
            item["base_url"] = getattr(settings, attr)
        service_attr = item.pop("service_id_attr", None)
        if service_attr:
            item["service_id"] = getattr(settings, service_attr)
        out[key] = item
    return out
