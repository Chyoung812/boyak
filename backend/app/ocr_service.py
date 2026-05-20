import base64
import re
import time
import uuid
from typing import Any, Dict, List

from fastapi import UploadFile

from app.config import get_settings


async def extract_medicine_bags_from_images(files: List[UploadFile]) -> Dict[str, Any]:
    """약봉투 이미지 → 네이버 클라우드 OCR로 약 이름 후보 목록 추출."""
    settings = get_settings()
    if not settings.naver_clova_ocr_invoke_url or not settings.naver_clova_ocr_secret:
        return {
            "ok": False,
            "reason": "NAVER_CLOVA_OCR_INVOKE_URL 또는 NAVER_CLOVA_OCR_SECRET이 설정되지 않았습니다.",
            "bag_count": 0,
            "medicine_bags": [],
        }

    bags = []
    for i, file in enumerate(files):
        raw = await file.read()
        ocr_result = await _ocr_with_naver_clova(
            image_bytes=raw,
            filename=file.filename or f"image_{i + 1}.jpg",
            content_type=file.content_type or "image/jpeg",
            settings=settings,
        )
        names = ocr_result["medicine_names"]

        bags.append({
            "bag_id": f"bag_{i + 1}",
            "source_label": file.filename or f"이미지 {i + 1}",
            "medicine_names": names,
            "ocr_source": "naver_clova_ocr",
            "ocr_error": ocr_result["error"],
            "ocr_candidate_names": ocr_result["candidate_names"],
            "ocr_matched_names": ocr_result["matched_names"],
            "ocr_raw_texts": ocr_result["raw_texts"],
        })

    if bags and all(bag.get("ocr_error") for bag in bags):
        return {
            "ok": False,
            "reason": bags[0]["ocr_error"],
            "bag_count": len(bags),
            "medicine_bags": bags,
        }

    return {"ok": True, "bag_count": len(bags), "medicine_bags": bags}


async def _ocr_with_naver_clova(
    image_bytes: bytes,
    filename: str,
    content_type: str,
    settings,
) -> Dict[str, Any]:
    try:
        import httpx

        payload = {
            "version": "V2",
            "requestId": str(uuid.uuid4()),
            "timestamp": int(time.time() * 1000),
            "lang": "ko",
            "images": [
                {
                    "format": _image_format(filename, content_type),
                    "name": filename,
                    "data": base64.b64encode(image_bytes).decode("utf-8"),
                }
            ],
        }

        async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
            response = await client.post(
                _naver_ocr_url(settings.naver_clova_ocr_invoke_url),
                headers={
                    "Content-Type": "application/json",
                    "X-OCR-SECRET": settings.naver_clova_ocr_secret,
                },
                json=payload,
            )
            response.raise_for_status()

        ocr_json = response.json()
        ocr_error = _extract_naver_ocr_error(ocr_json)
        raw_texts = _extract_naver_ocr_texts(ocr_json)
        candidates = _filter_medicine_name_candidates(raw_texts)
        matched = _match_db_candidates(candidates)
        return {
            "medicine_names": matched or candidates,
            "candidate_names": candidates,
            "matched_names": matched,
            "raw_texts": raw_texts[:80],
            "error": ocr_error,
        }
    except Exception as exc:
        import traceback

        traceback.print_exc()
        return {
            "medicine_names": [],
            "candidate_names": [],
            "matched_names": [],
            "raw_texts": [],
            "error": f"네이버 OCR 호출에 실패했습니다: {_format_ocr_exception(exc)}",
        }


def _naver_ocr_url(url: str) -> str:
    if url.startswith("http://"):
        return "https://" + url[len("http://"):]
    return url


def _format_ocr_exception(exc: Exception) -> str:
    try:
        import httpx

        if isinstance(exc, httpx.HTTPStatusError):
            response_text = exc.response.text[:300] if exc.response is not None else ""
            return f"{type(exc).__name__} {exc.response.status_code} {response_text}".strip()
        if isinstance(exc, httpx.TimeoutException):
            return f"{type(exc).__name__}: 네이버 OCR 응답 시간이 초과됐습니다."
        if isinstance(exc, httpx.RequestError):
            return f"{type(exc).__name__}: {exc}"
    except Exception:
        pass

    message = str(exc).strip()
    return f"{type(exc).__name__}: {message}" if message else type(exc).__name__


