# OCR 샘플 6장 1차 비교 결과

실행일: 2026-05-21
샘플 위치: `backend/data/ocr_samples/`

## 환경

- Clova OCR: 실행 성공
- GPT vision 수동 판독: 실행 성공
- PaddleOCR: 별도 venv 설치 성공, 총 `backend/.venv_ocr` 약 1.3GB. 50GB 초과 아님.
- PaddleOCR 모델: `backend/models/paddleocr/korean_PP-OCRv5_mobile_rec` 약 14MB.
- PaddleOCR 실행 상태: 현재 WSL/PaddlePaddle 3.3.1 조합에서 `NotImplementedError: ConvertPirAttribute2RuntimeAttribute...` 발생. 추가 버전 조정 필요.

## 파일별 결과 요약

| 파일 | Clova 약명 인식 | GPT vision 판독 | 판단 |
|---|---|---|---|
| `001_2.jpg` | 씨프로바이정250밀리그램, 화록소정, 라니드정, 부스코판당의정 일부 인식 | 씨프로바이정, 록소펜/화록소정, 라니드정, 부스코판당의정 | Clova가 약명 핵심은 꽤 잡음. 후보 필터 개선 필요 |
| `002_3.jpg` | 약명 후보 거의 실패 | 록소닌/록소펜, 무코스타 추정 | 저해상도/흐림. OCR 단독 어려움 |
| `003_4.png` | 제품명 거의 실패 | 제품명 불명, 약효분류만 추정 | 워터마크/저해상도라 평가용으론 나쁨 |
| `004_6.jpg` | 가나톤정50밀리그람, 가나릴정 등 일부 | 가나톤정, 가나부틴/아나펜/노자임 등 일부 추정 | 약명 일부 가능하지만 정답 확인 필요 |
| `005_153242.jpg` | 씨프로바이정, 화록소정, 라니드정, 부스코판당의정 | 씨프로바이정, 록소펜/화록소정, 라니드정, 부스코판당의정 | Clova 양호 |
| `006_eob.jpg` | 올메텍플러스정, 한미아스피린장용정, 바난정, 레보프라이드, 싸이메트정, 비졸본정, 록소날 | 동일 7종 판독 | 매우 좋음 |

## 1차 결론

1. Clova는 선명한 약봉투/영수증형 문서에서는 약명을 꽤 잘 잡는다.
2. 현재 `compare_ocr_engines.py`의 약명 후보 필터가 너무 단순해서 `약제비`, `영수증`, `주의사항` 같은 잡음이 후보 상위에 섞인다.
3. GPT vision은 흐린 이미지에서 맥락 추정은 잘하지만, 제품명을 확정하기에는 위험하다. 정답 라벨 생성 보조로만 쓰는 게 낫다.
4. PaddleOCR은 설치 용량 문제는 없지만 현재 버전 조합 오류가 있어 바로 비교 불가. `paddlepaddle==3.2.x` 또는 PaddleOCR 2.x 조합으로 재시도 필요.

## 다음 작업

- Clova OCR 결과를 바로 화면에 보여주지 말고 `drug_index_service.normalize_medicine_names()`로 후보화한다.
- OCR 텍스트 후보 필터를 개선한다: `정/캡슐/시럽/주사/mg/밀리그램` 포함 줄 우선, `약제비/영수증/주의사항/주소/전화` 제외.
- `labels.json`에 정답 약명을 넣고 top1/top3 매칭률을 계산한다.
- PaddleOCR은 버전 조정 후 보조 OCR로 재평가한다.
