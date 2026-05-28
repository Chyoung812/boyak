# 보약(Boyak) 공모전 제출용 공공데이터 사용 목록

> 정리 기준: **Boyak이 최종 제출 버전**, `healthcare_cost_navigator`는 병원비 기능의 선행/검증 버전으로 정리한다.

## 1. 서비스 한 줄 설명

보약(Boyak)은 고령층/보호자가 약봉투 사진, 복용약, 병원비 질문을 입력하면 OCR·AI가 공공데이터 기반 약 안전정보와 병원비 확인 질문을 안내하는 보건의료 공공데이터 활용 서비스이다.

## 2. 사용 데이터 요약

| 구분 | 사용 데이터 | 출처 | 서비스 내 역할 |
|---|---|---|---|
| 의약품 안전 | DUR 의약품 목록 | 공공데이터포털 / 식약처·DUR | 약명 정규화, 제품명·성분코드 매칭 |
| 의약품 안전 | DUR 노인주의·연령금기 정보 | 공공데이터포털 / DUR | 고령자 복용 주의/금기 확인 |
| 의약품 안전 | 병용금기약물 정보 | 한국의약품안전관리원 | 여러 약 사이 병용금기 조합 확인 |
| 의약품 설명 | 의약품 쉬운 정보 | 공공데이터포털 / 식약처 | 확인된 약에 한해 효능·복약 설명 제공 |
| 의약품 보강 | 의약품 허가 정보 | 공공데이터포털 / 식약처 | 약품 허가/품목 정보 보조 |
| 알약 식별 보강 | 의약품 낱알 식별 정보 | 공공데이터포털 / 식약처 | 색상·모양·각인 기반 알약 식별 후보 |
| 건강기능식품 보강 | 건강기능식품 정보 | 공공데이터포털 / 식약처 | 영양제/건기식 품목 정보 보조 |
| 건강기능식품 보강 | 식품안전나라 건강기능식품 원료 정보 `I0760` | 식품안전나라 | 건강기능식품 원료명 확인 보조 |
| 병원비 | HIRA 수가기준정보 `11990` | 공공데이터포털 / 건강보험심사평가원 | 진찰료, X-ray, 기본 물리치료 등 급여 행위 기준금액 참고 |
| 병원비 | HIRA 비급여 진료비 정보 `11997` | 공공데이터포털 / 건강보험심사평가원 | 도수치료, 체외충격파, 일부 초음파/MRI 등 HIRA 공개 비급여 가격 확인 |
| 병원비 | HIRA 병원정보 `11999` | 공공데이터포털 / 건강보험심사평가원 | 병원명, 주소, 전화번호, 종별 등 병원 후보 정보 |
| 병원비 | HIRA 진료행위정보 `13000` | 공공데이터포털 / 건강보험심사평가원 | 검사·치료 행위명 표준화, 진료흐름 설명 보조 |
| 병원비 | HIRA 진료비통계 `13200/13201` | 공공데이터포털 / 건강보험심사평가원 | 진료과/기관종별 급여 진료비 통계 맥락 제공 |

## 3. 제출서에 넣을 데이터별 짧은 설명

### 3-1. DUR 의약품 목록

- 출처: 공공데이터포털 / 의약품안전사용서비스(DUR)
- 활용: OCR 또는 사용자가 입력한 약 이름을 실제 의약품 제품명, 성분코드, 제품코드 후보로 매칭한다.
- 서비스 가치: 약봉투 인식 결과가 틀릴 수 있으므로 공공데이터 DB로 확인된 약만 안전검사에 사용한다.

### 3-2. DUR 노인주의·연령금기·병용금기 정보

- 출처: 공공데이터포털 및 한국의약품안전관리원 공개자료
- 활용: 고령자가 복용하면 주의가 필요한 약, 특정 연령 금기, 두 약 사이 병용금기 여부를 확인한다.
- 서비스 가치: 고령층 다약제 복용 상황에서 위험 신호를 보호자에게 쉽게 알려준다.

### 3-3. 의약품 쉬운 정보

