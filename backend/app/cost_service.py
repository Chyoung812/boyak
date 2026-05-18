import json
from pathlib import Path
from typing import Any, Dict

BACKEND_ROOT = Path(__file__).resolve().parents[1]
COST_DATA_PATH = BACKEND_ROOT / "data" / "seed" / "covered_fee_steps.json"

BODY_MAP = {
    "어깨": "shoulder",
    "무릎": "knee",
    "허리": "back",
    "shoulder": "shoulder",
    "knee": "knee",
    "back": "back",
}

TREATMENT_STEP_MAP = {
    "진찰만": "consult_only",
    "진찰 + 약 처방 가능": "consult_only",
    "진찰 + X-ray + 약 처방 가능": "consult_xray",
    "진찰 + X-ray + 물리치료 + 약 처방 가능": "consult_xray_basic_treatment",
    # legacy frontend labels
    "진료비(초진)": "consult_only",
    "X-ray 검사": "consult_xray",
    "물리치료(1회)": "consult_xray_basic_treatment",
}


def _load_cost_data() -> Dict[str, Any]:
    with COST_DATA_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def get_cost_estimate(body: str = "무릎", treatment: str = "X-ray 검사") -> Dict[str, Any]:
    data = _load_cost_data()
    body_key = BODY_MAP.get(body, "knee")
    symptom = data["symptoms"][body_key]
    requested_step_id = TREATMENT_STEP_MAP.get(treatment)

    steps = symptom["steps"]
    selected = next((step for step in steps if step["id"] == requested_step_id), None)

    if treatment in {"MRI 검사", "MRI 급여기준 확인"}:
        selected = {
            "id": "conditional_mri",
            "title": "MRI 검사는 의사 판단 후 급여 기준 확인",
            "likelihood": "조건부 확인",
            "display_price": "급여 기준 충족 여부 확인 필요",
            "display_range": "MRI는 증상·진찰소견·기존 검사 결과에 따라 급여 가능 여부가 달라집니다.",
            "note": "첫 방문에서 바로 확정 금액으로 안내하기보다, 급여 기준 해당 여부와 대체 가능한 기본검사를 확인하는 항목입니다.",
            "caveat": "촬영 부위, 조영제, 병원 종별, 급여 기준 충족 여부에 따라 달라질 수 있음",
            "items": [],
            "cost_components": [
                {
                    "label": "MRI 급여 기준 확인",
                    "included": False,
                    "description": "비급여 가격이 아니라 급여 적용 가능성을 병원에 확인해야 하는 항목",
                    "item_codes": [],
                }
            ],
        }
    elif selected is None:
        selected = {
            "id": "ask_hospital",
            "title": "병원 문의 필요",
            "likelihood": "확인 필요",
            "display_price": "상담 필요",
            "display_range": "진료 후 필요한 검사·치료인지 확인하세요.",
            "note": "현재 MVP는 진찰, X-ray, 기본 물리치료 중심으로 안내합니다.",
            "caveat": "개별 병원·진료 상황에 따라 달라질 수 있음",
            "items": [],
            "cost_components": [],
        }

    return {
        "body": body,
        "body_key": body_key,
        "treatment": treatment,
        "provider": symptom["default_provider"],
        "departments": symptom["default_departments"],
        "selected": selected,
        "steps": steps,
        "conditional_items": symptom["conditional_items"],
        "assumptions": data["assumptions"],
        "source": data["source"],
        "disclaimer": "개인별 확정 병원비가 아니라 11990 급여 수가 기반 첫 방문 참고 안내입니다. 약국 결제액은 제외합니다.",
    }
