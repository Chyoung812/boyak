# Reset 전 보존 메모 — 2026-05-21

## 현재 기준

- Repo: `/home/kyung/workspace/hw/academy/boyak`
- Branch: `minseo`
- HEAD: `a8e3d89 add: ocr 기능 추가 및 개선`
- 서버 확인:
  - Backend `http://localhost:8001/api/health` 정상
  - Frontend `http://localhost:3000` 정상
- 기존 stash:
  - `stash@{0}: On lim: wip before minseo pull: safety + covered cost data`

## 이번 세션에서 한 핵심 작업

### 1. 환경변수 확인

- `backend/.env` 존재 확인
- `frontend/.env.local` 존재 확인
- Clova OCR env 실제 호출 성공 확인
- 민감값은 문서에 남기지 않음

### 2. OCR 엔진 판단

- 약봉투 OCR은 Clova가 PaddleOCR보다 좋음
- PaddleOCR은 보조/실험용으로만 판단
- 저화질 옛날 사진은 지원 범위 밖으로 두는 방향

### 3. OCR 후보 필터/자동완성 개선

수정 파일:

- `backend/app/ocr_service.py`
- `backend/app/drug_index_service.py`
- `backend/tests/test_drug_index_improvements.py`

내용:

- OCR 잡음 제거 룰 추가
  - `약제비`, `영수증`, `복약안내`, `주소`, `전화`, `본인부담금`, `주의사항`, `계산서` 등
- OCR 오인식 보정 추가
  - `씨프로바이정250일리그럼` → `씨프로바이정250밀리그램`
  - `한미아스피린장용정100ng` → `한미아스피린장용정100mg`
  - `초록소정` → `화록소정`
- DB 후보 자동완성 구조 추가
  - `ocr_match_items`
  - `top_candidate`
  - `candidates top3`
  - `needs_confirmation`

### 4. OCR 잡음 hallucination 차단

수정 파일:

- `backend/app/drug_info_service.py`
- `frontend/app/page.jsx`
- `frontend/app/components/MedicineFlowScreen.jsx`

문제:

- `팜봉투`, `해머물건경`, `소영진통제` 같은 OCR 잡음이 OpenAI fallback 설명으로 넘어가서 그럴듯한 효능 설명이 생성됨.

수정:

- OpenAI 설명 fallback 제거
- 설명 API는 확인된 약명 형태만 EasyDrug 조회
- 프론트 설명 요청은 `top_candidate.alias`만 사용
- 화면 카드도 `top_candidate` 있는 약만 표시

확인 결과:

```txt
POST /api/medicines/descriptions
입력: 팜봉투, 복약안내, 소화 불량을 개선해요, 해머물건경, 소영진통제, 반드시
결과: {"ok": true, "descriptions": {}}
```

### 5. 1번 사진 재테스트

테스트 이미지:

- `backend/data/ocr_samples/001_2.jpg`

최종 OCR/DB 매칭 약명:

```txt
씨프로바이정250밀리그램
화록소정
부스코판당의정
```

### 6. 테스트/빌드

마지막 확인:

```txt
backend pytest: 6 passed
frontend npm run build: 성공
```

## 생성/수정 파일 목록

수정:

```txt
.gitignore
backend/app/drug_index_service.py
backend/app/drug_info_service.py
backend/app/ocr_service.py
backend/app/safety_service.py
backend/tests/test_drug_index_improvements.py
frontend/app/components/MedicineFlowScreen.jsx
frontend/app/page.jsx
```

생성:

```txt
backend/scripts/compare_ocr_engines.py
backend/scripts/download_paddleocr_korean_v5.py
backend/data/ocr_samples/README.md
docs/OCR_EVALUATION_NOTES.md
docs/OCR_SAMPLE_EVAL_20260521.md
docs/PADDLEOCR_RETRY_20260521.md
docs/OCR_CANDIDATE_FILTER_TESTCASES.md
docs/RESET_HANDOFF_20260521.md
```

로컬 산출물/ignore 대상:

```txt
backend/data/ocr_samples/*.jpg, *.png
backend/data/ocr_eval/*.jsonl
backend/models/paddleocr/korean_PP-OCRv5_mobile_rec/
backend/.venv_ocr/
backend/.venv_ocr32/
```

## reset 전에 특히 살릴 만한 코드

1. `backend/app/drug_info_service.py`
   - OpenAI fallback 제거는 안전상 중요
2. `frontend/app/page.jsx`
   - 설명 API에 `top_candidate.alias`만 넘기기
3. `frontend/app/components/MedicineFlowScreen.jsx`
   - `top_candidate` 없는 OCR 잡음 카드 숨김
4. `backend/app/ocr_service.py`
   - `ocr_match_items` 반환 및 잡음 필터
5. `backend/app/drug_index_service.py`
   - OCR 오인식 normalize
6. `backend/tests/test_drug_index_improvements.py`
   - 발표/심사용 테스트 근거
7. `docs/OCR_CANDIDATE_FILTER_TESTCASES.md`
   - 발표 문장/테스트케이스 근거

## 주의

- `.env`, `.env.local`, API key, DB URL, Clova secret은 문서/커밋에 포함하지 말 것.
- 약봉투 원본 이미지와 OCR 원문 전체는 개인정보 위험 때문에 커밋하지 말 것.
- 영양제 OCR은 현재 제품명 읽기 정도만 가능. DUR 안전검사는 의약품 DB 중심이라 제한적.
- `라니드정/리나드정/라나드정`은 현재 로컬 DUR DB/EasyDrug에서 미확인. 자동완성하면 안 됨.
