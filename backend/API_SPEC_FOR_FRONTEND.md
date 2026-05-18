# 보약 Backend API 명세서 v0.3

Base URL

```txt
http://localhost:8001
```

프론트 환경변수

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001
```

---

## 0. MVP 기능 요약

### A. 복약 안전 확인

```txt
약봉투/처방전 사진 여러 장
→ OCR로 약명/함량 추출
→ DUR 제품코드/성분코드 후보 정규화
→ 같은 성분 후보만 있으면 자동 선택
→ 성분이 다른 후보가 섞이면 사용자 선택
→ 선택된 product_code / ingredient_code로 DUR 검사
→ 노인주의/연령금기/병용금기 결과 표시
```

주의:

```txt
- LLM/OCR은 약명 추출·구조화만 담당
- 위험 판정은 DUR 공공데이터 룰 기반
- 동일 성분 중복은 용량/빈도/최대용량 데이터 없으면 경고하지 않음
```

### B. 병원/길찾기

```txt
증상 선택
→ 추천 진료과/병원 후보 표시
→ 실제 길찾기는 웹 내부 구현 X
→ 카카오맵 링크로 이동
```

현재 MVP는 카카오 REST API/Directions API를 쓰지 않습니다.

```txt
카카오맵 링크 방식: https://map.kakao.com/link/search/{검색어}
좌표가 있으면: https://map.kakao.com/link/to/{병원이름},{위도},{경도}
```

### C. 병원비 가이드

```txt
부위/치료 선택
→ 첫 방문 급여 가능 흐름과 병원 확인 질문 제공
```

확정 병원비 계산이 아니라 공공데이터 기반 참고 가이드입니다.

---

## 1. Health Check

```http
GET /api/health
```

Response

```json
{
  "ok": true,
  "service": "boyak-backend"
}
```

프론트 사용:

```txt
앱 시작 시 선택적으로 호출해서 백엔드 연결 상태 표시 가능
```

---

## 2. 이미지 OCR 약봉투 추출

여러 장의 약봉투/처방전 사진을 받아 약 이름/함량 문자열을 추출합니다.

```http
POST /api/ocr/medicine-bags
Content-Type: multipart/form-data
```

FormData

```txt
files: image[]
source_labels: string[] 선택, 예: 사진 1 / 내과 약봉투 / 정형외과 약봉투
```

Response 예시

```json
{
  "ok": true,
  "mode": "openai_vision",
  "medicine_bags": [
    {
      "bag_id": "photo_1",
      "source_label": "사진 1",
      "medicine_names": ["쿠에타핀정25밀리그램", "에이서캡슐"],
      "guessed_items": []
    }
  ],
  "safety_note": "OCR은 약명 추출만 합니다. 최종 위험도는 DUR 제품코드/성분코드 검사 결과를 사용하세요."
}
```

실패 예시

```json
{
  "ok": false,
  "reason": "OPENAI_API_KEY가 설정되지 않아 이미지 OCR을 실행할 수 없습니다."
}
```

프론트 요청사항:

```txt
1. 사진 여러 장을 한 번에 files로 append
2. OCR 실패 시 가짜 약명 만들지 말고 재촬영/직접입력 안내
3. OCR 결과 medicine_names를 /api/medicines/normalize로 전달
```

---

## 3. 약명 정규화

OCR/STT/직접입력 약명을 DUR 제품코드/성분코드 후보로 바꿉니다.

```http
POST /api/medicines/normalize
Content-Type: application/json
```

Request

```json
{
  "medicine_names": ["타이래놀", "쿠에타핀전", "두타정0.5mg"]
}
```

Response 예시

```json
{
  "ok": true,
  "items": [
    {
      "input": "타이래놀",
      "status": "needs_confirmation",
      "suggestion_message": "타이레놀 맞나요?",
      "top_candidate": {
        "alias": "타이레놀정500밀리그람(아세트아미노펜)",
        "product_code": "제품코드",
        "ingredient_code": "성분코드",
        "score": 95,
        "match_basis": "fuzzy"
      },
      "candidates": [
        {
          "alias": "타이레놀정500밀리그람(아세트아미노펜)",
          "product_code": "제품코드",
          "ingredient_code": "성분코드",
          "score": 95
        }
      ]
    }
  ]
}
```

status 의미

```txt
matched             정확히 일치. 자동 선택 가능
needs_confirmation  오타/부분명/여러 후보. 프론트 확인 필요
not_found           후보 없음. 재촬영/직접입력 요청
```

프론트 후보 처리 규칙

```txt
1. candidates가 없으면 재촬영/직접입력 안내
2. candidates의 ingredient_code가 전부 같으면 후보 목록을 띄우지 말고 top_candidate 자동 선택
   - 화면 문구: "같은 성분 약으로 확인돼 자동 선택했어요."
