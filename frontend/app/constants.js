export const featureCards = [
  {
    id: "medicine",
    title: "약",
    copy: "약 복용 안전 확인",
    color: "bg-boyak-blue",
  },
  {
    id: "hospital",
    title: "길찾기",
    copy: "가까운 병원 찾기",
    color: "bg-boyak-green",
  },
  {
    id: "cost",
    title: "병원비",
    copy: "예상 비용 확인",
    color: "bg-boyak-orange",
  },
];

export const symptomOptions = ["허리", "무릎", "어깨", "두통"];

export const hospitalFlowSteps = [
  "증상 입력",
  "AI 추천 결과",
  "병원 선택",
  "교통약자 길안내",
  "도착",
];

export const medicineSteps = [
  "약 촬영",
  "OCR 분석",
  "내용 확인",
  "다른 약 추가",
  "한약 여부",
  "DUR 분석",
  "결과 확인",
];

export const medicineStepKeys = [
  "capture",
  "ocr",
  "review",
  "add",
  "herbal",
  "dur",
  "result",
];

export const hospitalStepKeys = ["input", "results", "select", "route", "arrived"];

export const extractedMedicines = [
  { name: "아모잘탄정", detail: "혈압약 · 2026.05.10 조제" },
  { name: "타이레놀정", detail: "해열진통제 · 2026.05.10 조제" },
];

export const homeMedicines = ["감기약", "소화제", "관절 영양제"];

export const nearbyHospitals = [
  {
    name: "튼튼정형외과",
    department: "정형외과",
    walk: "도보 8분",
    distance: "600m",
    route: "평지 위주 경로",
    status: "지금 진료 중",
  },
  {
    name: "우리마을의원",
    department: "가정의학과",
    walk: "도보 10분",
    distance: "720m",
    route: "횡단보도 적은 경로",
    status: "진료 가능",
  },
  {
    name: "서울연세통증의학과",
    department: "통증의학과",
    walk: "도보 12분",
    distance: "850m",
    route: "엘리베이터 출입 가능",
    status: "대기 적음",
  },
];

export const costBodyOptions = ["어깨", "무릎", "허리"];

export const treatmentOptions = [
  "진료비(초진)",
  "X-ray 검사",
  "MRI 검사",
  "물리치료(1회)",
  "기타 문의",
];

export const treatmentCosts = {
  "진료비(초진)": "약 4,000원",
  "X-ray 검사": "약 8,000원",
  "MRI 검사": "약 40,000원~80,000원",
  "물리치료(1회)": "약 10,000원",
  "기타 문의": "상담 필요",
};

export const costFlowSteps = ["부위 선택", "치료/검사 선택", "예상 비용 안내", "추가 설명"];
