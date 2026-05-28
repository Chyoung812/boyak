#!/usr/bin/env python3
"""
건강보험심사평가원 DUR CSV 파일 → SQLite 인덱스 빌드 스크립트.

Usage:
    python scripts/build_dur_sqlite.py
"""

import csv
import re
import sqlite3
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
CSV_DIR = BACKEND_ROOT / "DUR_list_20250601"
DB_PATH = BACKEND_ROOT / "data" / "processed" / "dur_index.sqlite3"

# 파일명 → (인코딩, 설명)
CSV_FILES = {
    "DrugUtilizationReview_AgeContraindication_ProductList_2025_06.csv": ("euc-kr", "연령금기"),
    "DrugUtilizationReview_PregnancyContraindication_ProductList_2025_06.csv": ("cp949", "임부금기"),
    "DrugUtilizationReview_Narcotics_ProductList_2025_06.csv": ("euc-kr", "마약"),
    "DrugUtilizationReview_Narcotics_HematopoieticStemCellSuppressants_ProductList_2025_06.csv": ("euc-kr", "마약/조혈모세포억제제"),
    "DrugUtilizationReview_ConcurrentMedicationContraindication_ProductList_2025_06.csv": ("euc-kr", "병용금기"),
}


def norm(text: str) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", str(text or "").lower())


def simplify_name(name: str) -> str:
    """제품명 말미의 _(1정), _(1캡슐/1캡) 등 제거."""
    return re.sub(r"\s*_\([^)]*\)\s*$", "", name).strip()


def create_tables(conn: sqlite3.Connection) -> None:
    conn.executescript("""
    DROP TABLE IF EXISTS drug_products;
    DROP TABLE IF EXISTS drug_aliases;
    DROP TABLE IF EXISTS safety_rules;
    DROP TABLE IF EXISTS contraindication_pairs;

    CREATE TABLE drug_products (
      product_code TEXT PRIMARY KEY,
      product_name TEXT, product_name_simple TEXT, product_name_norm TEXT,
      ingredient_code TEXT, ingredient_name TEXT, ingredient_name_norm TEXT,
      company TEXT, source TEXT
    );

    CREATE TABLE drug_aliases (
      alias_norm TEXT, alias TEXT, product_code TEXT, ingredient_code TEXT,
      weight INTEGER, source TEXT,
      UNIQUE(alias_norm, product_code, ingredient_code)
    );

    CREATE TABLE safety_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT, product_code TEXT, ingredient_code TEXT,
      product_name TEXT, ingredient_name TEXT, reason TEXT,
      source_date TEXT, age_value TEXT, age_condition TEXT, source TEXT
    );

    CREATE TABLE contraindication_pairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_code_a TEXT, ingredient_code_b TEXT,
      ingredient_name_a TEXT, ingredient_name_b TEXT,
      product_code_a TEXT, product_code_b TEXT,
      product_name_a TEXT, product_name_b TEXT,
      reason TEXT, source_date TEXT, source TEXT
    );

    CREATE INDEX idx_alias_norm ON drug_aliases(alias_norm);
    CREATE INDEX idx_rules_product ON safety_rules(product_code);
    CREATE INDEX idx_rules_ingredient ON safety_rules(ingredient_code);
    CREATE INDEX idx_pairs_ab ON contraindication_pairs(ingredient_code_a, ingredient_code_b);
    """)


def _ins_product(conn, pc, pn, ic, iname, company, source):
    if not pc:
        return
    simple = simplify_name(pn)
    conn.execute(
        """INSERT OR IGNORE INTO drug_products
           (product_code, product_name, product_name_simple, product_name_norm,
            ingredient_code, ingredient_name, ingredient_name_norm, company, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (pc, pn, simple, norm(simple), ic, iname, norm(iname), company, source),
    )


def _ins_alias(conn, alias, pc, ic, weight, source):
    a_norm = norm(alias)
    if not a_norm:
        return
    conn.execute(
        """INSERT OR IGNORE INTO drug_aliases
           (alias_norm, alias, product_code, ingredient_code, weight, source)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (a_norm, alias, pc or "", ic or "", weight, source),
    )


def _add_aliases(conn, pc, pn, ic, iname, source):
    simple = simplify_name(pn)
    _ins_alias(conn, pn, pc, ic, 100, source)
    if simple != pn:
        _ins_alias(conn, simple, pc, ic, 90, source)
    if iname:
        _ins_alias(conn, iname, pc, ic, 80, source)