3. candidates의 ingredient_code가 2개 이상이면 사용자에게 선택 UI 표시
4. 선택된 후보만 /api/safety/check-selected로 전달
```

---

## 4. 선택된 제품/성분코드 기반 DUR 안전 확인

프론트에서 확정된 약 후보만 받아 DUR 공공데이터로 안전 확인합니다.

```http
POST /api/safety/check-selected
Content-Type: application/json
```

Request

```json
{
  "selected_medicines": [
    {
      "display_name": "쿠에타핀정25밀리그램",
      "product_code": "657201180",
      "ingredient_code": "378601ATB",
      "bag_id": "photo_1",
      "source_label": "사진 1"
    }
  ],
  "age": 76,
  "has_herbal_medicine": false,
  "has_supplement": false
}
```

필드

| 필드 | 타입 | 설명 |
|---|---|---|
| selected_medicines | array | normalize 후보 중 선택/자동선택된 약 |
| display_name | string | 화면 표시용 약명 |
| product_code | string/null | DUR 제품코드 |
| ingredient_code | string/null | DUR 성분코드 |
| bag_id/source_label | string/null | 어느 사진/약봉투에서 온 약인지 표시용 |
| age | number | 사용자 입력 나이. 하드코딩 금지 |
| has_herbal_medicine | boolean | 한약 함께 복용 여부 |
| has_supplement | boolean | 영양제 함께 복용 여부 |

Response 예시

```json
{
  "level": "주의",
  "message": "어르신은 복용 전 확인이 필요한 약이 있어요.",
  "action": "약 봉투와 함께 약사/의사에게 확인하세요.",
  "age": 76,
  "matches": [
    {
      "category": "노인주의",
      "medicine_name": "쿠에타핀정25밀리그램",
      "ingredient_code": "378601ATB",
      "match_basis": "product_code_or_ingredient_code",
      "reason": "고령자에서 주의가 필요한 이상반응 정보"
    }
  ],
  "warnings": [],
  "data_basis": ["DUR SQLite 제품코드/성분코드", "DUR 노인주의", "DUR 연령금기", "DUR 병용금기"],
  "disclaimer": "진단/처방이 아니라 공공 DUR 데이터 기반 복약 확인 보조입니다.",
  "tts_text": "어르신은 복용 전 확인이 필요한 약이 있어요. 약 봉투와 함께 약사나 의사에게 확인하세요."
}
```

level 값

```txt
정보입력필요 / 확인완료 / 확인필요 / 주의 / 위험 / 판단불가
```

프론트 표시 우선순위

```txt
level → message → action → matches → disclaimer → tts_text
```

주의:

```txt
동일 ingredient_code 약이 2개 이상이어도 현재는 경고하지 않음.
총 mg/일, 복용 횟수, 최대용량 기준 데이터가 없으면 과잉 경고가 되기 때문.
```

---

## 5. 여러 장 약봉투 이름 기반 안전 확인

후보 선택 없이 OCR 결과의 약명 문자열을 바로 묶어서 검사하는 fallback API입니다.
정확도는 `/api/safety/check-selected`가 더 좋습니다.

```http
POST /api/safety/check-bags
Content-Type: application/json
```

Request

```json
{
  "medicine_bags": [
    {
      "bag_id": "photo_1",
      "source_label": "정형외과 약봉투",
      "medicine_names": ["명인할로페리돌주사"]
    },
    {
      "bag_id": "photo_2",
      "source_label": "내과 약봉투",
      "medicine_names": ["두드리진시럽"]
    }
  ],
  "age": 76
}
```

Response 핵심

```json
{
  "level": "위험",
  "photo_count": 2,
  "medicine_count": 2,
  "bundle_mode": "multi_photo_current_medicines",
  "cross_bag_matches": [
    {
      "category": "병용금기",
      "message": "서로 다른 사진/약봉투의 약 사이에서 병용금기 가능성이 확인됐어요.",
      "medicine_a": { "bag_id": "photo_1", "source_label": "정형외과 약봉투" },
      "medicine_b": { "bag_id": "photo_2", "source_label": "내과 약봉투" }
    }
  ]
}
```

프론트 권장:

```txt
최종 UX는 OCR → normalize → 후보 확인/자동선택 → check-selected 사용.
check-bags는 빠른 시연/fallback 용도.
```

---

## 6. 약명 문자열 기반 안전 확인

직접 입력 약명을 바로 검사하는 단순 API입니다.
내부에서 normalize를 시도하지만, 후보 확인이 없으므로 정확도는 selected 방식보다 낮습니다.

```http
POST /api/safety/check
Content-Type: application/json
```

Request

```json
{
  "medicine_names": ["쿠에타핀정", "에이서캡슐"],
  "age": 76,
  "has_herbal_medicine": true,
  "has_supplement": true,
  "dispensed_days_ago": 45,
  "dosage_form": "가루약"
}
```

프론트 권장:

```txt
직접 텍스트 입력도 가능하면 /api/medicines/normalize를 먼저 거친 뒤 /api/safety/check-selected 사용.
```

---

## 7. AI 입력 라우팅/구조화

자연어 문장을 의도/증상/약 후보/질문으로 정리합니다. 선택형 보조 API입니다.

```http
POST /api/ai/route
Content-Type: application/json
```

Request

```json
{
  "text": "무릎이 아프고 한약도 먹고 있어요. 약 봉투에는 쿠에타핀정이라고 적혀 있어요."
}
```

Response 예시

```json
{
  "ok": true,
  "mode": "openai 또는 rule_fallback",
  "intent": "mixed",
  "symptoms": ["무릎"],
  "medicine_candidates": [{ "name": "쿠에타핀정", "certainty": "high" }],
  "supplement_or_herbal": { "has_herbal_medicine": true, "has_supplement": false },
  "recommended_departments": ["정형외과", "통증의학과"],
  "questions_for_hospital": ["추가 검사나 치료가 비급여인지 먼저 알 수 있을까요?"],
  "safety_note": "AI는 입력 정리용입니다. 최종 위험도는 DUR 공공데이터 결과를 확인하세요."
}
```

---

## 8. 병원/약국 카카오맵 링크

증상과 지역을 받아 추천 진료과와 카카오맵 링크를 반환합니다.
실제 경로 탐색은 웹 내부에서 구현하지 않고 카카오맵으로 넘깁니다.

```http
GET /api/hospitals/recommend?symptom=무릎&region=서울%20강남구
```

Response 예시

```json
{
  "symptom": "무릎",
  "region": "서울 강남구",
  "recommended_department": "정형외과 또는 통증의학과",
  "routing_provider": "kakao_map_link",
  "note": "백엔드는 병원 후보와 카카오맵 링크만 내려주고, 실제 길찾기는 카카오맵 화면으로 이동한다.",
  "links": {
    "search": "https://map.kakao.com/link/search/서울%20강남구%20정형외과",
    "directions_format": "https://map.kakao.com/link/to/{병원이름},{위도},{경도}"
  },
  "items": [
    {
      "name": "서울 강남구 정형외과",
      "type": "kakao_search_placeholder",
      "department": "정형외과 또는 통증의학과",
      "map_url": "https://map.kakao.com/link/search/서울%20강남구%20정형외과",
      "directions_url": "https://map.kakao.com/link/search/서울%20강남구%20정형외과"
    }
  ]
}
```

프론트 요청사항:

```txt
1. 웹앱 안에서 자체 길찾기 UI/가짜 지도 경로를 만들지 말 것
2. 병원 선택 후 버튼 문구는 "카카오맵으로 길찾기"
3. 클릭 시 새 탭 또는 현재 탭에서 directions_url/map_url 열기
4. 카카오 API 키는 프론트에 넣지 말 것
5. 위치/거리순/실제 병원명 데이터가 필요하면 이후 백엔드가 HIRA 병원정보 + Kakao Local API로 보강
```

---

## 9. 급여 병원비 가이드

```http
GET /api/costs/estimate?body=무릎&treatment=진찰%20%2B%20X-ray%20%2B%20약%20처방%20가능
```

Query

| 필드 | 예시 | 설명 |
|---|---|---|
| body | 무릎/허리/어깨 | 아픈 부위 |
| treatment | 진찰만 / 진찰 + 약 처방 가능 / 진찰 + X-ray + 약 처방 가능 / 진찰 + X-ray + 물리치료 + 약 처방 가능 / MRI 급여기준 확인 / 기타 문의 | 프론트 선택값 |

기능 설명

```txt
- 첫 방문에서 흔한 급여 가능 흐름 안내
- 병원 창구 결제 중심
- 약국비는 별도 계산하지 않음
- MRI/초음파/주사/도수치료 등은 추가 확인 항목으로 안내
- 확정 병원비가 아니라 병원에 물어볼 질문 생성 목적
```

---

## 10. 영양제 원료 확인

```http
GET /api/supplements/ingredients?name=글루코사민
```

용도:

```txt
식품안전나라 I0760 원료명 분류 확인.
복약 위험 판정의 주 데이터가 아님.
```

Response 핵심

```json
{
  "ok": true,
  "search_mode": "ingredient_name",
  "input_name": "글루코사민",
  "total_count": 10,
  "safety_summary": {
    "level": "확인필요",
    "elderly_message": "원료 정보는 찾았지만, 약과 같이 먹어도 되는지는 별도 확인이 필요해요.",
    "action": "복용 중인 약이 있으면 약사/의사에게 같이 먹어도 되는지 확인하세요."
  }
}
```

---

## 11. 프론트에 요청할 작업

### 필수

```txt
1. NEXT_PUBLIC_API_BASE_URL=http://localhost:8001 설정
2. 약 사진 업로드는 /api/ocr/medicine-bags 사용
3. OCR 결과 약명은 /api/medicines/normalize로 정규화
4. 같은 ingredient_code 후보만 있으면 자동 선택, 성분이 갈릴 때만 선택 UI 표시
5. 나이는 사용자 입력값으로 /api/safety/check-selected에 전달. 하드코딩 금지
6. 결과 화면은 check-selected의 level/message/action/matches/tts_text를 그대로 표시
7. 병원 길찾기는 웹 내부 가짜 길찾기 X, 카카오맵 링크 열기
```

### 있으면 좋은 것

```txt
1. OCR 실패 시 직접 약명 입력 fallback
2. not_found 약명은 재촬영/직접입력 안내
3. 약별 source_label 표시: 사진 1 / 내과 약봉투 / 정형외과 약봉투
4. matches가 많으면 상위 3~5개만 먼저 보여주고 상세는 접기
5. 공공 DUR 데이터 기반 확인 보조이며 진단/처방이 아님을 결과 하단에 표시
```

---

## 12. 백엔드 환경변수

```dotenv
PUBLIC_DATA_SERVICE_KEY=
FOODSAFETY_API_KEY=
OPENAI_API_KEY=          # OCR/AI 구조화 사용 시 필요
OPENAI_MODEL=gpt-4o-mini
KAKAO_REST_API_KEY=      # 현재 링크 방식이면 필요 없음
CORS_ORIGINS=http://localhost:3000
```

---

## 13. 현재 로컬 서버

```txt
Frontend: http://localhost:3000
Backend:  http://localhost:8001
Health:   http://localhost:8001/api/health
```