- 출처: 공공데이터포털 / 식품의약품안전처
- 활용: 공공데이터 DB에서 확인된 약에 한해 쉬운 말 설명을 제공한다.
- 서비스 가치: 확인되지 않은 OCR 잡음에는 설명을 생성하지 않아 의료정보 환각을 줄인다.

### 3-4. HIRA 수가기준정보 `11990`

- 출처: 공공데이터포털 / 건강보험심사평가원
- 활용: 진찰료, X-ray, 기본 물리치료 같은 급여 행위의 기준금액과 코드 확인에 사용한다.
- 서비스 가치: 사용자가 병원 방문 전 “어떤 항목이 급여 가능성이 있는지” 이해하고 병원에 질문할 수 있게 한다.

### 3-5. HIRA 비급여 진료비 정보 `11997`

- 출처: 공공데이터포털 / 건강보험심사평가원
- 활용: 도수치료, 체외충격파, 일부 초음파/MRI 등 병원별 공개 비급여 가격을 확인한다.
- 서비스 가치: 비급여가 제안될 때 1회 금액, 예상 횟수, 급여 대안 여부를 묻도록 안내한다.

### 3-6. HIRA 병원정보 `11999`

- 출처: 공공데이터포털 / 건강보험심사평가원
- 활용: 병원명, 주소, 전화번호, 종별 등 병원 기본정보를 제공한다.
- 서비스 가치: 사용자가 병원에 전화해 비용·급여 여부를 확인할 수 있게 연결한다.

### 3-7. HIRA 진료비통계 `13200/13201`

- 출처: 공공데이터포털 / 건강보험심사평가원
- 활용: 의료기관종별·진료과목별 진료비 통계 맥락 제공에 사용한다.
- 주의: 개인의 초진 진찰비나 최종 병원비로 직접 계산하지 않는다.

## 4. 실제 프로젝트 내 저장 위치

### 4-1. Boyak 최종 버전

```text
/home/kyung/workspace/hw/academy/boyak
```

주요 데이터/캐시:

```text
backend/data/processed/dur_index.sqlite3
backend/data/processed/dur_index.sqlite3.gz
backend/data/seed/covered_fee_steps.json
backend/data/ocr_samples/
backend/data/ocr_eval/
```

현재 SQLite 인덱스 주요 테이블:

```text
drug_products: 의약품 제품 정보
drug_aliases: 약명/OCR 매칭용 별칭
safety_rules: 노인주의·연령금기 등 DUR 안전 규칙
contraindication_pairs: 병용금기 약물 조합
```

### 4-2. healthcare_cost_navigator 선행 버전

```text
/home/kyung/workspace/hw/academy/healthcare_cost_navigator
```

병원비 기능 검증 데이터:

```text
data/cache/nonpay_서울_병원.json
data/raw/13200_medical_cost_by_region.csv
data/raw/13201_medical_cost_by_dept.csv
frontend/public/data/covered_fee_steps.json
frontend/public/data/covered_cost_stats.json
frontend/public/data/hospital_rankings.json
```

## 5. DB 저장 데이터와 API/캐시 데이터 구분

### 5-1. Neon DB에 실제로 들어있는 데이터

현재 확인 기준 Neon/Postgres에는 **DUR 약물 안전검사용 테이블만** 들어있다.

```text
drug_products: 의약품 제품 정보 21,284건
drug_aliases: 약명/OCR 매칭용 별칭 73,442건
safety_rules: 노인주의·연령금기 등 DUR 안전 규칙 23,575건
contraindication_pairs: 병용금기 성분 조합 21,673건
```

즉 Neon DB의 역할은 다음으로 한정된다.

- 약봉투 OCR/입력 약명 → 공공데이터 약품 후보 매칭
- 제품코드/성분코드 확인
- 노인주의·연령금기·병용금기 확인
- 여러 약을 같이 먹어도 되는지 위험 신호 확인

제출 표현:

> DUR 의약품 목록과 금기 정보를 가공해 Neon/Postgres DB에 저장하고, 약명 정규화 및 노인주의·연령금기·병용금기 확인에 활용하였다.

### 5-2. Neon DB에 없는 데이터

다음 데이터들은 Neon DB에 대량 저장되어 있지 않거나, 기능 호출 시 API/정적 seed/cache 형태로 사용한다.

