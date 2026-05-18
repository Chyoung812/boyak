# Boyak Backend

## 실행

```bash
cd /home/kyung/workspace/hw/academy/boyak/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# .env에 PUBLIC_DATA_SERVICE_KEY, KAKAO_REST_API_KEY 입력
uvicorn app.main:app --reload --port 8000
```

확인:

```bash
curl http://localhost:8000/api/health
curl 'http://localhost:8000/api/costs/estimate?body=무릎&treatment=X-ray%20검사'
```

## 데이터 연결 우선순위

1. `DURPrdlstInfoService03` → DUR 품목정보
2. `DrbEasyDrugInfoService` → 약품 상세/복약 안내
3. `MdcinGrnIdntfcInfoService03` → 색/모양/각인 알약 식별
4. `HtfsInfoService03` → 건강기능식품/영양제
5. 파일다운로드 2개 → 병용금기약물, DUR 의약품 목록 로컬 캐시
6. `DrugPrdtPrmsnInfoService07` → 허가정보 보조. 필수라기보다 매칭 실패/상세 보강용

## 보안

- 공공데이터 인증키와 카카오 REST 키는 `backend/.env`에만 둔다.
- 프론트 `.env.local`에는 공개 가능한 API base URL만 둔다.
- `.env`, `backend/.env`, `frontend/.env.local`, `node_modules`, `.next`는 gitignore 처리됨.
