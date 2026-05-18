#!/usr/bin/env python3
import csv
import re
import sqlite3
from pathlib import Path
from typing import Dict, Iterable, Tuple

BACKEND_ROOT = Path(__file__).resolve().parents[1]
RAW_ROOT = BACKEND_ROOT / "data" / "raw"
DB_PATH = BACKEND_ROOT / "data" / "processed" / "dur_index.sqlite3"
DUR_LIST_ROOT = RAW_ROOT / "dur_drug_list" / "건강보험심사평가원_의약품안전사용서비스(DUR) 의약품 목록_20250601"
CONTRA_FILE = RAW_ROOT / "dur_contraindications" / "한국의약품안전관리원_병용금기약물_20240625.csv"

FILES = {
    "elderly": DUR_LIST_ROOT / "의약품안전사용서비스(DUR)_노인주의 품목리스트 2025.6.csv",
    "elderly_nsaid": DUR_LIST_ROOT / "의약품안전사용서비스(DUR)_노인주의(해열진통소염제) 품목리스트 2025.6.csv",
    "age": DUR_LIST_ROOT / "의약품안전사용서비스(DUR)_연령금기 품목리스트 2025.6.csv",
    "pregnancy": DUR_LIST_ROOT / "의약품안전사용서비스(DUR)_임부금기 품목리스트 2025.6.csv",
    "combo": DUR_LIST_ROOT / "의약품안전사용서비스(DUR)_병용금기 품목리스트 2025.6.csv",
    "combo_kaids": CONTRA_FILE,
}


def norm(text: str) -> str:
    text = str(text or "").lower()
    return re.sub(r"[^0-9a-z가-힣]+", "", text)


def simple_name(product_name: str) -> str:
    s = str(product_name or "")
    s = s.split("_")[0]
    s = re.sub(r"\([^)]*\)", "", s)
    s = re.sub(r"\[[^]]*\]", "", s)
    return s.strip()


def read_rows(path: Path) -> Iterable[Dict[str, str]]:
    if not path.exists():
        return
    for enc in ("utf-8-sig", "cp949", "euc-kr"):
        try:
            with path.open("r", encoding=enc, newline="") as f:
                yield from csv.DictReader(f)
            return
        except UnicodeDecodeError:
            continue


def setup(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        PRAGMA journal_mode=OFF;
        PRAGMA synchronous=OFF;
        DROP TABLE IF EXISTS drug_products;
        DROP TABLE IF EXISTS drug_aliases;
        DROP TABLE IF EXISTS safety_rules;
        DROP TABLE IF EXISTS contraindication_pairs;

        CREATE TABLE drug_products (
          product_code TEXT PRIMARY KEY,
          product_name TEXT,
          product_name_simple TEXT,
          product_name_norm TEXT,
          ingredient_code TEXT,
          ingredient_name TEXT,
          ingredient_name_norm TEXT,
          company TEXT,
          source TEXT
        );

        CREATE TABLE drug_aliases (
          alias_norm TEXT,
          alias TEXT,
          product_code TEXT,
          ingredient_code TEXT,
          weight INTEGER,
          source TEXT,
          UNIQUE(alias_norm, product_code, ingredient_code)
        );

        CREATE TABLE safety_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT,
          product_code TEXT,
          ingredient_code TEXT,
          product_name TEXT,
          ingredient_name TEXT,
          reason TEXT,
          source_date TEXT,
          age_value TEXT,
          age_condition TEXT,
          source TEXT
        );

        CREATE TABLE contraindication_pairs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ingredient_code_a TEXT,
          ingredient_code_b TEXT,
          ingredient_name_a TEXT,
          ingredient_name_b TEXT,
          product_code_a TEXT,
          product_code_b TEXT,
          product_name_a TEXT,
          product_name_b TEXT,
          reason TEXT,
          source_date TEXT,
          source TEXT
        );
        """
    )


def upsert_product(conn: sqlite3.Connection, row: Dict[str, str], source: str, suffix: str = "") -> None:
    pc = row.get(f"제품코드{suffix}") or row.get("제품코드") or ""
    pn = row.get(f"제품명{suffix}") or row.get("제품명") or ""
    ic = row.get(f"성분코드{suffix}") or row.get("성분코드") or ""
    inn = row.get(f"성분명{suffix}") or row.get("성분명") or ""
    company = row.get(f"업체명{suffix}") or row.get(f"업소명{suffix}") or row.get("업체명") or row.get("업소명") or ""
    if not pc or not pn:
        return
    ps = simple_name(pn)
    conn.execute(
        """
        INSERT OR IGNORE INTO drug_products
        (product_code, product_name, product_name_simple, product_name_norm, ingredient_code, ingredient_name, ingredient_name_norm, company, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (pc, pn, ps, norm(pn), ic, inn, norm(inn), company, source),
    )
    aliases = [(pn, 100), (ps, 90), (inn, 70)]
    for alias, weight in aliases:
        an = norm(alias)
        if an:
            conn.execute(
                "INSERT OR IGNORE INTO drug_aliases(alias_norm, alias, product_code, ingredient_code, weight, source) VALUES (?, ?, ?, ?, ?, ?)",
                (an, alias, pc, ic, weight, source),
            )


