# 약봉투 OCR 평가셋

여기에 실제 테스트용 약봉투/처방전 이미지를 넣는다. 개인정보 보호를 위해 커밋하지 않는다.

## 권장 파일

```txt
001_bright_front.jpg      # 밝은 곳, 정면
002_tilted.jpg            # 기울어진 사진
003_low_light.jpg         # 어두운 사진
004_wrinkled.jpg          # 구겨진 약봉투
005_small_text.jpg        # 글씨 작음
006_multi_bags.jpg        # 여러 봉투 한 장
007_many_noise_text.jpg   # 병원명/주소/복약법 텍스트 많음
```

## labels.json 예시

정답 약 이름을 아는 경우만 적는다.

```json
{
  "001_bright_front.jpg": ["타이레놀정", "아모잘탄정"],
  "002_tilted.jpg": ["쎄레브렉스캡슐"]
}
```

## 주의

- 주민등록번호, 전화번호, 주소, 환자명은 가리거나 잘라낸 뒤 저장.
- 약 이름/용량/복용법 영역은 남긴다.
- 원본이 민감하면 `data/ocr_samples_private/` 같은 로컬 전용 폴더를 따로 써도 된다.
