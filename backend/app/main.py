import asyncio
import io
import logging
import time
from typing import Any, List, Optional
from urllib.parse import quote

import httpx
from fastapi import FastAPI, File, Query, Request, UploadFile
from fastapi.responses import Response
from gtts import gTTS
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.ai_service import route_user_text_with_ai
from app.rate_limit import (
    limiter, require_daily,
    ocr_daily, ai_route_daily, tmap_daily,
    RATE_OCR, RATE_AI_ROUTE, RATE_TMAP,
)
from app.config import get_settings
from app.cost_service import answer_cost_question, get_cost_estimate
from app.drug_index_service import normalize_medicine_names
from app.drug_info_service import get_drug_descriptions
from app.ocr_service import extract_medicine_bags_from_images
from app.public_data_client import PublicDataClient
from app.public_data_sources import list_sources
from app.safety_service import check_medicine_bags_safety, check_medicine_safety, check_selected_medicines_safety
from app.ai_service import transcribe_audio_with_ai

settings = get_settings()

# ── 로그 설정 (Docker/Render: stdout으로만 출력) ───────────────────────────────
logger = logging.getLogger("보약API")
logger.setLevel(logging.INFO)
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
    logger.addHandler(_handler)


class _RequestLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        ms = round((time.perf_counter() - start) * 1000)
        logger.info(
            "%s %s → %s (%dms) [%s]",
            request.method,
            request.url.path,
            response.status_code,
            ms,
            request.client.host if request.client else "-",
        )
        return response


class SafetyCheckRequest(BaseModel):
    medicine_names: List[str]
    age: Optional[int] = None
    has_herbal_medicine: bool = False
    has_supplement: bool = False
    dispensed_days_ago: Optional[int] = None
    dosage_form: Optional[str] = None


class MedicineBagInput(BaseModel):
    bag_id: Optional[str] = None
    source_label: Optional[str] = None
    medicine_names: List[str]


class SafetyBagsCheckRequest(BaseModel):
    medicine_bags: List[MedicineBagInput]
    age: Optional[int] = None
    has_herbal_medicine: bool = False
    has_supplement: bool = False


class SelectedMedicineInput(BaseModel):
    display_name: Optional[str] = None
    product_code: Optional[str] = None
    ingredient_code: str
    bag_id: Optional[str] = None
    source_label: Optional[str] = None


class SafetySelectedCheckRequest(BaseModel):
    selected_medicines: List[SelectedMedicineInput]
    age: Optional[int] = None
    has_herbal_medicine: bool = False
    has_supplement: bool = False


class HospitalNearbyRequest(BaseModel):
    department: str = "정형외과"
    lat: float = 37.566481
    lon: float = 126.985023


class SymptomAnalyzeRequest(BaseModel):
    symptom: str


class AiRouteRequest(BaseModel):
    text: str


class CostChatRequest(BaseModel):
    question: str
    body: str = "통증"
    treatment: str = "진찰 + X-ray + 처방전 받을 수 있음"


class MedicineNormalizeRequest(BaseModel):
    medicine_names: List[Any]

    def str_names(self) -> List[str]:
        result = []
        for item in self.medicine_names:
            if item is None:
                continue
            if isinstance(item, str):
                s = item.strip()
            elif isinstance(item, dict):
                s = str(item.get("name") or item.get("약품명") or item.get("medicine_name") or "").strip()
            else:
                continue
            if s:
                result.append(s)
        return result


