# Boyak raw data placement

다운로드한 원본 파일은 Git에 올리지 않고 `backend/data/raw/` 아래에 둔다.

## 파일 배치

```text
backend/data/raw/
├── dur_contraindications/
│   └── 한국의약품안전관리원_병용금기약물_*.csv 또는 *.xlsx
├── dur_drug_list/
│   └── 건강보험심사평가원_의약품안전사용서비스(DUR)_의약품목록_* 폴더/파일
└── README.local.txt
```

## Windows 다운로드 폴더에서 옮기기

Windows 사용자 `kyung` 기준 다운로드 폴더:

```text
/mnt/c/Users/kyung/Downloads
```

권장 복사 위치:

```text
/home/kyung/workspace/hw/academy/boyak/backend/data/raw/dur_contraindications/
/home/kyung/workspace/hw/academy/boyak/backend/data/raw/dur_drug_list/
```

## 주의

- 원본 CSV/XLSX/압축파일은 용량이 크고 갱신될 수 있으므로 커밋하지 않는다.
- 한글이 깨지면 CP949/EUC-KR 가능성이 높다. 변환 전 원본을 보존한다.
- 병용금기 파일은 DUR 룰 테이블로, DUR 의약품 목록은 OCR 약명 정규화 사전으로 쓴다.
