# 약봉투/알약 인식 평가 메모

## 현재 약 데이터 역할

- `dur_index.sqlite3`: 약명 후보 정규화, 제품/성분코드, DUR 안전검사 핵심 데이터.
- Neon DUR 테이블: 배포/공유용 DUR DB. 로컬 SQLite와 같은 역할을 Postgres에서 하도록 확장 가능.
- EasyDrug API: 약 효능/용법을 쉬운 말로 설명하는 보조 데이터. 안전판정 근거로 쓰지 않는다.
- 낱알식별 API(`MdcinGrnIdntfcInfoService03`): 색상/모양/각인으로 알약 후보를 찾는 데이터. 알약 사진 기능의 핵심 후보.

## OCR 평가 방향

1. Clova OCR 결과 수집.
2. PaddleOCR Korean v5 결과 수집.
3. OCR 텍스트에서 약명처럼 보이는 줄만 후보화.
4. `drug_index_service.normalize_medicine_names()`로 DUR DB 후보에 매칭.
5. top1/top3 정확도, 병원명/주소 오인율, 실패 유형을 기록.

## 색상 알약 UX 원칙

- “초록+노랑=위험”처럼 색상만으로 경고하지 않는다.
- 색상/모양/각인은 약명 확인을 돕는 단서다.
- 최종 경고는 확인된 제품명/성분코드/DUR 근거로만 표시한다.

권장 문구:

```txt
초록색 약과 노란색 약을 함께 드시는 경우,
정확한 약 이름을 먼저 확인해야 해요.
약봉투나 알약 각인을 확인해 주세요.
확인된 약 이름 기준으로 함께 먹어도 되는지 검사합니다.
```

## 실행

모델 다운로드:

```bash
cd backend
.venv/bin/python scripts/download_paddleocr_korean_v5.py
```

Clova/Paddle 비교:

```bash
cd backend
.venv/bin/python scripts/compare_ocr_engines.py --samples data/ocr_samples --engine all
```

PaddleOCR 패키지가 없으면:

```bash
cd backend
.venv/bin/pip install paddleocr paddlepaddle
```

PaddleOCR Korean v5 recognition 모델은 약 13MB라 로컬 실험 가능. 대량 학습/파인튜닝이 아니라면 클라우드 불필요.