app = FastAPI(
    title="Boyak Backend API",
    description="보약 프론트용 약/DUR, 병원비, 병원추천 백엔드",
    version="0.1.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(_RequestLogMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("보약 백엔드 시작 — CORS origins: %s", settings.cors_origin_list)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "service": "boyak-backend"}


@app.get("/api/sources")
def sources() -> dict:
    return {"sources": list_sources()}


@app.get("/api/costs/estimate")
def cost_estimate(
    body: str = Query(default="무릎", description="어깨/무릎/허리"),
    treatment: str = Query(default="X-ray 검사", description="프론트 treatmentOptions 값"),
) -> dict:
    return get_cost_estimate(body=body, treatment=treatment)


@app.post("/api/costs/chat")
def cost_chat(payload: CostChatRequest) -> dict:
    logger.info("[병원비챗봇] %s | 부위=%s | 흐름=%s", payload.question, payload.body, payload.treatment)
    return answer_cost_question(
        question=payload.question,
        body=payload.body,
        treatment=payload.treatment,
    )



@app.post("/api/safety/check-bags")
def safety_check_bags(payload: SafetyBagsCheckRequest) -> dict:
    return check_medicine_bags_safety(
        medicine_bags=[bag.model_dump() for bag in payload.medicine_bags],
        age=payload.age,
        has_herbal_medicine=payload.has_herbal_medicine,
        has_supplement=payload.has_supplement,
    )


@app.post("/api/safety/check-selected")
def safety_check_selected(payload: SafetySelectedCheckRequest) -> dict:
    names = [m.display_name or m.ingredient_code for m in payload.selected_medicines]
    logger.info("[DUR] 선택 약 안전확인 | 약 %d개 %s | 나이 %s", len(names), names, payload.age)
    return check_selected_medicines_safety(
        selected_medicines=[medicine.model_dump() for medicine in payload.selected_medicines],
        age=payload.age,
        has_herbal_medicine=payload.has_herbal_medicine,
        has_supplement=payload.has_supplement,
    )


@app.post("/api/ocr/medicine-bags")
@limiter.limit(RATE_OCR)
async def ocr_medicine_bags(request: Request, files: List[UploadFile] = File(...)) -> dict:
    require_daily(ocr_daily)
    return await extract_medicine_bags_from_images(files)


@app.post("/api/ai/route")
@limiter.limit(RATE_AI_ROUTE)
async def ai_route(request: Request, payload: AiRouteRequest) -> dict:
    require_daily(ai_route_daily)
    return await route_user_text_with_ai(payload.text)


@app.post("/api/ai/stt")
async def ai_stt(file: UploadFile = File(...)) -> dict:
    return await transcribe_audio_with_ai(file)


@app.post("/api/medicines/normalize")
def medicines_normalize(payload: MedicineNormalizeRequest) -> dict:
    return normalize_medicine_names(payload.str_names())


class MedicineDescriptionsRequest(BaseModel):
    medicine_names: List[str]


@app.post("/api/medicines/descriptions")
async def medicines_descriptions(payload: MedicineDescriptionsRequest) -> dict:
    logger.info("[약정보] 효능 조회 | %d개: %s", len(payload.medicine_names), payload.medicine_names)
    descriptions = await get_drug_descriptions(payload.medicine_names)
    return {"ok": True, "descriptions": descriptions}


@app.get("/api/medicines/smoke")
async def medicine_smoke(
    source: str = Query(default="easy_drug", description="dur_product/easy_drug/drug_permission/health_supplement/pill_identification"),
    operation: str = Query(default="", description="서비스별 operation path. 모르면 빈 값으로 소스 상태만 확인"),
    item_name: Optional[str] = Query(default=None, description="품목명 검색어. 실제 파라미터명은 서비스별로 다를 수 있음"),
) -> dict:
    params = {}
    if item_name:
        # 식약처 API마다 파라미터명이 다를 수 있어 우선 가장 흔한 품목명 후보로 보냄.
        params["itemName"] = item_name
    client = PublicDataClient()
    return await client.request(source_key=source, operation=operation, params=params)


@app.get("/api/supplements/ingredients")
async def supplement_ingredients(
    name: Optional[str] = Query(default=None, description="HELT_ITM_GRP_NM 명칭 검색어"),
    start_idx: int = Query(default=1, ge=1),
    end_idx: int = Query(default=10, ge=1),
) -> dict:
    client = PublicDataClient()
    return await client.request_foodsafety_supplement_ingredients(
        name=name,
        start_idx=start_idx,
        end_idx=end_idx,
        data_type="json",
    )


def kakao_map_search_url(keyword: str) -> str:
    return f"https://map.kakao.com/link/search/{quote(keyword)}"


def kakao_map_directions_url(name: str, lat: Optional[float] = None, lng: Optional[float] = None) -> str:
    if lat is None or lng is None:
        return kakao_map_search_url(name)
    return f"https://map.kakao.com/link/to/{quote(name)},{lat},{lng}"


_SYMPTOM_DEPT_MAP = [
    (["허리", "요통", "척추", "디스크", "허리디스크", "무릎", "무릎관절", "어깨", "어깨결림",
      "관절", "뼈", "골절", "골다공증", "발목", "고관절", "팔꿈치", "손목"], "정형외과"),
    (["두통", "머리", "편두통", "어지러움", "어지럼", "현기증"], "신경과 또는 가정의학과"),
    (["배", "복통", "소화", "위", "장", "설사", "변비", "기침", "가슴", "호흡", "폐", "숨", "천식"], "내과"),
    (["눈", "시야", "침침", "안구", "시력"], "안과"),
    (["귀", "청력", "이명", "난청", "코", "코막힘", "비염", "목", "편도", "인후"], "이비인후과"),
    (["피부", "두드러기", "가려움", "발진", "습진"], "피부과"),
    (["치아", "잇몸", "충치", "치통"], "치과"),
    (["심장", "흉통", "두근", "혈압"], "순환기내과"),
    (["소변", "비뇨", "전립선", "방광"], "비뇨기과"),
]


@app.post("/api/hospitals/analyze")
async def hospital_analyze_symptom(payload: SymptomAnalyzeRequest) -> dict:
    symptom = payload.symptom
    for keywords, dept in _SYMPTOM_DEPT_MAP:
        matched = next((k for k in keywords if k in symptom), None)
        if matched:
            logger.info("[증상분석] 입력: '%s' → 진료과: %s (키워드: %s)", symptom, dept, matched)
            return {"department": dept, "matched_keyword": matched}
    logger.info("[증상분석] 입력: '%s' → 기본: 가정의학과", symptom)
    return {"department": "가정의학과", "matched_keyword": None}


@app.post("/api/hospitals/nearby")
@limiter.limit(RATE_TMAP)
async def hospital_nearby(request: Request, payload: HospitalNearbyRequest) -> dict:
    require_daily(tmap_daily)
    dept = payload.department.split(" 또는 ")[0]
    lat, lon = payload.lat, payload.lon
    tmap_key = settings.tmap_app_key

    def _fallback(dept: str, lat: float, lon: float) -> dict:
        return {
            "hospitals": [
                {"name": f"가까운{dept}의원", "lat": lat + 0.0015, "lon": lon + 0.0012,
                 "distance": 320, "walk_time": 5, "stairs": 0, "is_flat": True,
                 "route_type": "평지 안심 경로", "floor": "1층", "recommended_for_walking": True},
                {"name": f"우리마을{dept}", "lat": lat + 0.003, "lon": lon - 0.002,
                 "distance": 620, "walk_time": 10, "stairs": 2, "is_flat": False,
                 "route_type": "계단 2개 포함", "floor": "2층", "recommended_for_walking": False},
            ]
        }

    if not tmap_key:
        return _fallback(dept, lat, lon)

    # Step 1: TMap POI 주변 검색
    candidates: List[dict] = []
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            res = await client.get(
                "https://apis.openapi.sk.com/tmap/pois/search/around?version=1&format=json",
                headers={"appKey": tmap_key},
                params={"categories": dept, "centerLat": lat, "centerLon": lon,
                        "radius": 2, "resCoordType": "WGS84GEO", "count": 10},
            )
        pois = res.json().get("searchPoiInfo", {}).get("pois", {}).get("poi", [])
        for p in pois:
            name = p.get("name", "")
            if any(k in name for k in ["주차장", "주차", "빌딩", "타워", "관리실", "약국"]):
                continue
            if not any(k in name for k in ["의원", "병원", "의료", "센터", "클리닉"]):
                continue
            try:
                h_lat = float(p.get("frontLat") or p.get("noorLat") or 0)
                h_lon = float(p.get("frontLon") or p.get("noorLon") or 0)
            except (TypeError, ValueError):
                continue
            if not (h_lat and h_lon):
                continue
            candidates.append({"name": name, "lat": h_lat, "lon": h_lon})
            if len(candidates) >= 5:
                break
    except Exception:
        return _fallback(dept, lat, lon)

    if not candidates:
        return _fallback(dept, lat, lon)

    # Step 2: 보행자 경로(무장애 노선) 병렬 조회
    async def get_route(hospital: dict) -> Optional[dict]:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                res = await client.post(
                    "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json",
                    headers={"appKey": tmap_key, "Content-Type": "application/json"},
                    json={
                        "startX": str(lon), "startY": str(lat),
                        "endX": str(hospital["lon"]), "endY": str(hospital["lat"]),
                        "reqCoordType": "WGS84GEO", "resCoordType": "WGS84GEO",
                        "startName": "출발", "endName": hospital["name"],
                        "searchOption": "30",  # 무장애 노선 (barrier-free)
                    },
                )
            features = res.json().get("features", [])
            if not features:
                return None
            total_dist = int(features[0]["properties"].get("totalDistance", 0))
            total_sec = features[0]["properties"].get("totalTime", 0)
            stairs = sum(1 for f in features if f.get("properties", {}).get("facilityType") == "11")
            return {"distance": total_dist, "walk_time": max(1, round(total_sec / 60)), "stairs": stairs}
        except Exception:
            dist_m = int(((hospital["lat"] - lat) ** 2 + (hospital["lon"] - lon) ** 2) ** 0.5 * 111000)
            return {"distance": dist_m, "walk_time": max(1, round(dist_m / 55)), "stairs": 0}

    routes = await asyncio.gather(*[get_route(h) for h in candidates])

    h_list = []
    floors = ["1층", "2층", "3층", "1층", "2층"]
    for i, (hospital, route) in enumerate(zip(candidates, routes)):
        if not route:
            continue
        stairs = route["stairs"]
        is_flat = stairs == 0
        if is_flat:
            route_type = "평지 안심 경로"
        elif stairs <= 2:
            route_type = f"완만한 경사 (계단 {stairs}개)"
        else:
            route_type = f"계단 {stairs}개 포함"
        h_list.append({
            "name": hospital["name"],
            "lat": hospital["lat"],
            "lon": hospital["lon"],
            "distance": route["distance"],
            "walk_time": route["walk_time"],
            "stairs": stairs,
            "is_flat": is_flat,
            "route_type": route_type,
            "floor": floors[i % len(floors)],
            "recommended_for_walking": False,
        })

    if not h_list:
        return _fallback(dept, lat, lon)

    # 계단 적은 순 → 거리 짧은 순 정렬 후 1위를 보행자 맞춤 추천으로 표시
    h_list.sort(key=lambda h: (h["stairs"], h["distance"]))
    h_list[0]["recommended_for_walking"] = True

    best = h_list[0]
    logger.info(
        "[병원검색] 진료과: %s | 위치: (%.5f,%.5f) | 후보 %d개 | 추천: %s (계단 %d개, %dm)",
        dept, lat, lon, len(h_list), best["name"], best["stairs"], best["distance"],
    )
    return {"hospitals": h_list}


class TTSRequest(BaseModel):
    text: str
    slow: bool = False


@app.post("/api/tts")
async def tts(payload: TTSRequest) -> Response:
    buf = io.BytesIO()
    gTTS(text=payload.text[:1000], lang="ko", slow=payload.slow).write_to_fp(buf)
    return Response(content=buf.getvalue(), media_type="audio/mpeg")


@app.get("/api/hospitals/recommend")
def hospital_recommend(symptom: str = "무릎", region: str = "서울") -> dict:
    # MVP: 길찾기는 카카오맵 링크로 넘긴다. REST Directions API/키 없이도 시연 가능.
    department = "신경과 또는 가정의학과" if symptom == "두통" else "정형외과 또는 통증의학과"
    search_keyword = f"{region} {department.split(' 또는 ')[0]}"
    return {
        "symptom": symptom,
        "region": region,
        "recommended_department": department,
        "routing_provider": "kakao_map_link",
        "kakao_api_apply_url": "https://developers.kakao.com/",
        "note": "백엔드는 병원 후보와 카카오맵 링크만 내려주고, 실제 길찾기는 카카오맵 화면으로 이동한다.",
        "links": {
            "search": kakao_map_search_url(search_keyword),
            "directions_format": "https://map.kakao.com/link/to/{병원이름},{위도},{경도}",
        },
        "items": [
            {
                "name": search_keyword,
                "type": "kakao_search_placeholder",
                "map_url": kakao_map_search_url(search_keyword),
                "directions_url": kakao_map_directions_url(search_keyword),
            }
        ],
    }