def build_age_contraindication(conn: sqlite3.Connection) -> None:
    path = CSV_DIR / "DrugUtilizationReview_AgeContraindication_ProductList_2025_06.csv"
    source = "연령금기_2025_06"
    n = 0
    with open(path, encoding="euc-kr", errors="replace") as f:
        for row in csv.DictReader(f):
            pc = row["제품코드"].strip()
            pn = row["제품명"].strip()
            ic = row["성분코드"].strip()
            iname = row["성분명"].strip()
            age_val = row["특정연령"].strip() + row["특정연령단위"].strip()
            age_cond = row["연령처리조건"].strip()
            reason = row["상세정보"].strip()
            source_date = row["고시일자"].strip()

            _ins_product(conn, pc, pn, ic, iname, row["업체명"].strip(), source)
            _add_aliases(conn, pc, pn, ic, iname, source)
            conn.execute(
                """INSERT INTO safety_rules
                   (category, product_code, ingredient_code, product_name, ingredient_name,
                    reason, source_date, age_value, age_condition, source)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                ("연령금기", pc, ic, pn, iname, reason, source_date, age_val, age_cond, source),
            )
            n += 1
    print(f"  연령금기: {n:,}행")


def build_pregnancy_contraindication(conn: sqlite3.Connection) -> None:
    path = CSV_DIR / "DrugUtilizationReview_PregnancyContraindication_ProductList_2025_06.csv"
    source = "임부금기_2025_06"
    n = 0
    with open(path, encoding="cp949", errors="replace") as f:
        for row in csv.DictReader(f):
            pc = row["제품코드"].strip()
            pn = row["제품명"].strip()
            ic = row["성분코드"].strip()
            iname = row["성분명"].strip()
            grade = row["금기등급"].strip()
            reason = row["상세정보"].strip()
            source_date = row["고시일자"].strip()

            _ins_product(conn, pc, pn, ic, iname, row["업체명"].strip(), source)
            _add_aliases(conn, pc, pn, ic, iname, source)
            conn.execute(
                """INSERT INTO safety_rules
                   (category, product_code, ingredient_code, product_name, ingredient_name,
                    reason, source_date, age_value, age_condition, source)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                ("임부금기", pc, ic, pn, iname,
                 f"[등급{grade}] {reason}" if grade else reason,
                 source_date, None, None, source),
            )
            n += 1
    print(f"  임부금기: {n:,}행")


def build_narcotics(conn: sqlite3.Connection) -> None:
    path = CSV_DIR / "DrugUtilizationReview_Narcotics_ProductList_2025_06.csv"
    source = "마약_2025_06"
    n = 0
    with open(path, encoding="euc-kr", errors="replace") as f:
        for row in csv.DictReader(f):
            pc = row["제품코드"].strip()
            pn = row["제품명"].strip()
            ic = row["성분코드"].strip()
            iname = row["성분명"].strip()
            reason = row["약품상세정보"].strip()
            source_date = row["공고일자"].strip()

            _ins_product(conn, pc, pn, ic, iname, row["업소명"].strip(), source)
            _add_aliases(conn, pc, pn, ic, iname, source)
            conn.execute(
                """INSERT INTO safety_rules
                   (category, product_code, ingredient_code, product_name, ingredient_name,
                    reason, source_date, age_value, age_condition, source)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                ("마약", pc, ic, pn, iname, reason, source_date, None, None, source),
            )
            n += 1
    print(f"  마약: {n:,}행")


def build_narcotics_hematopoietic(conn: sqlite3.Connection) -> None:
    path = CSV_DIR / "DrugUtilizationReview_Narcotics_HematopoieticStemCellSuppressants_ProductList_2025_06.csv"
    source = "마약조혈모_2025_06"
    n = 0
    with open(path, encoding="euc-kr", errors="replace") as f:
        for row in csv.DictReader(f):
            pc = row["제품코드"].strip()
            pn = row["제품명"].strip()
            ic = row["성분코드"].strip()
            iname = row["성분명"].strip()
            reason = row["약품상세정보"].strip()

            _ins_product(conn, pc, pn, ic, iname, row["업소명"].strip(), source)
            _add_aliases(conn, pc, pn, ic, iname, source)
            conn.execute(
                """INSERT INTO safety_rules
                   (category, product_code, ingredient_code, product_name, ingredient_name,
                    reason, source_date, age_value, age_condition, source)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                ("마약/조혈모세포억제제", pc, ic, pn, iname, reason, None, None, None, source),
            )
            n += 1
    print(f"  마약/조혈모세포억제제: {n:,}행")


