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
  "다른 약 추가",
  "나이 / 한약",
  "결과 확인",
];

export const medicineStepKeys = [
  "capture",
  "add",
  "herbal",
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
    lat: 37.5679,
    lon: 126.9827,
    stairs: 0,
    isFlat: true,
    recommendedForWalking: true,
    floor: "2층",
  },
  {
    name: "우리마을의원",
    department: "가정의학과",
    walk: "도보 10분",
    distance: "720m",
    route: "횡단보도 적은 경로",
    status: "진료 가능",
    mapUrl: "https://map.kakao.com/link/search/%EC%9A%B0%EB%A6%AC%EB%A7%88%EC%9D%84%EC%9D%98%EC%9B%90",
    lat: 37.5665,
    lon: 126.9780,
    stairs: 3,
    isFlat: false,
    recommendedForWalking: false,
    floor: "1층",
  },
  {
    name: "서울연세통증의학과",
    department: "통증의학과",
    walk: "도보 12분",
    distance: "850m",
    route: "엘리베이터 출입 가능",
    status: "대기 적음",
    mapUrl: "https://map.kakao.com/link/search/%EC%84%9C%EC%9A%B8%EC%97%B0%EC%84%B8%ED%86%B5%EC%A6%9D%EC%9D%98%ED%95%99%EA%B3%BC",
    lat: 37.5650,
    lon: 126.9850,
    stairs: 0,
    isFlat: true,
    recommendedForWalking: false,
    floor: "3층",
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

// 실제 의약품·건강 정보 팁 (무작위 노출)
export const doctorTips = [
  {
    summary: "여러 병원 약, 반드시 약사에게 목록 보여주세요",
    detail: "두 곳 이상의 병원에서 처방받은 약을 함께 드실 땐 단골 약사에게 전체 목록을 보여주세요. 중복 성분이나 상호작용 위험을 바로 확인해 드립니다.",
  },
  {
    summary: "아스피린 + 이부프로펜, 같이 드시면 안 돼요",
    detail: "아스피린과 이부프로펜(부루펜)은 함께 복용하면 소염 효과가 줄고 위장 출혈 위험이 높아집니다. 두 약을 동시에 처방받으셨다면 의사·약사에게 꼭 확인하세요.",
  },
  {
    summary: "비타민 D, 기름진 식사 후에 드세요",
    detail: "비타민 D는 지용성이라 지방과 함께 먹으면 흡수율이 2배 이상 높아집니다. 아침 식사 후보다 점심·저녁 식사 후 복용을 권장합니다.",
  },
  {
    summary: "오메가-3, 하루 1~2g이 적정량",
    detail: "오메가-3는 혈중 중성지방 감소·혈압 유지에 도움을 줍니다. 하루 1~2g을 식사 중에 드세요. 과다 복용 시 혈소판 기능이 떨어져 출혈 시간이 늘 수 있습니다.",
  },
  {
    summary: "칼슘 + 철분, 같이 드시면 서로 방해해요",
    detail: "칼슘과 철분은 같은 흡수 경로를 사용합니다. 함께 드시면 둘 다 흡수율이 떨어지므로 최소 2시간 간격을 두고 드세요.",
  },
  {
    summary: "혈압약, 임의로 끊으면 위험합니다",
    detail: "혈압약은 매일 같은 시간에 복용해야 혈압이 안정적으로 유지됩니다. 증상이 없다고 임의로 끊으면 반동성 고혈압이 생길 수 있어요. 중단은 반드시 의사와 상담하세요.",
  },
  {
    summary: "항생제, 다 나아도 다 드셔야 해요",
    detail: "증상이 좋아졌다고 항생제를 중간에 멈추면 살아남은 세균이 내성을 갖습니다. 처방받은 기간 동안 빠짐없이 복용하세요.",
  },
  {
    summary: "마그네슘, 저녁에 드시면 수면에도 좋아요",
    detail: "마그네슘은 근육 긴장 완화와 수면 질 향상에 도움을 줍니다. 저녁 식사 후 복용하면 수면 중 근육 경련 예방에 효과적입니다.",
  },
  {
    summary: "비타민 C, 철분제와 같이 드세요",
    detail: "비타민 C는 비헴철(식물성 철분)의 흡수를 3배까지 높여줍니다. 철분제 복용 시 오렌지주스나 비타민 C 음료와 함께 드세요.",
  },
  {
    summary: "수면제 + 감기약, 낙상 위험이 높습니다",
    detail: "수면제와 항히스타민제(감기약 성분)를 함께 복용하면 과도한 졸음이 와서 낙상 위험이 커집니다. 65세 이상은 특히 주의하세요.",
  },
  {
    summary: "한약과 양약, 2시간 간격 두세요",
    detail: "한약과 양약을 같이 드실 때 성분이 충돌할 수 있습니다. 특히 와파린(항응고제), 당뇨약과의 상호작용이 보고돼 있으니 최소 2시간 간격을 두세요.",
  },
  {
    summary: "골다공증약, 먹고 30분 눕지 마세요",
    detail: "비스포스포네이트 계열 골다공증 치료제는 공복에 물 한 컵(200ml)과 복용 후 30분간 눕지 않아야 식도 부작용을 막을 수 있습니다.",
  },
  {
    summary: "이뇨제 드신다면 바나나를 충분히",
    detail: "이뇨제는 소변으로 칼륨을 함께 배출시킵니다. 바나나, 오렌지, 시금치 등 칼륨이 풍부한 음식을 챙겨 드세요. 단, 신장 기능에 문제가 있다면 의사와 먼저 상담하세요.",
  },
  {
    summary: "당뇨약, 식사 직후에 드세요",
    detail: "메트포르민 등 당뇨약은 식사 중 또는 직후 복용하면 위장 부작용(메스꺼움, 복통)을 크게 줄일 수 있습니다.",
  },
];
