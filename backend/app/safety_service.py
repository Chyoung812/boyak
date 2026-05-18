import csv
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from app.drug_index_service import has_db, normalize_medicine_names, safety_check_by_codes

BACKEND_ROOT = Path(__file__).resolve().parents[1]
RAW_ROOT = BACKEND_ROOT / "data" / "raw"
DUR_LIST_ROOT = RAW_ROOT / "dur_drug_list" / "건강보험심사평가원_의약품안전사용서비스(DUR) 의약품 목록_20250601"
CONTRA_FILE = RAW_ROOT / "dur_contraindications" / "한국의약품안전관리원_병용금기약물_20240625.csv"

MAX_ROWS_PER_FILE = 250_000
MAX_MATCHES_PER_CATEGORY = 5


def _norm(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "")


def _read_csv_rows(path: Path, limit: int = MAX_ROWS_PER_FILE) -> Iterable[Dict[str, str]]:
    if not path.exists():
        return []
    for enc in ("utf-8-sig", "cp949", "euc-kr"):
        try:
            with path.open("r", encoding=enc, newline="") as f:
                reader = csv.DictReader(f)
                rows: List[Dict[str, str]] = []
                for i, row in enumerate(reader):
                    if i >= limit:
                        break
                    rows.append(dict(row))
                return rows
        except UnicodeDecodeError:
            continue
    return []


def _contains_any(row: Dict[str, str], medicine_names: List[str], fields: List[str]) -> bool:
    needles = [_norm(name) for name in medicine_names if _norm(name)]
    if not needles:
        return False
    haystack = " ".join(_norm(row.get(field)) for field in fields)
    return any(needle in haystack or haystack.find(needle) >= 0 for needle in needles)


def _public_match(row: Dict[str, str], category: str) -> Dict[str, Any]:
    return {
        "category": category,
        "ingredient": row.get("성분명") or row.get("성분명1") or row.get("성분명A") or "",
        "medicine_name": row.get("제품명") or row.get("제품명1") or row.get("제품명A") or "",
        "reason": row.get("약품상세정보") or row.get("상세정보") or row.get("금기사유") or "확인 필요",
        "source_date": row.get("공고일자") or row.get("고시일자") or "",
    }


@lru_cache(maxsize=1)
def load_safety_tables() -> Dict[str, List[Dict[str, str]]]:
    files = {
        "elderly_caution": DUR_LIST_ROOT / "의약품안전사용서비스(DUR)_노인주의 품목리스트 2025.6.csv",
        "elderly_nsaid_caution": DUR_LIST_ROOT / "의약품안전사용서비스(DUR)_노인주의(해열진통소염제) 품목리스트 2025.6.csv",
        "age_contraindication": DUR_LIST_ROOT / "의약품안전사용서비스(DUR)_연령금기 품목리스트 2025.6.csv",
        "combination_contraindication": DUR_LIST_ROOT / "의약품안전사용서비스(DUR)_병용금기 품목리스트 2025.6.csv",
    }
    return {key: list(_read_csv_rows(path)) for key, path in files.items()}