def add_safety_rule(conn: sqlite3.Connection, row: Dict[str, str], category: str, source: str) -> None:
    pc = row.get("제품코드") or ""
    pn = row.get("제품명") or ""
    ic = row.get("성분코드") or ""
    inn = row.get("성분명") or ""
    if not (pc or ic):
        return
    reason = row.get("약품상세정보") or row.get("상세정보") or row.get("금기사유") or "확인 필요"
    source_date = row.get("공고일자") or row.get("고시일자") or ""
    conn.execute(
        """
        INSERT INTO safety_rules(category, product_code, ingredient_code, product_name, ingredient_name, reason, source_date, age_value, age_condition, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (category, pc, ic, pn, inn, reason, source_date, row.get("특정연령", ""), row.get("연령처리조건", ""), source),
    )


def add_pair(conn: sqlite3.Connection, row: Dict[str, str], source: str, style: str) -> None:
    if style == "AB":
        a = (row.get("성분코드A", ""), row.get("성분명A", ""), row.get("제품코드A", ""), row.get("제품명A", ""))
        b = (row.get("성분코드B", ""), row.get("성분명B", ""), row.get("제품코드B", ""), row.get("제품명B", ""))
    else:
        a = (row.get("성분코드1", ""), row.get("성분명1", ""), row.get("제품코드1", ""), row.get("제품명1", ""))
        b = (row.get("성분코드2", ""), row.get("성분명2", ""), row.get("제품코드2", ""), row.get("제품명2", ""))
    if not a[0] or not b[0]:
        return
    reason = row.get("상세정보") or row.get("금기사유") or "함께 복용 주의"
    source_date = row.get("고시일자") or row.get("공고일자") or ""
    conn.execute(
        """
        INSERT INTO contraindication_pairs
        (ingredient_code_a, ingredient_code_b, ingredient_name_a, ingredient_name_b, product_code_a, product_code_b, product_name_a, product_name_b, reason, source_date, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (a[0], b[0], a[1], b[1], a[2], b[2], a[3], b[3], reason, source_date, source),
    )


def create_indexes(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE INDEX idx_alias_norm ON drug_aliases(alias_norm);
        CREATE INDEX idx_alias_product ON drug_aliases(product_code);
        CREATE INDEX idx_products_ingredient ON drug_products(ingredient_code);
        CREATE INDEX idx_rules_product ON safety_rules(product_code);
        CREATE INDEX idx_rules_ingredient ON safety_rules(ingredient_code);
        CREATE INDEX idx_rules_category ON safety_rules(category);
        CREATE INDEX idx_pairs_a ON contraindication_pairs(ingredient_code_a);
        CREATE INDEX idx_pairs_b ON contraindication_pairs(ingredient_code_b);
        CREATE INDEX idx_pairs_ab ON contraindication_pairs(ingredient_code_a, ingredient_code_b);
        """
    )


def main() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if DB_PATH.exists():
        DB_PATH.unlink()
    conn = sqlite3.connect(DB_PATH)
    setup(conn)
    counts = {}

    for key, path in FILES.items():
        count = 0
        for row in read_rows(path) or []:
            count += 1
            if key in {"combo", "combo_kaids"}:
                style = "AB" if key == "combo" else "12"
                upsert_product(conn, row, key, "A" if style == "AB" else "1")
                upsert_product(conn, row, key, "B" if style == "AB" else "2")
                add_pair(conn, row, key, style)
            else:
                upsert_product(conn, row, key)
                category = {
                    "elderly": "노인주의",
                    "elderly_nsaid": "노인주의",
                    "age": "연령금기",
                    "pregnancy": "임부금기",
                }[key]
                add_safety_rule(conn, row, category, key)
            if count % 50000 == 0:
                conn.commit()
        counts[key] = count
        conn.commit()

    create_indexes(conn)
    conn.commit()
    summary = {"files": counts}
    for table in ["drug_products", "drug_aliases", "safety_rules", "contraindication_pairs"]:
        summary[table] = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    conn.close()
    print(summary)
    print(DB_PATH)


if __name__ == "__main__":
    main()
