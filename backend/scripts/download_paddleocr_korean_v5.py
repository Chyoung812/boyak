#!/usr/bin/env python3
"""Download PaddlePaddle Korean PP-OCRv5 recognition model from Hugging Face.

This only downloads the small Korean text recognition model (~13 MB).
For full OCR on pharmacy-bag photos, a text detector is still needed; the
comparison script can use PaddleOCR's default detector with this recognizer.
"""

from __future__ import annotations

import argparse
import hashlib
import sys
import urllib.request
from pathlib import Path

REPO = "PaddlePaddle/korean_PP-OCRv5_mobile_rec"
FILES = [
    "config.json",
    "inference.json",
    "inference.pdiparams",
    "inference.yml",
    "README.md",
]
DEFAULT_OUT = Path(__file__).resolve().parents[1] / "models" / "paddleocr" / "korean_PP-OCRv5_mobile_rec"


def sha256_prefix(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def download_file(name: str, out_dir: Path, force: bool = False) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / name
    url = f"https://huggingface.co/{REPO}/resolve/main/{name}"
    if dest.exists() and not force:
        print(f"SKIP {name} {dest.stat().st_size} bytes sha256={sha256_prefix(dest)}")
        return
    print(f"GET  {name}")
    req = urllib.request.Request(url, headers={"User-Agent": "Boyak-PaddleOCR-Spike/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp, dest.open("wb") as f:
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)
    print(f"OK   {name} {dest.stat().st_size} bytes sha256={sha256_prefix(dest)}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    for name in FILES:
        download_file(name, args.out, args.force)
    total = sum((args.out / name).stat().st_size for name in FILES if (args.out / name).exists())
    print(f"DONE out={args.out} total_mb={total / 1024 / 1024:.2f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
