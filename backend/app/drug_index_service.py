import difflib
import re
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Sequence

import httpx

BACKEND_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = BACKEND_ROOT / "data" / "processed" / "dur_index.sqlite3"


def _search_easy_drug_api(name: str) -> List[Dict[str, Any]]:
    """심평원 easy drug API로 약 이름 검색 (DB에 후보 없을 때 fallback)."""
    try:
        from app.config import get_settings
        s = get_settings()
        if not s.public_data_service_key:
            return []
        resp = httpx.get(
            f"{s.easy_drug_info_base_url}/getDrbEasyDrugList",
            params={
                "serviceKey": s.public_data_service_key,
                "type": "json",
                "itemName": name,
                "numOfRows": 5,
                "pageNo": 1,
            },
            timeout=5.0,
        )
        body = resp.json().get("body") or {}
        items = body.get("items") or []
        if isinstance(items, dict):
            items = [items]
        candidates = []
        for item in items:
            item_name = str(item.get("itemName", "")).strip()
            item_seq = str(item.get("itemSeq", "")).strip()
            if not item_name:
                continue
            candidates.append({
                "alias": item_name,
                "product_code": item_seq,
                "ingredient_code": item_seq,
                "weight": 80,
                "source": "easy_drug_api",
            })
        return candidates
    except Exception:
        return []


OCR_NORMALIZATION_REPLACEMENTS = [
    # 용량 단위 OCR 흔들림: 밀리그람/일리그럼/필리그램/ng → 밀리그램/mg
    ("밀리그람", "밀리그램"),
    ("일리그램", "밀리그램"),
    ("일리그럼", "밀리그램"),
    ("필리그램", "밀리그램"),
    ("릴리그램", "밀리그램"),
    ("밀리그렇", "밀리그램"),
    ("mg", "mg"),
    ("㎎", "mg"),
    # 샘플에서 반복된 약명 OCR 혼동. 최종 확정은 후보 확인 UI에서 한다.
    ("초록소정", "화록소정"),
    ("프로바미정", "씨프로바이정"),
    ("세프로바이정", "씨프로바이정"),
]


def normalize_ocr_drug_text(text: str) -> str:
    value = str(text or "").strip()
    value = value.replace("㎎", "mg")
    value = re.sub(r"(\d+)\s*ng\b", r"\1mg", value, flags=re.IGNORECASE)
    for old, new in OCR_NORMALIZATION_REPLACEMENTS:
        value = value.replace(old, new)
    return value


def norm(text: str) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", normalize_ocr_drug_text(text).lower())


def typo_variants(text: str) -> List[str]:
    """OCR/STT에서 자주 섞이는 한글 모음 후보를 일반화해 만든다."""
    pairs = [
        ("래", "레"), ("레", "래"), ("내", "네"), ("네", "내"), ("애", "에"), ("에", "애"),
        ("갤", "겔"), ("겔", "갤"), ("팬", "펜"), ("펜", "팬"), ("택", "텍"), ("텍", "택"),
        ("샌", "센"), ("센", "샌"), ("밴", "벤"), ("벤", "밴"), ("전", "정"), ("정", "전"),
    ]
    variants = {text}
    for a, b in pairs:
        if a in text:
            variants.add(text.replace(a, b))
    return list(variants)


def common_prefix_len(a: str, b: str) -> int:
    count = 0
    for left, right in zip(a, b):
        if left != right:
            break
        count += 1
    return count


