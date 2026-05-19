"""
보약 백엔드 엔드포인트 검증 스크립트
실행: python scripts/validate_endpoints.py
사전 조건: uvicorn app.main:app --port 8001 이 실행 중이어야 함
"""

import json
import sys
import time
from pathlib import Path

import httpx

BASE = "http://localhost:8001"
RESULTS: list[dict] = []


def check(name: str, method: str, path: str, **kwargs) -> dict:
    url = f"{BASE}{path}"
    try:
        start = time.perf_counter()
        resp = httpx.request(method, url, timeout=15, **kwargs)
        ms = round((time.perf_counter() - start) * 1000)
        ok = resp.status_code < 400
        body = resp.json() if "json" in resp.headers.get("content-type", "") else {}
        result = {
            "name": name, "method": method, "path": path,
            "status": resp.status_code, "ok": ok, "ms": ms,
            "preview": str(body)[:200],
        }
    except Exception as e:
        result = {
            "name": name, "method": method, "path": path,
            "status": -1, "ok": False, "ms": -1,
            "preview": str(e)[:200],
        }
    RESULTS.append(result)
    mark = "✅" if result["ok"] else "❌"
    print(f"  {mark} [{result['status']}] {name} ({result['ms']}ms)")
    if not result["ok"]:
        print(f"     └── {result['preview']}")
    return result


def main():
    print(f"\n{'='*60}")
    print("보약 백엔드 엔드포인트 검증")
    print(f"대상: {BASE}")
    print(f"{'='*60}\n")

    # ── 기본 ──────────────────────────────────────────────────────
    print("[ 기본 ]")
    check("헬스체크", "GET", "/api/health")
    check("데이터소스 목록", "GET", "/api/sources")

    # ── 병원비 ────────────────────────────────────────────────────
    print("\n[ 병원비 예상 ]")
    check("무릎 X-ray 비용", "GET", "/api/costs/estimate",
          params={"body": "무릎", "treatment": "X-ray 검사"})
    check("허리 진찰 비용", "GET", "/api/costs/estimate",
          params={"body": "허리", "treatment": "진찰만"})

    # ── 약 정규화 ─────────────────────────────────────────────────
    print("\n[ 약 이름 정규화 (심평원 API fallback) ]")
    check("타이레놀 검색", "POST", "/api/medicines/normalize",
          json={"medicine_names": ["타이레놀"]})
    check("아모잘탄 검색", "POST", "/api/medicines/normalize",
          json={"medicine_names": ["아모잘탄정"]})
    check("복수 약 검색", "POST", "/api/medicines/normalize",
          json={"medicine_names": ["타이레놀", "게보린", "이부프로펜"]})

    # ── DUR 안전확인 ──────────────────────────────────────────────
    print("\n[ DUR 약 안전확인 ]")
    check("기본 안전확인", "POST", "/api/safety/check",
          json={"medicine_names": ["타이레놀정500밀리그램", "이부프로펜"], "age": 72})
    check("약봉투 묶음 안전확인", "POST", "/api/safety/check-bags",
          json={"medicine_bags": [
              {"bag_id": "photo_1", "source_label": "내과", "medicine_names": ["아스피린"]},
              {"bag_id": "photo_2", "source_label": "정형외과", "medicine_names": ["이부프로펜"]},
          ], "age": 68})
    check("선택 약 안전확인", "POST", "/api/safety/check-selected",
          json={"selected_medicines": [
              {"display_name": "타이레놀정500mg", "ingredient_code": "A11AA01", "product_code": ""},
          ], "age": 75})

    # ── 병원 검색 (TMap) ──────────────────────────────────────────
    print("\n[ 병원 검색 (TMap POI + 보행자 경로) ]")
    check("증상 분석 - 허리", "POST", "/api/hospitals/analyze",
          json={"symptom": "허리가 아파요"})
    check("증상 분석 - 두통", "POST", "/api/hospitals/analyze",
          json={"symptom": "두통이 심해요"})
    check("근처 정형외과 검색 (서울시청 기준)", "POST", "/api/hospitals/nearby",
          json={"department": "정형외과", "lat": 37.5665, "lon": 126.9780})

    # ── AI 라우팅 ─────────────────────────────────────────────────
    print("\n[ AI 라우팅 ]")
    check("AI 라우팅 - 약질문", "POST", "/api/ai/route",
          json={"text": "이 약 같이 먹어도 돼요?"})

    # ── 결과 집계 ─────────────────────────────────────────────────
    passed = sum(1 for r in RESULTS if r["ok"])
    total = len(RESULTS)
    print(f"\n{'='*60}")
    print(f"결과: {passed}/{total} 통과")

    # 로그 파일로 저장
    log_dir = Path(__file__).resolve().parents[1] / "logs"
    log_dir.mkdir(exist_ok=True)
    report_path = log_dir / f"validation_{time.strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "base_url": BASE,
            "passed": passed,
            "total": total,
            "results": RESULTS,
        }, f, ensure_ascii=False, indent=2)
    print(f"검증 결과 저장: {report_path}")
    print(f"{'='*60}\n")

    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
