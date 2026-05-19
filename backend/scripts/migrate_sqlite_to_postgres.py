#!/usr/bin/env python3
"""Migrate the generated DUR SQLite index to Postgres/Neon.

Usage:
  DATABASE_URL='postgresql://...' python scripts/migrate_sqlite_to_postgres.py

Local dev can keep using backend/data/processed/dur_index.sqlite3. Production uses
DATABASE_URL and the same four generated tables in Postgres.
"""
import os
import sqlite3
from pathlib import Path
from typing import Iterable

try:
    import psycopg
except ImportError as exc:
    raise SystemExit("psycopg is required. Run: pip install 'psycopg[binary]'") from exc

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - python-dotenv is in requirements.txt
    load_dotenv = None

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if load_dotenv:
    load_dotenv(BACKEND_ROOT / ".env", override=False)

SQLITE_PATH = Path(os.getenv("SQLITE_PATH", BACKEND_ROOT / "data" / "processed" / "dur_index.sqlite3"))
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
BATCH_SIZE = int(os.getenv("MIGRATE_BATCH_SIZE", "10000"))
# Neon free tier is usually too small for 1.38M product-level pair rows.
# Default to ingredient-pair dedupe; set MIGRATE_PAIR_MODE=full only on a larger Postgres plan.
PAIR_MODE = os.getenv("MIGRATE_PAIR_MODE", "ingredient_unique").strip().lower()

SCHEMA_SQL = """
DROP TABLE IF EXISTS contraindication_pairs;
DROP TABLE IF EXISTS safety_rules;
DROP TABLE IF EXISTS drug_aliases;
DROP TABLE IF EXISTS drug_products;

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
  id BIGSERIAL PRIMARY KEY,
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
  id BIGSERIAL PRIMARY KEY,
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

INDEX_SQL = """
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

TABLES = {
    "drug_products": [
        "product_code", "product_name", "product_name_simple", "product_name_norm", "ingredient_code",
        "ingredient_name", "ingredient_name_norm", "company", "source",
    ],
    "drug_aliases": ["alias_norm", "alias", "product_code", "ingredient_code", "weight", "source"],
    "safety_rules": [
        "category", "product_code", "ingredient_code", "product_name", "ingredient_name", "reason",
        "source_date", "age_value", "age_condition", "source",
    ],
    "contraindication_pairs": [
        "ingredient_code_a", "ingredient_code_b", "ingredient_name_a", "ingredient_name_b",
        "product_code_a", "product_code_b", "product_name_a", "product_name_b",
        "reason", "source_date", "source",
    ],
}


def chunks(cursor: sqlite3.Cursor) -> Iterable[list[sqlite3.Row]]:
    while True:
        batch = cursor.fetchmany(BATCH_SIZE)
        if not batch:
            break
        yield batch


def select_sql_for(table: str, columns: list[str]) -> str:
    if table != "contraindication_pairs" or PAIR_MODE == "full":
        return f"SELECT {', '.join(columns)} FROM {table}"
    if PAIR_MODE not in {"ingredient_unique", "dedupe", "slim"}:
        raise SystemExit(f"Unsupported MIGRATE_PAIR_MODE={PAIR_MODE!r}; use ingredient_unique or full")
    # Keep one representative row per 성분코드 pair. The backend checks interactions by
    # ingredient_code_a/b, so this preserves pair detection while fitting Neon free tier.
    return """
        SELECT
          ingredient_code_a,
          ingredient_code_b,
          MIN(ingredient_name_a) AS ingredient_name_a,
          MIN(ingredient_name_b) AS ingredient_name_b,
          MIN(product_code_a) AS product_code_a,
          MIN(product_code_b) AS product_code_b,
          MIN(product_name_a) AS product_name_a,
          MIN(product_name_b) AS product_name_b,
          MIN(reason) AS reason,
          MIN(source_date) AS source_date,
          MIN(source) AS source
        FROM contraindication_pairs
        GROUP BY ingredient_code_a, ingredient_code_b
    """


def migrate_table(sqlite_conn: sqlite3.Connection, pg_conn, table: str, columns: list[str]) -> int:
    select_sql = select_sql_for(table, columns)
    sqlite_cur = sqlite_conn.execute(select_sql)
    total = 0
    col_sql = ", ".join(columns)
    placeholder_sql = ", ".join(["%s"] * len(columns))
    insert_sql = f"INSERT INTO {table} ({col_sql}) VALUES ({placeholder_sql})"
    with pg_conn.cursor() as cur:
        for batch in chunks(sqlite_cur):
            rows = [tuple(row[col] for col in columns) for row in batch]
            cur.executemany(insert_sql, rows)
            total += len(rows)
            if total % 100000 == 0:
                pg_conn.commit()
                print(f"{table}: {total:,}")
    pg_conn.commit()
    return total


def main() -> None:
    if not DATABASE_URL:
        raise SystemExit("DATABASE_URL is required")
    if not SQLITE_PATH.exists():
        raise SystemExit(f"SQLite file not found: {SQLITE_PATH}")

    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    with psycopg.connect(DATABASE_URL) as pg_conn:
        with pg_conn.cursor() as cur:
            cur.execute(SCHEMA_SQL)
        pg_conn.commit()

        summary = {}
        for table, columns in TABLES.items():
            summary[table] = migrate_table(sqlite_conn, pg_conn, table, columns)

        with pg_conn.cursor() as cur:
            cur.execute(INDEX_SQL)
        pg_conn.commit()

        with pg_conn.cursor() as cur:
            cur.execute("ANALYZE")
        pg_conn.commit()

    sqlite_conn.close()
    print(summary)
    if PAIR_MODE != "full":
        print("contraindication_pairs migrated as ingredient-level deduped rows; set MIGRATE_PAIR_MODE=full for product-level rows on a larger Postgres plan")
    print("Postgres migration complete")


if __name__ == "__main__":
    main()
