#!/usr/bin/env python3
"""Compare Clova OCR and PaddleOCR on pharmacy-bag sample images.

Input directory layout:
  backend/data/ocr_samples/
    001_bright_front.jpg
    002_tilted.jpg
    labels.json  # optional

Optional labels.json format:
{
  "001_bright_front.jpg": ["타이레놀정", "아모잘탄정"],
  "002_tilted.jpg": ["..."]
}

Outputs JSONL rows to backend/data/ocr_eval/ocr_compare_YYYYmmdd_HHMMSS.jsonl.
No API keys or secrets are printed.
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import re
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List

import httpx
from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SAMPLE_DIR = BACKEND_ROOT / "data" / "ocr_samples"
DEFAULT_OUT_DIR = BACKEND_ROOT / "data" / "ocr_eval"
DEFAULT_PADDLE_REC_DIR = BACKEND_ROOT / "models" / "paddleocr" / "korean_PP-OCRv5_mobile_rec"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
DRUG_SUFFIX_RE = re.compile(r"(정|캡슐|캅셀|시럽|현탁액|과립|연고|크림|액|주사|점안액|패취|패치)$")


def load_settings() -> dict:
    load_dotenv(BACKEND_ROOT / ".env")
    return {
        "clova_url": os.getenv("NAVER_CLOVA_OCR_INVOKE_URL", "").strip(),
        "clova_secret": os.getenv("NAVER_CLOVA_OCR_SECRET", "").strip(),
    }


def image_files(sample_dir: Path) -> List[Path]:
    if not sample_dir.exists():
        return []
    return sorted(p for p in sample_dir.iterdir() if p.suffix.lower() in IMAGE_EXTS)


def load_labels(sample_dir: Path) -> Dict[str, List[str]]:
    p = sample_dir / "labels.json"
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding="utf-8"))


def normalize_text(text: str) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", str(text or "").lower())


def candidate_drug_like_lines(lines: Iterable[str]) -> List[str]:
    out = []
    seen = set()
    noise = re.compile(r"(병원|의원|약국|주소|전화|TEL|복용|식후|식전|일분|일간|조제|환자|처방|원외|보험|본인부담)", re.I)
    for raw in lines:
        text = str(raw or "").strip()
        if len(text) < 2 or noise.search(text):
            continue
        compact = re.sub(r"\s+", "", text)
        # 약명은 보통 제형/용량 단서가 있거나 한글 3자 이상.
        if not (DRUG_SUFFIX_RE.search(compact) or re.search(r"\d+\s*(mg|㎎|g|ml)", compact, re.I) or len(normalize_text(compact)) >= 3):
            continue
        key = normalize_text(compact)
        if key and key not in seen:
            seen.add(key)
            out.append(text)
    return out[:30]


def score_against_labels(lines: List[str], labels: List[str]) -> dict:
    if not labels:
        return {"label_count": 0, "hit_count": None, "recall": None, "hits": []}
    norm_lines = [normalize_text(x) for x in lines]
    hits = []
    for label in labels:
        nl = normalize_text(label)
        if any(nl and (nl in line or line in nl) for line in norm_lines):
            hits.append(label)
    return {"label_count": len(labels), "hit_count": len(hits), "recall": round(len(hits) / len(labels), 3), "hits": hits}


def run_clova(path: Path, settings: dict, timeout: float = 20.0) -> dict:
    if not settings["clova_url"] or not settings["clova_secret"]:
        return {"ok": False, "error": "missing_clova_env", "lines": []}
    mime = mimetypes.guess_type(path.name)[0] or "image/jpeg"
    payload = {
        "version": "V2",
        "requestId": str(uuid.uuid4()),
        "timestamp": int(time.time() * 1000),
        "images": [{
            "format": path.suffix.lower().lstrip(".") or "jpg",
            "name": path.stem,
            "data": base64.b64encode(path.read_bytes()).decode("ascii"),
        }],
    }
    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(
                settings["clova_url"],
                headers={"X-OCR-SECRET": settings["clova_secret"], "Content-Type": "application/json"},
                json=payload,
            )
        data = resp.json()
        fields = (data.get("images") or [{}])[0].get("fields") or []
        lines = [f.get("inferText", "") for f in fields if f.get("inferText")]
        return {"ok": resp.is_success, "status_code": resp.status_code, "lines": lines, "raw_field_count": len(fields)}
    except Exception as e:
        return {"ok": False, "error": type(e).__name__, "message": str(e)[:200], "lines": []}


def run_paddle(path: Path, rec_model_dir: Path | None = None) -> dict:
    try:
        from paddleocr import PaddleOCR  # type: ignore
    except Exception as e:
        return {"ok": False, "error": "paddleocr_not_installed", "message": str(e)[:200], "lines": []}

    kwargs = {"lang": "korean", "use_textline_orientation": True}
    # PaddleOCR 3.x uses text_recognition_model_dir; older versions used rec_model_dir.
    tried_custom = False
    if rec_model_dir and rec_model_dir.exists():
        kwargs["text_recognition_model_dir"] = str(rec_model_dir)
        tried_custom = True
    try:
        ocr = PaddleOCR(**kwargs)
    except Exception:
        kwargs.pop("text_recognition_model_dir", None)
        ocr = PaddleOCR(**kwargs)
        tried_custom = False
    try:
        try:
            result = ocr.predict(str(path))
        except Exception:
            result = ocr.ocr(str(path))
        lines = []
        for page in result or []:
            if isinstance(page, dict):
                texts = page.get("rec_texts") or page.get("texts") or []
                lines.extend(str(x) for x in texts if x)
                continue
            # legacy list format: [[box, (text, score)], ...]
            for item in page or []:
                if isinstance(item, dict):
                    text = item.get("text") or item.get("rec_text")
                    if text:
                        lines.append(str(text))
                elif len(item) >= 2 and item[1]:
                    if isinstance(item[1], (list, tuple)):
                        lines.append(str(item[1][0]))
                    else:
                        lines.append(str(item[1]))
        return {"ok": True, "lines": lines, "raw_field_count": len(lines), "used_custom_rec_model": tried_custom}
    except Exception as e:
        return {"ok": False, "error": type(e).__name__, "message": str(e)[:200], "lines": [], "used_custom_rec_model": tried_custom}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=Path, default=DEFAULT_SAMPLE_DIR)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    parser.add_argument("--engine", choices=["all", "clova", "paddle"], default="all")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--paddle-rec-dir", type=Path, default=DEFAULT_PADDLE_REC_DIR)
    args = parser.parse_args()

    files = image_files(args.samples)
    if args.limit:
        files = files[: args.limit]
    args.out_dir.mkdir(parents=True, exist_ok=True)
    out_path = args.out_dir / f"ocr_compare_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonl"
    labels = load_labels(args.samples)
    settings = load_settings()

    if not files:
        print(f"NO_IMAGES sample_dir={args.samples}")
        print("Put pharmacy-bag photos in backend/data/ocr_samples/ and rerun.")
        return 2

    with out_path.open("w", encoding="utf-8") as out:
        for path in files:
            label = labels.get(path.name, [])
            row: Dict[str, Any] = {"file": path.name, "labels": label, "engines": {}}
            if args.engine in {"all", "clova"}:
                clova = run_clova(path, settings)
                clova["drug_like_candidates"] = candidate_drug_like_lines(clova.get("lines", []))
                clova["score"] = score_against_labels(clova["drug_like_candidates"], label)
                row["engines"]["clova"] = clova
            if args.engine in {"all", "paddle"}:
                paddle = run_paddle(path, args.paddle_rec_dir)
                paddle["drug_like_candidates"] = candidate_drug_like_lines(paddle.get("lines", []))
                paddle["score"] = score_against_labels(paddle["drug_like_candidates"], label)
                row["engines"]["paddle"] = paddle
            out.write(json.dumps(row, ensure_ascii=False) + "\n")
            print(json.dumps({"file": path.name, "summary": {k: {"ok": v.get("ok"), "n_lines": len(v.get("lines", [])), "candidates": v.get("drug_like_candidates", [])[:5], "score": v.get("score")} for k, v in row["engines"].items()}}, ensure_ascii=False))
    print(f"WROTE {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
