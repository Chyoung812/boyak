# PaddleOCR 버전 재시도 결과

실행일: 2026-05-21

## 시도 1: PaddleOCR 3.5.0 + paddlepaddle 3.3.1

- venv: `backend/.venv_ocr`
- 설치 용량: 약 1.3GB
- 결과: 실패
- 오류:

```txt
NotImplementedError: ConvertPirAttribute2RuntimeAttribute not support [pir::ArrayAttribute<pir::DoubleAttribute>]
```

## 시도 2: PaddleOCR 3.3.0 + paddlepaddle 3.2.2

- venv: `backend/.venv_ocr32`
- 설치 용량: 약 1.3GB
- 결과: 실행 성공
- 실행 명령:

```bash
cd backend
PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True \
  .venv_ocr32/bin/python scripts/compare_ocr_engines.py \
  --samples data/ocr_samples --engine paddle --limit 6
```

- 결과 파일:

```txt
backend/data/ocr_eval/ocr_compare_20260521_154136.jsonl
```

## Clova vs PaddleOCR 약명 후보 비교

| 파일 | Clova | PaddleOCR 3.3/3.2 |
|---|---|---|
| `001_2.jpg` | 씨프로바이정250밀리그램, 화록소정, 라니드정, 부스코판당의정 | 약명 후보 거의 실패 |
| `002_3.jpg` | 실패 | 실패 |
| `003_4.png` | 리리카캡슐 일부 | 실패 |
| `004_6.jpg` | 가나톤정50밀리그람, 가나릴정, 가바뉴로캡슐, 경칠캡슐, 노바스크... | 가나본정50일리그림 정도 |
| `005_153242.jpg` | 씨프로/세프로바이정, 화록소정, 라니드정, 부스코판당의정 | 프로바미정, 초록소정, 라니드, 부스코판당의정, 씨프로바이정 일부 |
| `006_eob.jpg` | 올메텍플러스정, 한미아스피린장용정, 바난정, 레보프라이드, 싸이메트정, 비졸본정, 록소날 | 같은 7종 대부분 인식 |

## 판단

- PaddleOCR은 버전 낮추면 실행은 된다.
- 하지만 현재 샘플에서는 Clova가 전반적으로 더 좋다.
- 특히 선명한 `006_eob.jpg`는 둘 다 잘 되지만, 약명 정확도/문장량은 Clova가 우세하다.
- 흐린 사진은 둘 다 실패한다.
- PaddleOCR은 보조 엔진으로만 두고, 메인은 Clova + DUR 후보 정규화가 맞다.

## 다음 우선순위

1. OCR 엔진 교체보다 후보 필터/정규화 개선.
2. Clova/Paddle 결과를 합쳐서 `drug_index_service.normalize_medicine_names()`에 넣기.
3. `labels.json`을 만들어 top3 포함률로 평가.
4. PaddleOCR은 별도 venv(`.venv_ocr32`)에 유지하고 운영 의존성에는 아직 넣지 않기.