def _image_format(filename: str, content_type: str) -> str:
    content_type = (content_type or "").lower()
    if "png" in content_type:
        return "png"
    if "pdf" in content_type:
        return "pdf"
    if "tiff" in content_type or "tif" in content_type:
        return "tiff"

    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension in {"jpg", "jpeg", "png", "pdf", "tif", "tiff"}:
        return "jpg" if extension == "jpeg" else extension
    return "jpg"


def _extract_naver_ocr_texts(result: Dict[str, Any]) -> List[str]:
    texts: List[str] = []
    for image in result.get("images", []):
        line_parts: List[str] = []
        for field in image.get("fields", []):
            text = str(field.get("inferText") or "").strip()
            if not text:
                continue

            texts.append(text)
            line_parts.append(text)
            if field.get("lineBreak"):
                texts.append(" ".join(line_parts))
                line_parts = []

        if line_parts:
            texts.append(" ".join(line_parts))
    return texts


def _extract_naver_ocr_error(result: Dict[str, Any]) -> str:
    messages: List[str] = []
    for image in result.get("images", []):
        infer_result = str(image.get("inferResult") or "").upper()
        message = str(image.get("message") or "").strip()
        if infer_result and infer_result != "SUCCESS":
            messages.append(message or f"네이버 OCR 이미지 처리 상태: {infer_result}")
    return " / ".join(messages)


def _filter_medicine_name_candidates(texts: List[str]) -> List[str]:
    skip_patterns = [
        r"^\d+$",
        r"(복약안내|발행기관|최근내방|성\s*명|홍길동|생년|보험|본인|부담|비급여|영수|현금|승인|사업자|등록)",
        r"(약국|병원|의원|처방|조제|전화|팩스|주소|환자|약\s*제\s*비|일자|완료일)",
        r"(주의사항|보관|상담|문의|원외|투약|약봉투|전문가|상의|알리세요|미리|지속되면)",
        r"(복용|용법|용량|아침|점심|저녁|취침|식전|식후|매일|일\s*\d+\s*회)",
        r"(치료제|강하제|확장|억제|예방|개선|작용|증상|감염증|소화장애)",
        r"^\d+\s*(일|회|정|포|개|번)$",
    ]
    medicine_hints = re.compile(
        r"(정|캡슐|캅셀|시럽|현탁|과립|산|액|점안|연고|크림|패취|패치|주사|"
        r"mg|㎎|밀리그램|mcg|μg|g|ml|mL|%)",
        re.IGNORECASE,
    )

    candidates: List[str] = []
    seen = set()
    for text in texts:
        cleaned = _clean_ocr_text(text)
        if not cleaned or len(cleaned) < 2 or len(cleaned) > 50:
            continue
        if any(re.search(pattern, cleaned, re.IGNORECASE) for pattern in skip_patterns):
            continue
        if not re.search(r"[가-힣A-Za-z]", cleaned):
            continue

        compact = re.sub(r"\s+", "", cleaned)
        has_space_sentence = " " in cleaned and not medicine_hints.search(cleaned)
        if has_space_sentence:
            continue
        if len(compact) < 3:
            continue
        if compact in seen:
            continue

        seen.add(compact)
        candidates.append(cleaned)

    return candidates[:40]


def _clean_ocr_text(text: str) -> str:
    cleaned = str(text or "").strip(" [](){}:;,.\"'")
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = cleaned.replace(" O", "0").replace("Omg", "0mg").replace("OOmg", "100mg")
    cleaned = cleaned.replace("㎎", "mg")
    return cleaned.strip()


def _match_db_candidates(candidates: List[str]) -> List[str]:
    try:
        from app.drug_index_service import has_db, normalize_medicine_names

        if not has_db():
            return candidates

        result = normalize_medicine_names(candidates, limit_per_name=1)
        matched: List[str] = []
        seen = set()
        for item in result.get("items", []):
            if not item.get("top_candidate"):
                continue
            text = item.get("input") or ""
            key = re.sub(r"\s+", "", text)
            if key and key not in seen:
                seen.add(key)
                matched.append(text)
        return matched
    except Exception:
        return candidates
