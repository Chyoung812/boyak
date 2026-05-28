# Boyak Backend

## 로컬 실행

```bash
cd /home/kyung/workspace/hw/academy/boyak/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# .env에 필요한 키 입력
uvicorn app.main:app --reload --port 8001
```

확인:

```bash
curl http://localhost:8001/api/health
curl 'http://localhost:8001/api/costs/estimate?body=무릎&treatment=X-ray%20검사'
curl -X POST http://localhost:8001/api/medicines/normalize \
  -H 'Content-Type: application/json' \
  -d '{"medicine_names":["타이레놀"]}'
```

## DUR DB 전략

로컬 기본값은 SQLite입니다.

```txt
backend/data/processed/dur_index.sqlite3
```

배포에서는 `DATABASE_URL`이 있으면 SQLite 대신 Postgres/Neon을 조회합니다.

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

SQLite → Neon 마이그레이션:

```bash
cd backend
source .venv/bin/activate
DATABASE_URL='postgresql://...' python scripts/migrate_sqlite_to_postgres.py
```

마이그레이션되는 테이블:

```txt
drug_products
drug_aliases
safety_rules
contraindication_pairs
```

## Docker

Repo root에서 빌드하는 방식이 기본입니다.

```bash
cd /home/kyung/workspace/hw/academy/boyak
docker build -t boyak-backend .
docker run --rm -p 8001:8000 --env-file backend/.env boyak-backend
```

backend 폴더만 컨텍스트로 빌드할 때도 동작합니다.

```bash
cd backend
docker build -t boyak-backend .
docker run --rm -p 8001:8000 --env-file .env boyak-backend
```

Render Docker 배포 시 repo root의 `Dockerfile`을 사용하고, `DATABASE_URL`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `GROQ_STT_MODEL`, `PUBLIC_DATA_SERVICE_KEY`, `FOODSAFETY_API_KEY`, `CORS_ORIGINS`를 환경변수로 등록합니다.

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
- `.env`, `backend/.env`, `frontend/.env.local`, `node_modules`, `.next`, `data/processed`는 gitignore 처리한다.
