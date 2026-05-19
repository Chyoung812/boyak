import difflib
import re
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Sequence

from app.config import get_settings

BACKEND_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = BACKEND_ROOT / "data" / "processed" / "dur_index.sqlite3"


def database_url() -> str:
    return get_settings().database_url.strip()


def norm(text: str) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", str(text or "").lower())


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


def use_postgres() -> bool:
    return bool(database_url())


def db_label() -> str:
    return "postgres" if use_postgres() else "sqlite"


def has_db() -> bool:
    if use_postgres():
        return True
    return DB_PATH.exists()


def _pg_connect():
    try:
        import psycopg
        from psycopg.rows import dict_row
    except ImportError as exc:
        raise RuntimeError("DATABASE_URL is set but psycopg is not installed. Run: pip install psycopg[binary]") from exc
    return psycopg.connect(database_url(), row_factory=dict_row)


def connect():
    if use_postgres():
        return _pg_connect()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _sql(sql: str) -> str:
    """Convert SQLite-style placeholders to psycopg placeholders when DATABASE_URL is used."""
    if use_postgres():
        return sql.replace("?", "%s")
    return sql


def _rows(conn, sql: str, params: Sequence[Any] = ()) -> List[Dict[str, Any]]:
    rows = conn.execute(_sql(sql), params).fetchall()
    return [dict(row) for row in rows]


def _alias_candidates(conn, q: str, limit_per_name: int, exact_score: int, prefix_score: int, contains_score: int) -> List[Dict[str, Any]]:
    sql = """
        WITH ranked AS (
            SELECT alias, alias_norm, product_code, ingredient_code, weight, source,
              CASE
                WHEN alias_norm = ? THEN ?
                WHEN alias_norm LIKE ? THEN ?
                WHEN alias_norm LIKE ? THEN ?
                ELSE 0
              END + weight AS score,
              ROW_NUMBER() OVER (
                PARTITION BY product_code, ingredient_code
                ORDER BY
                  CASE
                    WHEN alias_norm = ? THEN ?
                    WHEN alias_norm LIKE ? THEN ?
                    WHEN alias_norm LIKE ? THEN ?
                    ELSE 0
                  END + weight DESC,
                  length(alias_norm) ASC
              ) AS rn
            FROM drug_aliases
            WHERE alias_norm = ? OR alias_norm LIKE ? OR alias_norm LIKE ?
        )
        SELECT alias, alias_norm, product_code, ingredient_code, weight, source, score
        FROM ranked
        WHERE rn = 1
        ORDER BY score DESC, length(alias_norm) ASC
        LIMIT ?
    """
    params = (
        q, exact_score, q + "%", prefix_score, "%" + q + "%", contains_score,
        q, exact_score, q + "%", prefix_score, "%" + q + "%", contains_score,
        q, q + "%", "%" + q + "%", limit_per_name,
    )
    return _rows(conn, sql, params)


def normalize_medicine_names(names: Sequence[str], limit_per_name: int = 8) -> Dict[str, Any]:
    if not has_db():
        return {"ok": False, "reason": "DUR SQLite index not found. Run scripts/build_dur_sqlite.py", "items": []}
    conn = connect()
    items: List[Dict[str, Any]] = []
    try:
        for raw in names:
            q = norm(raw)
            if not q:
                continue
            # exact/starts-with/contains 순으로 후보를 잡고, 없으면 일반화된 유사도 후보를 제시한다.
            candidates = _alias_candidates(conn, q, limit_per_name, 300, 200, 100)
            status = "not_found"
            if candidates:
                status = "matched" if any(candidate.get("alias_norm") == q for candidate in candidates) else "needs_confirmation"
                for candidate in candidates:
                    candidate.pop("alias_norm", None)

            if not candidates:
                for variant in typo_variants(q):
                    if variant == q:
                        continue
                    candidates = _alias_candidates(conn, variant, limit_per_name, 280, 180, 90)
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
                    fuzzy_rows = _rows(
                        conn,
                        """
                        SELECT alias, alias_norm, product_code, ingredient_code, weight, source
                        FROM drug_aliases
                        WHERE alias_norm LIKE ?
                        ORDER BY length(alias_norm) ASC
                        LIMIT 2000
                        """,
                        (prefix + "%",),
                    )
                    for d in fuzzy_rows:
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

            items.append({
                "input": raw,
                "normalized_input": q,
                "status": status,
                "candidates": candidates,
                "top_candidate": candidates[0] if candidates else None,
            })
        return {"ok": True, "db_backend": db_label(), "db_path": str(DB_PATH) if not use_postgres() else None, "items": items}
    finally:
        conn.close()


def safety_check_by_codes(product_codes: Sequence[str], ingredient_codes: Sequence[str]) -> List[Dict[str, Any]]:
    if not has_db():
        return []
    pcs = [x for x in product_codes if x]
    ics = [x for x in ingredient_codes if x]
    conn = connect()
    matches: List[Dict[str, Any]] = []
    try:
        if pcs or ics:
            clauses = []
            params: List[str] = []
            if pcs:
                clauses.append("product_code IN (%s)" % ",".join("?" for _ in pcs))
                params.extend(pcs)
            if ics:
                clauses.append("ingredient_code IN (%s)" % ",".join("?" for _ in ics))
                params.extend(ics)
            rows = _rows(
                conn,
                f"""
                SELECT category, product_code, ingredient_code, product_name, ingredient_name, reason, source_date, source
                FROM safety_rules
                WHERE ({' OR '.join(clauses)}) AND category != '임부금기'
                LIMIT 30
                """,
                params,
            )
            matches.extend(rows)

        # 성분코드 기반 병용금기: 입력된 성분코드끼리 pair table에서 검사
        unique_ics = sorted(set(ics))
        if len(unique_ics) >= 2:
            for i, a in enumerate(unique_ics):
                for b in unique_ics[i + 1 :]:
                    rows = _rows(
                        conn,
                        """
                        SELECT ingredient_code_a, ingredient_code_b, ingredient_name_a, ingredient_name_b,
                               product_name_a, product_name_b, reason, source_date, source
                        FROM contraindication_pairs
                        WHERE (ingredient_code_a = ? AND ingredient_code_b = ?)
                           OR (ingredient_code_a = ? AND ingredient_code_b = ?)
                        LIMIT 10
                        """,
                        (a, b, b, a),
                    )
                    for d in rows:
                        d["category"] = "병용금기"
                        matches.append(d)
        return matches
    finally:
        conn.close()
