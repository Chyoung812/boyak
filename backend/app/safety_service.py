from typing import Any, Dict, List, Optional, Sequence

from app.drug_index_service import normalize_medicine_names, safety_check_by_codes


def _resolve_codes(medicine_names: Sequence[str]) -> tuple[List[str], List[str]]:
    """약 이름 목록 → (제품코드 목록, 성분코드 목록)"""
    result = normalize_medicine_names(list(medicine_names))
    product_codes: List[str] = []
    ingredient_codes: List[str] = []
    for item in result.get("items", []):
        top = item.get("top_candidate") or {}
        pc = top.get("product_code", "")
        ic = top.get("ingredient_code", "")
        if pc:
            product_codes.append(pc)
        if ic:
            ingredient_codes.append(ic)
    return product_codes, ingredient_codes


def _filter_age(alerts: List[Dict[str, Any]], age: Optional[int]) -> List[Dict[str, Any]]:
    if age is None:
        return alerts
    result = []
    for a in alerts:
        if a.get("category") != "연령금기":
            result.append(a)
            continue
        age_val_raw = (a.get("age_value") or "").strip()
        age_cond_raw = (a.get("age_condition") or "").strip()
        try:
            limit = int("".join(c for c in age_val_raw if c.isdigit()))
        except ValueError:
            result.append(a)
            continue
        triggered = False
        if "미만" in age_cond_raw and age < limit:
            triggered = True
        elif "이상" in age_cond_raw and age >= limit:
            triggered = True
        elif "초과" in age_cond_raw and age > limit:
            triggered = True
        elif "이하" in age_cond_raw and age <= limit:
            triggered = True
        if triggered:
            result.append(a)
    return result


def _format_alert(raw: Dict[str, Any]) -> Dict[str, Any]:
    category = raw.get("category", "")
    reason = raw.get("reason", "")

    level = "warning"
    if category in ("병용금기", "마약", "마약/조혈모세포억제제"):
        level = "danger"
    elif category == "임부금기":
        level = "danger"
    elif category == "연령금기":
        level = "warning"

    if category == "병용금기":
        drug_a = raw.get("ingredient_name_a") or raw.get("product_name_a") or ""
        drug_b = raw.get("ingredient_name_b") or raw.get("product_name_b") or ""
        title = f"병용금기: {drug_a} + {drug_b}"
    elif category == "연령금기":
        drug = raw.get("ingredient_name") or raw.get("product_name") or ""
        age_val = raw.get("age_value", "")
        age_cond = raw.get("age_condition", "")
        title = f"연령금기: {drug} ({age_val} {age_cond})"
    elif category == "임부금기":
        drug = raw.get("ingredient_name") or raw.get("product_name") or ""
        title = f"임부금기: {drug}"
    else:
        drug = raw.get("ingredient_name") or raw.get("product_name") or ""
        title = f"{category}: {drug}"

    return {"category": category, "level": level, "title": title, "reason": reason, "raw": raw}


def check_medicine_safety(
    medicine_names: List[str],
    age: Optional[int] = None,
    has_herbal_medicine: bool = False,
    has_supplement: bool = False,
    dispensed_days_ago: Optional[int] = None,
    dosage_form: Optional[str] = None,
) -> Dict[str, Any]:
    product_codes, ingredient_codes = _resolve_codes(medicine_names)
    raw_alerts = safety_check_by_codes(product_codes, ingredient_codes)
    raw_alerts = _filter_age(raw_alerts, age)
    alerts = [_format_alert(a) for a in raw_alerts]

    notes = []
    if has_herbal_medicine:
        notes.append("한약 병용 중입니다. 한약-양약 상호작용을 한의사에게 확인하세요.")
    if has_supplement:
        notes.append("건강기능식품 병용 중입니다. 영양소 과잉 섭취 여부를 확인하세요.")
    if dispensed_days_ago is not None and dispensed_days_ago > 30:
        notes.append(f"조제된 지 {dispensed_days_ago}일이 지났습니다. 유효기간을 확인하세요.")

    return {
        "ok": True,
        "medicine_count": len(medicine_names),
        "alert_count": len(alerts),
        "alerts": alerts,
        "notes": notes,
    }


def check_medicine_bags_safety(
    medicine_bags: List[Dict[str, Any]],
    age: Optional[int] = None,
    has_herbal_medicine: bool = False,
    has_supplement: bool = False,
) -> Dict[str, Any]:
    all_names: List[str] = []
    bag_results: List[Dict[str, Any]] = []

    for bag in medicine_bags:
        names = bag.get("medicine_names", [])
        all_names.extend(names)
        pc, ic = _resolve_codes(names)
        raw = safety_check_by_codes(pc, ic)
        raw = _filter_age(raw, age)
        bag_results.append({
            "bag_id": bag.get("bag_id"),
            "source_label": bag.get("source_label"),
            "medicine_count": len(names),
            "alerts": [_format_alert(a) for a in raw],
        })

    # 봉투 간 병용금기 체크
    all_pc, all_ic = _resolve_codes(all_names)
    cross_raw = safety_check_by_codes(all_pc, all_ic)
    cross_raw = _filter_age(cross_raw, age)
    cross_alerts = [_format_alert(a) for a in cross_raw if a.get("category") == "병용금기"]

    total_alerts = sum(len(b["alerts"]) for b in bag_results) + len(cross_alerts)
    return {
        "ok": True,
        "bag_count": len(medicine_bags),
        "total_alert_count": total_alerts,
        "bags": bag_results,
        "cross_bag_alerts": cross_alerts,
    }


def check_selected_medicines_safety(
    selected_medicines: List[Dict[str, Any]],
    age: Optional[int] = None,
    has_herbal_medicine: bool = False,
    has_supplement: bool = False,
) -> Dict[str, Any]:
    product_codes = [m["product_code"] for m in selected_medicines if m.get("product_code")]
    ingredient_codes = [m["ingredient_code"] for m in selected_medicines if m.get("ingredient_code")]

    raw_alerts = safety_check_by_codes(product_codes, ingredient_codes)
    raw_alerts = _filter_age(raw_alerts, age)
    alerts = [_format_alert(a) for a in raw_alerts]

    notes = []
    if has_herbal_medicine:
        notes.append("한약 병용 중입니다. 한약-양약 상호작용을 한의사에게 확인하세요.")
    if has_supplement:
        notes.append("건강기능식품 병용 중입니다. 영양소 과잉 섭취 여부를 확인하세요.")

    return {
        "ok": True,
        "medicine_count": len(selected_medicines),
        "alert_count": len(alerts),
        "alerts": alerts,
        "notes": notes,
    }
