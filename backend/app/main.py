from typing import List, Optional
from urllib.parse import quote

from fastapi import FastAPI, File, Query, UploadFile
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from app.ai_service import route_user_text_with_ai
from app.config import get_settings
from app.cost_service import get_cost_estimate
from app.drug_index_service import normalize_medicine_names
from app.ocr_service import extract_medicine_bags_from_images
from app.public_data_client import PublicDataClient
from app.public_data_sources import list_sources
from app.safety_service import check_medicine_bags_safety, check_medicine_safety, check_selected_medicines_safety

settings = get_settings()


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


class AiRouteRequest(BaseModel):
    text: str


class MedicineNormalizeRequest(BaseModel):
    medicine_names: List[str]


app = FastAPI(
    title="Boyak Backend API",
    description="보약 프론트용 약/DUR, 병원비, 병원추천 백엔드",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.post("/api/safety/check")
def safety_check(payload: SafetyCheckRequest) -> dict:
    return check_medicine_safety(
        medicine_names=payload.medicine_names,
        age=payload.age,
        has_herbal_medicine=payload.has_herbal_medicine,
        has_supplement=payload.has_supplement,
        dispensed_days_ago=payload.dispensed_days_ago,
        dosage_form=payload.dosage_form,
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
    return check_selected_medicines_safety(
        selected_medicines=[medicine.model_dump() for medicine in payload.selected_medicines],
        age=payload.age,
        has_herbal_medicine=payload.has_herbal_medicine,
        has_supplement=payload.has_supplement,
    )


@app.post("/api/ocr/medicine-bags")
async def ocr_medicine_bags(files: List[UploadFile] = File(...)) -> dict:
    return await extract_medicine_bags_from_images(files)


@app.post("/api/ai/route")
async def ai_route(payload: AiRouteRequest) -> dict:
    return await route_user_text_with_ai(payload.text)


@app.post("/api/medicines/normalize")
def medicines_normalize(payload: MedicineNormalizeRequest) -> dict:
    return normalize_medicine_names(payload.medicine_names)


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