def _build_safety_response(
    names: List[str],
    age: Optional[int],
    matches: List[Dict[str, Any]],
    has_herbal_medicine: bool,
    has_supplement: bool,
    dispensed_days_ago: Optional[int],
    dosage_form: Optional[str],
    normalized: Optional[Dict[str, Any]] = None,
    data_basis: Optional[List[str]] = None,
) -> Dict[str, Any]:
    warnings: List[str] = []
    if has_herbal_medicine:
        warnings.append("한약을 함께 복용 중이면 약사/의사에게 같이 확인하세요.")
    if has_supplement:
        warnings.append("영양제도 약과 함께 먹을 때 영향을 줄 수 있어요.")
    if dispensed_days_ago is not None:
        form = (dosage_form or "").strip()
        limit_days = 30
        if "시럽" in form:
            limit_days = 21
        elif "가루" in form:
            limit_days = 30
        elif "연고" in form:
            limit_days = 30
        elif "알약" in form or "정" in form:
            limit_days = 60
        if dispensed_days_ago > limit_days:
            warnings.append("조제한 지 오래된 약일 수 있어 복용 전 약국 확인이 필요해요.")

    categories = {m.get("category") for m in matches}
    if "병용금기" in categories:
        level = "위험"
        message = "함께 먹으면 위험할 수 있는 조합이 있어요."
        action = "복용하지 말고 약사/의사에게 먼저 확인하세요."
    elif categories:
        level = "주의"
        message = "어르신은 복용 전 확인이 필요한 약이 있어요."
        action = "약 봉투와 함께 약사/의사에게 확인하세요."
    elif normalized and any(item.get("status") == "not_found" for item in normalized.get("items", [])):
        level = "판단불가"
        message = "일부 약 이름을 공공데이터에서 정확히 찾지 못했어요."
        action = "약 봉투의 전체 제품명을 다시 확인하거나 약사에게 확인하세요."
    elif warnings:
        level = "확인필요"
        message = "큰 금기 항목은 바로 보이지 않지만 추가 확인이 필요해요."
        action = "한약/영양제/오래된 약 여부를 약사에게 알려주세요."
    else:
        level = "확인완료"
        message = "현재 입력한 이름으로는 주요 DUR 주의 항목이 바로 보이지 않아요."
        action = "그래도 새 증상이나 여러 약을 함께 먹는 경우 약사에게 확인하세요."

    tts_text = f"{message} {action}"
    if warnings:
        tts_text += " " + " ".join(warnings[:2])

    return {
        "level": level,
        "message": message,
        "action": action,
        "medicine_names": names,
        "age": age,
        "warnings": warnings,
        "matches": matches[:15],
        "normalized": normalized,
        "data_basis": data_basis or ["DUR 노인주의", "DUR 연령금기", "DUR 병용금기"],
        "disclaimer": "진단/처방이 아니라 공공 DUR 데이터 기반 복약 확인 보조입니다.",
        "tts_text": tts_text,
    }