| 데이터 | 현재 형태 | 제출 시 설명 |
|---|---|---|
| 의약품 쉬운 정보 | 공공데이터 API 호출/보조 조회 | 확인된 약의 쉬운 설명 제공 |
| 의약품 허가 정보 | API 후보 | 약품 허가/품목 정보 보강 후보 |
| 낱알 식별 정보 | API 후보 | 알약 색·모양·각인 검색 후보 |
| 건강기능식품 정보 | API 후보 | 영양제/건기식 정보 보조 |
| 식품안전나라 `I0760` | API 후보 | 건강기능식품 원료명 확인 보조 |
| HIRA 수가기준 `11990` | `covered_fee_steps.json` seed 및 비용 챗봇 근거 | 진찰료/X-ray/기본 물리치료 등 급여 행위 기준 설명 |
| HIRA 비급여 `11997` | healthcare 선행 프로젝트 cache/API 근거 | 도수치료·체외충격파·초음파/MRI 등 공개 비급여 가격 설명 |
| HIRA 병원정보 `11999` | healthcare 선행 프로젝트 cache/API 근거 | 병원명·주소·전화번호·종별 등 병원 후보 설명 |
| HIRA 진료비통계 `13200/13201` | CSV/cache/정적 JSON | 진료과/기관종별 청구통계 맥락 제공 |

따라서 “제출해야 하는 출처”는 **Neon DB에 들어간 데이터만이 아니라, 서비스가 API 호출·seed·cache로 사용하는 모든 공공데이터 출처**를 포함해야 한다.

### 5-3. 로컬 SQLite의 의미

로컬 SQLite는 일반 사용자 서비스 DB가 아니라, DUR 원본 공공데이터를 정리해 Neon으로 옮기기 위한 개발/검증 산출물이다.

```text
backend/data/processed/dur_index.sqlite3
```

- 개발/검증: 로컬 SQLite 사용 가능
- 일반 사용자 서비스: Neon/Postgres 같은 서버 DB를 사용해야 함
- 제출서 표현: “SQLite를 서비스 DB로 쓴다”보다 “공공데이터를 가공한 뒤 Neon DB에 저장해 조회한다”가 맞음

## 6. 개발자 실행과 일반 사용자 실행 차이

| 구분 | 개발자 로컬 실행 | 일반 사용자 서비스 실행 |
|---|---|---|
| 데이터 위치 | 내 PC의 SQLite/JSON/cache | 서버 DB 또는 서버 cache |
| API 키 | `backend/.env`에 직접 보관 | 배포 서버 환경변수에 보관 |
| DUR DB | 로컬 `dur_index.sqlite3` 사용 가능 | Neon/Postgres 등 배포 DB 권장 |
| HIRA cache | 로컬 JSON 사용 가능 | 서버가 관리하는 cache/DB 필요 |
| 문제점 | 내 PC에서는 되지만 팀원/사용자 환경에서는 깨질 수 있음 | 누구나 같은 API 서버를 통해 접근 가능 |

## 7. 제출서용 최종 문장

> 본 서비스는 의약품안전사용서비스(DUR), 의약품 쉬운 정보, 건강보험심사평가원 수가기준정보·비급여 진료비 정보·병원정보·진료비통계 등 보건의료 공공데이터를 활용한다. OCR 및 AI는 사용자의 약봉투 사진과 자연어 질문을 공공데이터의 의약품명, 성분코드, 진료행위, 비용 항목 후보로 연결하는 역할을 하며, 최종 안전 안내와 병원비 설명은 공공데이터 기반 규칙과 조회 결과를 바탕으로 제공한다.

## 8. 관련 공식 링크

### 공공데이터포털

- 공공데이터포털: https://www.data.go.kr/
- 의약품 쉬운 정보 `DrbEasyDrugInfoService`: https://www.data.go.kr/data/15075057/openapi.do
- 의약품 허가 정보 `DrugPrdtPrmsnInfoService07`: https://www.data.go.kr/data/15095677/openapi.do
- 의약품 낱알 식별 정보 `MdcinGrnIdntfcInfoService03`: https://www.data.go.kr/data/15057639/openapi.do
- 건강기능식품 품목 정보 `HtfsInfoService03`: https://www.data.go.kr/data/15048294/openapi.do