def build_concurrent_contraindication(conn: sqlite3.Connection) -> None:
    """
    병용금기 CSV는 제품 수준 크로스 테이블(약 83만 행).
    contraindication_pairs에는 성분코드 쌍으로 중복 제거해서 저장.
    drug_products / drug_aliases는 새 제품만 추가.
    """
    path = CSV_DIR / "DrugUtilizationReview_ConcurrentMedicationContraindication_ProductList_2025_06.csv"
    source = "병용금기_2025_06"

    seen_pairs: set[tuple[str, str]] = set()
    seen_products: set[str] = set()
    pair_count = 0
    row_count = 0
    COMMIT_EVERY = 20_000

    with open(path, encoding="euc-kr", errors="replace") as f:
        for row in csv.DictReader(f):
            row_count += 1

            ic_a = row["성분코드A"].strip()
            ic_b = row["성분코드B"].strip()
            in_a = row["성분명A"].strip()
            in_b = row["성분명B"].strip()
            pc_a = row["제품코드A"].strip()
            pc_b = row["제품코드B"].strip()
            pn_a = row["제품명A"].strip()
            pn_b = row["제품명B"].strip()
            co_a = row["업체명A"].strip()
            co_b = row["업체명B"].strip()
            reason = row["상세정보"].strip()
            source_date = row["고시일자"].strip()

            if pc_a and pc_a not in seen_products:
                _ins_product(conn, pc_a, pn_a, ic_a, in_a, co_a, source)
                _add_aliases(conn, pc_a, pn_a, ic_a, in_a, source)
                seen_products.add(pc_a)
            if pc_b and pc_b not in seen_products:
                _ins_product(conn, pc_b, pn_b, ic_b, in_b, co_b, source)
                _add_aliases(conn, pc_b, pn_b, ic_b, in_b, source)
                seen_products.add(pc_b)

            # 성분코드 쌍 중복 제거 (순서 정규화: 작은 값이 A)
            if ic_a and ic_b:
                key = (min(ic_a, ic_b), max(ic_a, ic_b))
                if key not in seen_pairs:
                    seen_pairs.add(key)
                    if ic_a > ic_b:
                        ic_a, ic_b = ic_b, ic_a
                        in_a, in_b = in_b, in_a
                        pc_a, pc_b = pc_b, pc_a
                        pn_a, pn_b = pn_b, pn_a
                    conn.execute(
                        """INSERT INTO contraindication_pairs
                           (ingredient_code_a, ingredient_code_b,
                            ingredient_name_a, ingredient_name_b,
                            product_code_a, product_code_b,
                            product_name_a, product_name_b,
                            reason, source_date, source)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (ic_a, ic_b, in_a, in_b, pc_a, pc_b, pn_a, pn_b,
                         reason, source_date, source),
                    )
                    pair_count += 1

            if row_count % COMMIT_EVERY == 0:
                conn.commit()
                print(f"    ... {row_count:,}행 처리 중 (성분쌍 {pair_count:,}개)")

    print(f"  병용금기: {row_count:,}행 → 성분쌍 {pair_count:,}개")


def main() -> None:
    for fname in CSV_FILES:
        p = CSV_DIR / fname
        if not p.exists():
            print(f"[경고] 파일 없음: {p}", file=sys.stderr)

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    print("테이블 생성 중...")
    create_tables(conn)
    conn.commit()

    print("연령금기 처리 중...")
    build_age_contraindication(conn)
    conn.commit()

    print("임부금기 처리 중...")
    build_pregnancy_contraindication(conn)
    conn.commit()

    print("마약 처리 중...")
    build_narcotics(conn)
    conn.commit()

    print("마약/조혈모세포억제제 처리 중...")
    build_narcotics_hematopoietic(conn)
    conn.commit()

    print("병용금기 처리 중 (대용량, 잠시 기다려주세요)...")
    build_concurrent_contraindication(conn)
    conn.commit()

    print("\n=== 최종 통계 ===")
    for table in ["drug_products", "drug_aliases", "safety_rules", "contraindication_pairs"]:
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {count:,}행")

    conn.execute("PRAGMA journal_mode=DELETE")
    conn.execute("VACUUM")
    conn.close()
    print(f"\n완료! DB: {DB_PATH}")


if __name__ == "__main__":
    main()
