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
  "후보 확인",
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
    mapUrl: "https://map.kakao.com/link/search/%ED%8A%BC%ED%8A%BC%EC%A0%95%ED%98%95%EC%99%B8%EA%B3%BC",
  },
  {
    name: "우리마을의원",
    department: "가정의학과",
    walk: "도보 10분",
    distance: "720m",
    route: "횡단보도 적은 경로",
    status: "진료 가능",
    mapUrl: "https://map.kakao.com/link/search/%EC%9A%B0%EB%A6%AC%EB%A7%88%EC%9D%84%EC%9D%98%EC%9B%90",
  },
  {
    name: "서울연세통증의학과",
    department: "통증의학과",
    walk: "도보 12분",
    distance: "850m",
    route: "엘리베이터 출입 가능",
    status: "대기 적음",
    mapUrl: "https://map.kakao.com/link/search/%EC%84%9C%EC%9A%B8%EC%97%B0%EC%84%B8%ED%86%B5%EC%A6%9D%EC%9D%98%ED%95%99%EA%B3%BC",
  },
];

export const costBodyOptions = ["어깨", "무릎", "허리"];

export const treatmentOptions = [
  "진찰만",
  "진찰 + 약 처방 가능",
  "진찰 + X-ray + 약 처방 가능",
  "진찰 + X-ray + 물리치료 + 약 처방 가능",
  "MRI 급여기준 확인",
  "기타 문의",
];

export const treatmentCosts = {
  "진찰만": "65세 이상 1천~2천원대",
  "진찰 + 약 처방 가능": "병원비 1천~2천원대부터",
  "진찰 + X-ray + 약 처방 가능": "65세 이상/일반 8천~1만원대",
  "진찰 + X-ray + 물리치료 + 약 처방 가능": "65세 이상/일반 1만~1.5만원대",
  "MRI 급여기준 확인": "의사 판단 후 급여 여부 확인",
  "기타 문의": "상담 필요",
};

export const treatmentCostDetails = {
  "진찰만": {
    subtitle: "검사·처방 없이 진찰만 받은 최소 기준",
    range: "병원 창구 급여 기준: 65세 이상 약 1,884원 · 일반 약 5,652원",
    note: "통증 첫 방문에서는 약 처방이나 X-ray가 붙을 수 있어요.",
    codes: "AA154 초진진찰료-의원",
  },
  "진찰 + 약 처방 가능": {
    subtitle: "진찰 후 약이 필요하면 처방전을 받아 약국으로 이동",
    range: "병원 창구 진료비는 진찰 기준 1천~2천원대부터",
    note: "약국에서 내는 약값은 여기 금액에 포함하지 않았어요.",
    codes: "AA154 기준 · 약국비 제외",
  },
  "진찰 + X-ray + 약 처방 가능": {
    subtitle: "통증 첫 방문에서 흔한 기본 검사 흐름",
    range: "병원 창구 급여 기준: 65세 이상/일반 대략 8천~1만원대",
    note: "촬영 부위·매수, 야간/공휴일 여부에 따라 달라질 수 있어요.",
    codes: "AA154 + 부위별 X-ray 2매(G3302/G7202/G4602)",
  },
  "진찰 + X-ray + 물리치료 + 약 처방 가능": {
    subtitle: "X-ray 후 열치료·전기치료 같은 기본 보존치료가 붙는 경우",
    range: "병원 창구 급여 기준: 65세 이상/일반 대략 1만~1.5만원대",
    note: "기본 물리치료 조합 기준이라 주사·추가치료는 별도 확인이 필요해요.",
    codes: "AA154 + X-ray + MM010/MM020/MM080",
  },
  "MRI 급여기준 확인": {
    subtitle: "MRI는 바로 가격 확정하지 말고 급여 기준부터 확인",
    range: "증상·진찰소견·기존 검사 결과에 따라 급여 여부가 달라져요.",
    note: "첫 방문에서는 X-ray 등 기본검사 후 필요성을 확인하는 흐름이 안전해요.",
    codes: "조건부 급여 확인 항목",
  },
  "기타 문의": {
    subtitle: "주사·추가검사·특수치료는 병원 확인 필요",
    range: "상담 필요",
    note: "1회 금액, 예상 횟수, 급여 대안이 있는지 물어보세요.",
    codes: "확인 필요",
  },
};

export const costFlowSteps = ["부위 선택", "진료 흐름 선택", "예상 비용 안내", "추가 설명"];
