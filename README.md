# Boyak (보약) 프로젝트 실행 가이드

팀원 여러분, 깃허브에서 최신 코드를 다운로드(Pull) 받으신 후 아래 순서대로 세팅을 진행해 주셔야 정상적으로 모든 기능(길찾기, 약품 OCR 등)이 작동합니다!

---

## 1. 프론트엔드 (Frontend) 세팅

1. 터미널을 열고 `frontend` 폴더로 이동합니다.
2. 새롭게 추가된 라이브러리(지도 라이브러리인 leaflet 등)를 설치하기 위해 아래 명령어를 실행합니다.
   ```bash
   npm install
   ```
3. `frontend` 폴더 바로 아래에 `.env.local` 이라는 파일을 새로 만들고 아래 내용을 붙여넣습니다. (키값은 단톡방 참고)
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8001
   NEXT_PUBLIC_TMAP_KEY=여기에_공유받은_TMap_키를_넣으세요
   ```
   *(주의: 만약 백엔드 도커 포트가 충돌한다면 8001 대신 8005 등을 사용하세요)*

## 2. 백엔드 (Backend) 세팅

1. 터미널에서 `backend` 폴더로 이동합니다.
2. 필요한 파이썬 패키지를 설치합니다.
   ```bash
   pip install -r requirements.txt
   ```
3. `backend` 폴더 안에 있는 `.env.example` 파일을 복사하여 `.env` 라는 이름으로 새 파일을 만듭니다.
4. 새로 만든 `.env` 파일 안에 공유받은 **OpenAI 키**와 **TMap 키**를 채워 넣습니다.

## 3. 로컬 약품 DB 구축 (매우 중요 ⭐️)

공공데이터 기반 약품 매칭과 DUR(병용금기/연령금기) 안전성 분석을 위해 로컬 DB가 반드시 필요합니다.
1. 공공데이터포털에서 아래 2종류의 CSV 데이터를 다운로드합니다.
   - 검색어: `건강보험심사평가원_의약품안전사용서비스(DUR) 의약품 목록`
   - 검색어: `한국의약품안전관리원_병용금기약물`
2. 다운받은 CSV 파일들을 `backend/DUR_list_20250601/` (또는 지정된 raw 경로) 폴더 안에 넣습니다.
3. 터미널에서 `backend` 폴더에 있는 상태로 아래 명령어를 실행하여 DB를 생성합니다. (약 10초~수 분 소요)
   ```bash
   python scripts/build_dur_sqlite.py
   ```
   *(실행이 완료되면 40MB 가량의 `dur_index.sqlite3` 파일이 자동 생성됩니다.)*

## 4. 서버 실행 방법

모든 세팅이 끝났습니다! 아래와 같이 서버를 각각 실행해 주세요.

- **프론트엔드 실행:** (`frontend` 폴더에서)
  ```bash
  npm run dev
  ```
- **백엔드 실행:** (`backend` 폴더에서)
  ```bash
  uvicorn app.main:app --reload --port 8001
  ```