def check_medicine_safety(
    medicine_names: List[str],
    age: Optional[int] = None,
    has_herbal_medicine: bool = False,
    has_supplement: bool = False,
    dispensed_days_ago: Optional[int] = None,
    dosage_form: Optional[str] = None,
) -> Dict[str, Any]:
    names = [name.strip() for name in medicine_names if name and name.strip()]
    if not names:
        return {
            "level": "정보입력필요",
            "message": "약 이름을 먼저 확인해야 해요.",
            "action": "약 봉투나 처방전의 약 이름을 입력해 주세요.",
            "matches": [],
        }

    if has_db():
        normalized = normalize_medicine_names(names)
        product_codes: List[str] = []
        ingredient_codes: List[str] = []
        for item in normalized.get("items", []):
            top = item.get("top_candidate") or {}
            if top.get("product_code"):
                product_codes.append(top["product_code"])
            if top.get("ingredient_code"):
                ingredient_codes.append(top["ingredient_code"])
        raw_matches = safety_check_by_codes(product_codes, ingredient_codes)
        matches = []
        for row in raw_matches:
            if row.get("category") == "병용금기":
                matches.append({
                    "category": "병용금기",
                    "ingredient": f"{row.get('ingredient_name_a', '')} + {row.get('ingredient_name_b', '')}",
                    "ingredient_code_a": row.get("ingredient_code_a") or "",
                    "ingredient_code_b": row.get("ingredient_code_b") or "",
                    "medicine_name": f"{row.get('product_name_a', '')} / {row.get('product_name_b', '')}",
                    "reason": row.get("reason") or "함께 복용 주의",
                    "source_date": row.get("source_date") or "",
                    "match_basis": "ingredient_code_pair",
                })
            else:
                matches.append({
                    "category": row.get("category") or "확인필요",
                    "ingredient": row.get("ingredient_name") or "",
                    "product_code": row.get("product_code") or "",
                    "ingredient_code": row.get("ingredient_code") or "",
                    "medicine_name": row.get("product_name") or "",
                    "reason": row.get("reason") or "확인 필요",
                    "source_date": row.get("source_date") or "",
                    "match_basis": "product_code_or_ingredient_code",
                })
        return _build_safety_response(
            names=names,
            age=age,
            matches=matches,
            has_herbal_medicine=has_herbal_medicine,
            has_supplement=has_supplement,
            dispensed_days_ago=dispensed_days_ago,
            dosage_form=dosage_form,
            normalized=normalized,
            data_basis=["DUR SQLite 제품코드/성분코드", "DUR 노인주의", "DUR 연령금기", "DUR 병용금기"],
        )

    tables = load_safety_tables()
    matches: List[Dict[str, Any]] = []

    for category in ("elderly_caution", "elderly_nsaid_caution"):
        for row in tables.get(category, []):
            if _contains_any(row, names, ["제품명", "성분명"]):
                matches.append(_public_match(row, "노인주의"))
                if len([m for m in matches if m["category"] == "노인주의"]) >= MAX_MATCHES_PER_CATEGORY:
                    break

    if age is not None:
        for row in tables.get("age_contraindication", []):
            if _contains_any(row, names, ["제품명", "성분명"]):
                matches.append(_public_match(row, "연령금기"))
                if len([m for m in matches if m["category"] == "연령금기"]) >= MAX_MATCHES_PER_CATEGORY:
                    break

    # 병용금기는 두 약이 모두 입력됐을 때만 1차 판정한다.
    if len(names) >= 2:
        normalized_names = [_norm(name) for name in names]
        for row in tables.get("combination_contraindication", []):
            side_a = _norm(row.get("제품명A") or row.get("제품명1") or row.get("성분명A") or row.get("성분명1"))
            side_b = _norm(row.get("제품명B") or row.get("제품명2") or row.get("성분명B") or row.get("성분명2"))
            hit_a = any(name and name in side_a for name in normalized_names)
            hit_b = any(name and name in side_b for name in normalized_names)
            if hit_a and hit_b:
                matches.append({
                    "category": "병용금기",
                    "ingredient": f"{row.get('성분명A') or row.get('성분명1', '')} + {row.get('성분명B') or row.get('성분명2', '')}",
                    "medicine_name": f"{row.get('제품명A') or row.get('제품명1', '')} / {row.get('제품명B') or row.get('제품명2', '')}",
                    "reason": row.get("상세정보") or row.get("금기사유") or "함께 복용 주의",
                    "source_date": row.get("고시일자") or row.get("공고일자") or "",
                })
                if len([m for m in matches if m["category"] == "병용금기"]) >= MAX_MATCHES_PER_CATEGORY:
                    break

    return _build_safety_response(
        names=names,
        age=age,
        matches=matches,
        has_herbal_medicine=has_herbal_medicine,
        has_supplement=has_supplement,
        dispensed_days_ago=dispensed_days_ago,
        dosage_form=dosage_form,
    )


