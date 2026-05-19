from typing import Dict, Any

# (진료부위, 치료항목) → (평균비용, 범위)
_COST_TABLE: Dict[tuple[str, str], Dict[str, Any]] = {
    ("무릎", "X-ray 검사"):         {"min": 8000,   "max": 20000,  "avg": 13000},
    ("무릎", "MRI 검사"):            {"min": 350000, "max": 700000, "avg": 500000},
    ("무릎", "물리치료"):            {"min": 5000,   "max": 15000,  "avg": 9000},
    ("무릎", "주사치료"):            {"min": 20000,  "max": 80000,  "avg": 45000},
    ("어깨", "X-ray 검사"):         {"min": 8000,   "max": 20000,  "avg": 13000},
    ("어깨", "MRI 검사"):            {"min": 350000, "max": 700000, "avg": 500000},
    ("어깨", "물리치료"):            {"min": 5000,   "max": 15000,  "avg": 9000},
    ("어깨", "주사치료"):            {"min": 20000,  "max": 100000, "avg": 55000},
    ("허리", "X-ray 검사"):         {"min": 8000,   "max": 22000,  "avg": 15000},
    ("허리", "MRI 검사"):            {"min": 400000, "max": 800000, "avg": 580000},
    ("허리", "물리치료"):            {"min": 5000,   "max": 15000,  "avg": 9000},
    ("허리", "주사치료"):            {"min": 30000,  "max": 120000, "avg": 70000},
}

_DEFAULT_COST = {"min": 5000, "max": 200000, "avg": 50000}


def get_cost_estimate(body: str, treatment: str) -> Dict[str, Any]:
    info = _COST_TABLE.get((body, treatment), _DEFAULT_COST)
    return {
        "body": body,
        "treatment": treatment,
        "currency": "KRW",
        "estimated_min": info["min"],
        "estimated_max": info["max"],
        "estimated_avg": info["avg"],
        "note": "건강보험 적용 기준 본인부담금 추정치. 병원·상태에 따라 다를 수 있습니다.",
    }