def has_db() -> bool:
    return DB_PATH.exists()


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def normalize_medicine_names(names: Sequence[str], limit_per_name: int = 8) -> Dict[str, Any]:
    if not has_db():
        return {"ok": False, "reason": "DUR SQLite index not found. Run scripts/build_dur_sqlite.py", "items": []}
    conn = connect()
    items: List[Dict[str, Any]] = []
    for raw in names:
        q = norm(raw)
        if not q:
            continue
        # exact/starts-with/contains 순으로 후보를 잡고, 없으면 일반화된 유사도 후보를 제시한다.
        rows = conn.execute(
            """
            SELECT alias, alias_norm, product_code, ingredient_code, weight, source,
              CASE
                WHEN alias_norm = ? THEN 300
                WHEN alias_norm LIKE ? THEN 200
                WHEN alias_norm LIKE ? THEN 100
                ELSE 0
              END + weight AS score
            FROM drug_aliases
            WHERE alias_norm = ? OR alias_norm LIKE ? OR alias_norm LIKE ?
            GROUP BY product_code, ingredient_code
            ORDER BY score DESC, length(alias_norm) ASC
            LIMIT ?
            """,
            (q, q + "%", "%" + q + "%", q, q + "%", "%" + q + "%", limit_per_name),
        ).fetchall()
        candidates = [dict(row) for row in rows]
        status = "not_found"
        if candidates:
            status = "matched" if any(candidate.get("alias_norm") == q for candidate in candidates) else "needs_confirmation"
            for candidate in candidates:
                candidate.pop("alias_norm", None)

        if not candidates:
            for variant in typo_variants(q):
                if variant == q:
                    continue
                variant_rows = conn.execute(
                    """
                    SELECT alias, alias_norm, product_code, ingredient_code, weight, source,
                      CASE
                        WHEN alias_norm = ? THEN 280
                        WHEN alias_norm LIKE ? THEN 180
                        WHEN alias_norm LIKE ? THEN 90
                        ELSE 0
                      END + weight AS score
                    FROM drug_aliases
                    WHERE alias_norm = ? OR alias_norm LIKE ? OR alias_norm LIKE ?
                    GROUP BY product_code, ingredient_code
                    ORDER BY score DESC, length(alias_norm) ASC
                    LIMIT ?
                    """,
                    (variant, variant + "%", "%" + variant + "%", variant, variant + "%", "%" + variant + "%", limit_per_name),
                ).fetchall()
                candidates = [dict(row) for row in variant_rows]
                if candidates:
                    for candidate in candidates:
                        candidate["match_basis"] = "typo_variant"
                        candidate.pop("alias_norm", None)
                    status = "needs_confirmation"
                    break

        if not candidates and len(q) >= 3:
            fuzzy_candidates = []
            for fuzzy_query in typo_variants(q):
                prefix = fuzzy_query[:2]
                fuzzy_rows = conn.execute(
                    """
                    SELECT alias, alias_norm, product_code, ingredient_code, weight, source
                    FROM drug_aliases
                    WHERE alias_norm LIKE ?
                    GROUP BY product_code, ingredient_code
                    ORDER BY length(alias_norm) ASC
                    LIMIT 2000
                    """,
                    (prefix + "%",),
                ).fetchall()
                for row in fuzzy_rows:
                    d = dict(row)
                    alias_norm = d.get("alias_norm") or ""
                    compare_text = alias_norm[: max(len(fuzzy_query) + 2, 4)]
                    ratio = difflib.SequenceMatcher(None, fuzzy_query, compare_text).ratio()
                    lcp = common_prefix_len(fuzzy_query, alias_norm)
                    is_similar = ratio >= 0.62 or (lcp >= 3 and ratio >= 0.40)
                    if is_similar:
                        d["score"] = int(ratio * 100)
                        d["match_basis"] = "fuzzy_alias"
                        d.pop("alias_norm", None)
                        fuzzy_candidates.append(d)
            dedup: Dict[tuple, Dict[str, Any]] = {}
            for candidate in fuzzy_candidates:
                key = (candidate.get("product_code"), candidate.get("ingredient_code"))
                if key not in dedup or candidate.get("score", 0) > dedup[key].get("score", 0):
                    dedup[key] = candidate
            fuzzy_candidates = list(dedup.values())
            fuzzy_candidates.sort(key=lambda x: (-x["score"], len(x.get("alias") or "")))
            candidates = fuzzy_candidates[:limit_per_name]
            if candidates:
                status = "needs_confirmation"

        # DB에 없으면 심평원 API로 fallback 검색
        if not candidates:
            api_candidates = _search_easy_drug_api(raw)
            if api_candidates:
                candidates = api_candidates
                status = "needs_confirmation"

        items.append({
            "input": raw,
            "normalized_input": q,
            "status": status,
            "candidates": candidates,
            "top_candidate": candidates[0] if candidates else None,
        })
    conn.close()
    return {"ok": True, "db_path": str(DB_PATH), "items": items}


def safety_check_by_codes(product_codes: Sequence[str], ingredient_codes: Sequence[str]) -> List[Dict[str, Any]]:
    if not has_db():
        return []
    pcs = [x for x in product_codes if x]
    ics = [x for x in ingredient_codes if x]
    conn = connect()
    matches: List[Dict[str, Any]] = []

    if pcs or ics:
        clauses = []
        params: List[str] = []
        if pcs:
            clauses.append("product_code IN (%s)" % ",".join("?" for _ in pcs))
            params.extend(pcs)
        if ics:
            clauses.append("ingredient_code IN (%s)" % ",".join("?" for _ in ics))
            params.extend(ics)
        # 성분 기준으로 중복 제거: 동일 (category, ingredient_code) 중 대표 1건만
        rows = conn.execute(
            f"""
            SELECT category, product_code, ingredient_code, product_name, ingredient_name,
                   reason, source_date, age_value, age_condition, source
            FROM safety_rules
            WHERE ({' OR '.join(clauses)}) AND category != '임부금기'
            GROUP BY category, ingredient_code
            LIMIT 50
            """,
            params,
        ).fetchall()
        for row in rows:
            matches.append(dict(row))

    # 성분코드 기반 병용금기: 입력된 성분코드끼리 pair table에서 검사
    unique_ics = sorted(set(ics))
    if len(unique_ics) >= 2:
        for i, a in enumerate(unique_ics):
            for b in unique_ics[i + 1 :]:
                rows = conn.execute(
                    """
                    SELECT ingredient_code_a, ingredient_code_b, ingredient_name_a, ingredient_name_b,
                           product_name_a, product_name_b, reason, source_date, source
                    FROM contraindication_pairs
                    WHERE (ingredient_code_a = ? AND ingredient_code_b = ?)
                       OR (ingredient_code_a = ? AND ingredient_code_b = ?)
                    LIMIT 10
                    """,
                    (a, b, b, a),
                ).fetchall()
                for row in rows:
                    d = dict(row)
                    d["category"] = "병용금기"
                    matches.append(d)
    conn.close()
    return matches