def _format_code_matches(raw_matches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    matches: List[Dict[str, Any]] = []
    for row in raw_matches:
        if row.get("category") == "병용금기":
            matches.append({
                "category": "병용금기",
                "ingredient": f"{row.get('ingredient_name_a', '')} + {row.get('ingredient_name_b', '')}",
                "ingredient_code_a": row.get("ingredient_code_a") or "",
                "ingredient_code_b": row.get("ingredient_code_b") or "",
                "medicine_name": f"{row.get('product_name_a', '')} / {row.get('product_name_b', '')}",
                "reason": row.get("reason") or "함께 복용 주의",
                "source_date": row.get("source_date") or "",
                "match_basis": "ingredient_code_pair",
            })
        else:
            matches.append({
                "category": row.get("category") or "확인필요",
                "ingredient": row.get("ingredient_name") or "",
                "product_code": row.get("product_code") or "",
                "ingredient_code": row.get("ingredient_code") or "",
                "medicine_name": row.get("product_name") or "",
                "reason": row.get("reason") or "확인 필요",
                "source_date": row.get("source_date") or "",
                "match_basis": "product_code_or_ingredient_code",
            })
    return matches


def check_selected_medicines_safety(
    selected_medicines: List[Dict[str, Any]],
    age: Optional[int] = None,
    has_herbal_medicine: bool = False,
    has_supplement: bool = False,
) -> Dict[str, Any]:
    """프론트에서 확정한 제품코드/성분코드로 DUR 근거가 있는 항목만 검사한다."""
    names = [str(item.get("display_name") or item.get("medicine_name") or item.get("product_code") or "").strip() for item in selected_medicines]
    names = [name for name in names if name]
    product_codes = [str(item.get("product_code") or "").strip() for item in selected_medicines if item.get("product_code")]
    ingredient_codes = [str(item.get("ingredient_code") or "").strip() for item in selected_medicines if item.get("ingredient_code")]

    raw_matches = safety_check_by_codes(product_codes, ingredient_codes)
    matches = _format_code_matches(raw_matches)

    result = _build_safety_response(
        names=names,
        age=age,
        matches=matches,
        has_herbal_medicine=has_herbal_medicine,
        has_supplement=has_supplement,
        dispensed_days_ago=None,
        dosage_form=None,
        data_basis=["DUR SQLite 제품코드/성분코드", "DUR 노인주의", "DUR 연령금기", "DUR 병용금기"],
    )
    result["selected_medicines"] = selected_medicines
    return result


def check_medicine_bags_safety(
    medicine_bags: List[Dict[str, Any]],
    age: Optional[int] = None,
    has_herbal_medicine: bool = False,
    has_supplement: bool = False,
) -> Dict[str, Any]:
    """여러 OCR 사진/약봉투를 하나의 현재 복용 묶음으로 합쳐 검사한다."""
    names: List[str] = []
    medicine_origins: List[Dict[str, Any]] = []
    for index, bag in enumerate(medicine_bags or [], start=1):
        bag_id = str(bag.get("bag_id") or f"photo_{index}")
        source_label = str(bag.get("source_label") or bag.get("label") or f"사진 {index}")
        for raw_name in bag.get("medicine_names") or []:
            name = str(raw_name or "").strip()
            if not name:
                continue
            names.append(name)
            medicine_origins.append({
                "medicine_name": name,
                "bag_id": bag_id,
                "source_label": source_label,
            })

    result = check_medicine_safety(
        medicine_names=names,
        age=age,
        has_herbal_medicine=has_herbal_medicine,
        has_supplement=has_supplement,
    )

    origin_by_name: Dict[str, Dict[str, Any]] = {
        item["medicine_name"]: item for item in medicine_origins
    }
    origins_by_ingredient: Dict[str, List[Dict[str, Any]]] = {}
    normalized = result.get("normalized") or {}
    for item in normalized.get("items", []):
        origin = origin_by_name.get(item.get("input"))
        if origin:
            item["bag_id"] = origin["bag_id"]
            item["source_label"] = origin["source_label"]
        top = item.get("top_candidate") or {}
        ingredient_code = top.get("ingredient_code")
        if ingredient_code and origin:
            origins_by_ingredient.setdefault(ingredient_code, []).append({
                **origin,
                "product_code": top.get("product_code"),
                "ingredient_code": ingredient_code,
                "matched_alias": top.get("alias"),
            })

    cross_bag_matches: List[Dict[str, Any]] = []
    for match in result.get("matches") or []:
        if match.get("category") != "병용금기":
            continue
        a_origins = origins_by_ingredient.get(match.get("ingredient_code_a"), [])
        b_origins = origins_by_ingredient.get(match.get("ingredient_code_b"), [])
        if not a_origins or not b_origins:
            continue
        for a_origin in a_origins:
            for b_origin in b_origins:
                if a_origin.get("bag_id") == b_origin.get("bag_id"):
                    continue
                cross_bag_matches.append({
                    "category": "병용금기",
                    "reason": match.get("reason"),
                    "medicine_a": a_origin,
                    "medicine_b": b_origin,
                    "message": "서로 다른 사진/약봉투의 약 사이에서 병용금기 가능성이 확인됐어요.",
                })

    result.update({
        "photo_count": len(medicine_bags or []),
        "medicine_count": len(names),
        "medicine_names": names,
        "medicine_origins": medicine_origins,
        "cross_bag_matches": cross_bag_matches[:10],
        "bundle_mode": "multi_photo_current_medicines",
    })
    return result