### 보건의료빅데이터개방시스템 / HIRA

- HIRA 보건의료빅데이터개방시스템: https://opendata.hira.or.kr/
- HIRA OpenAPI 목록: https://opendata.hira.or.kr/op/opc/selectOpenDataList.do
- 비급여 진료비 정보 `11997`: https://opendata.hira.or.kr/op/opc/selectOpenData.do?sno=11997
- 병원정보 `11999`: https://opendata.hira.or.kr/op/opc/selectOpenData.do?sno=11999
- 수가기준정보 `11990`: https://opendata.hira.or.kr/op/opc/selectOpenData.do?sno=11990
- 진료행위정보 `13000`: https://opendata.hira.or.kr/op/opc/selectOpenData.do?sno=13000
- 진료비통계 `13201`: https://opendata.hira.or.kr/op/opc/selectOpenData.do?sno=13201
- 진료비통계 `13200`: https://opendata.hira.or.kr/op/opc/selectOpenData.do?sno=13200

### 식품안전나라

- 식품안전나라 OpenAPI: https://www.foodsafetykorea.go.kr/apiMain.do

## 9. 현재 등록/활용 데이터 최종 체크

### 9-1. 공공데이터: 제출 대상

현재 코드, 환경변수, seed/cache 기준으로 제출 대상에 넣을 데이터는 아래가 끝이다.

| 상태 | 데이터/API | 제출 포함 여부 |
|---|---|---|
| Neon DB 저장 | DUR 의약품 제품/별칭/성분 | 포함 |
| Neon DB 저장 | DUR 노인주의·연령금기 등 safety rules | 포함 |
| Neon DB 저장 | 병용금기 성분 pair | 포함 |
| API 등록/호출 | 의약품 쉬운 정보 `DrbEasyDrugInfoService` | 포함 |
| API 등록 | 의약품 허가 정보 `DrugPrdtPrmsnInfoService07` | 포함하되 보강 후보로 설명 |
| API 등록 | 의약품 낱알 식별 `MdcinGrnIdntfcInfoService03` | 포함하되 보강 후보로 설명 |
| API 등록 | 건강기능식품 품목 정보 `HtfsInfoService03` | 포함하되 보강 후보로 설명 |
| API 등록 | 식품안전나라 `I0760` | 포함하되 원료 확인 보조로 설명 |
| seed/cache/챗봇 근거 | HIRA 수가기준 `11990` | 포함 |
| 선행 cache/API 근거 | HIRA 비급여 `11997` | 포함 |
| 선행 cache/API 근거 | HIRA 병원정보 `11999` | 포함 |
| 챗봇/행위명 근거 | HIRA 진료행위정보 `13000` | 포함 |
| CSV/cache/챗봇 근거 | HIRA 진료비통계 `13200/13201` | 포함 |

### 9-2. 민간/외부 API: 공공데이터는 아니지만 기술구성에는 적기

| API/서비스 | 현재 상태 | 설명 |
|---|---|---|
| NAVER CLOVA OCR | 등록됨 | 약봉투 이미지에서 텍스트 추출 |
| OpenAI API | 등록됨 | OCR/STT 텍스트 구조화, 질문 생성 보조 |
| TMAP | 등록됨 | 길찾기/지도 기능 후보 |
| Kakao REST API | 현재 `.env` 기준 비어 있음 | 제출 데이터 출처로는 제외하거나 후보로만 언급 |
| Neon/Postgres | 등록됨 | DUR 안전검사용 DB 저장소 |

## 10. 주의해서 말할 것

- HIRA 비급여 가격은 “HIRA 공개 비급여 가격”이지 실제 최종 환자 부담액이나 실손 환급 후 금액이 아니다.
- `13200/13201` 진료비통계는 초진 진찰비가 아니라 진료과/기관종별 전체 청구통계이다.
- OCR 결과는 바로 의학적 판단에 쓰지 않고, DUR DB에서 확인된 약 후보만 안전검사에 사용한다.
- AI는 진단/처방을 하지 않고, 공공데이터 항목 연결과 쉬운 설명을 돕는 보조 역할이다.
