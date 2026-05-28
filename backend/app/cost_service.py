from __future__ import annotations

from typing import Any, Dict, List

# (진료부위, 치료항목) → (평균비용, 범위)
_COST_TABLE: Dict[tuple[str, str], Dict[str, Any]] = {
    ("무릎", "엑스레이 검사"):        {"min": 8000,   "max": 20000,  "avg": 13000},
    ("무릎", "자기공명영상검사"):       {"min": 350000, "max": 700000, "avg": 500000},
    ("무릎", "물리치료"):            {"min": 5000,   "max": 15000,  "avg": 9000},
    ("무릎", "주사치료"):            {"min": 20000,  "max": 80000,  "avg": 45000},
    ("어깨", "엑스레이 검사"):        {"min": 8000,   "max": 20000,  "avg": 13000},
    ("어깨", "자기공명영상검사"):       {"min": 350000, "max": 700000, "avg": 500000},
    ("어깨", "물리치료"):            {"min": 5000,   "max": 15000,  "avg": 9000},
    ("어깨", "주사치료"):            {"min": 20000,  "max": 100000, "avg": 55000},
    ("허리", "엑스레이 검사"):        {"min": 8000,   "max": 22000,  "avg": 15000},
    ("허리", "자기공명영상검사"):       {"min": 400000, "max": 800000, "avg": 580000},
    ("허리", "물리치료"):            {"min": 5000,   "max": 15000,  "avg": 9000},
    ("허리", "주사치료"):            {"min": 30000,  "max": 120000, "avg": 70000},
}

_DEFAULT_COST = {"min": 5000, "max": 200000, "avg": 50000}

DEPARTMENT_EXAMPLES = [
    "내과",
    "신경과",
    "정신건강의학과",
    "정형외과",
    "안과",
    "이비인후과",
    "피부과",
    "마취통증의학과",
    "재활의학과",
]

_BODY_DEPARTMENTS = {
    "통증": ["정형외과", "신경과", "마취통증의학과", "재활의학과"],
    "무릎": ["정형외과", "재활의학과", "마취통증의학과"],
    "어깨": ["정형외과", "재활의학과", "마취통증의학과"],
    "허리": ["정형외과", "신경과", "마취통증의학과", "재활의학과"],
}

_PUBLIC_DATA_NOTES = {
    "11990": "수가기준정보: 진찰료·엑스레이·기본 물리치료 같은 급여 행위의 기준금액 확인용",
    "13000": "진료행위정보: 어떤 행위가 실제로 많이 쓰이는지 보는 행위 통계/맥락용",
    "13200/13201": "진료비통계: 의료기관종별·진료과 전체 청구통계. 초진 진찰비로 쓰면 안 됨",
    "11997": "비급여 진료비 정보: 도수치료·체외충격파·일부 초음파·자기공명영상검사 등 공개 비급여 가격 확인용",
}


def get_cost_estimate(body: str, treatment: str) -> Dict[str, Any]:
    info = _COST_TABLE.get((body, treatment), _DEFAULT_COST)
    return {
        "body": body,
        "treatment": treatment,
        "currency": "KRW",
        "estimated_min": info["min"],
        "estimated_max": info["max"],
        "estimated_avg": info["avg"],
        "note": "건강보험 적용 기준 본인부담금 추정치. 병원·상태에 따라 다를 수 있습니다.",
    }


def answer_cost_question(question: str, body: str = "통증", treatment: str = "진찰, 엑스레이, 처방전을 받는 경우") -> Dict[str, Any]:
    """Deterministic public-data-grounded hospital-cost chatbot.

    Keep the answer conservative: no diagnosis, no exact personal bill, no unsupported insurance net-price.
    """
    raw_question = (question or "").strip()
    q = raw_question.lower()
    body = body if body in _BODY_DEPARTMENTS else "통증"
    departments = _BODY_DEPARTMENTS.get(body, ["정형외과", "마취통증의학과"])
    body_label = "통증" if body == "통증" else f"{body} 통증"

    topic = "general"
    lines: List[str]
    followups: List[str]
    sources = ["11990", "11997", "13200/13201"]

    if any(k in q for k in ["진료과", "무슨 과", "어느 과", "과목", "department"]):
        topic = "department"
        sources = ["11999", "13200/13201", "13000"]
        lines = [
            f"{body_label}은 보통 {', '.join(departments)}에서 먼저 상담할 수 있어요.",
            "건강보험심사평가원 진료비통계의 진료과 예시는 " + ", ".join(DEPARTMENT_EXAMPLES) + " 등이에요.",
            "단, 이 통계는 진료과 전체 평균/청구통계라서 ‘초진 진찰비 얼마’로 쓰면 안 돼요.",
        ]
        if any(k in q for k in ["수가", "11990", "급여기준", "급여 기준", "행위", "코드"]):
            sources.append("11990")
            lines.append("급여기준/수가 질문은 진찰료·엑스레이·기본 물리치료 같은 행위 기준을 확인하는 방식으로 연결합니다.")
        followups = ["이 증상은 어느 과가 맞나요?", "진료과 통계는 초진비로 못 쓰나요?"]
    elif any(k in q for k in ["수가", "11990", "급여기준", "급여 기준", "행위", "코드"]):
        topic = "covered_fee_basis"
        sources = ["11990", "13000"]
        lines = [
            "수가기준정보는 진찰료·엑스레이·기본 물리치료 같은 ‘급여 행위’의 기준금액을 확인하는 근거예요.",
            "현재 화면의 기본 가이드는 진찰 → 엑스레이 같은 기본검사 → 처방전을 받는 흐름 → 기본 물리치료 같은 첫 방문 흐름을 급여 행위 기준으로 설명해요.",
            "다만 개인 최종 병원비는 행위 조합, 급여 기준 충족, 병원 종별, 야간/공휴일, 추가 비급여 여부에 따라 달라져요.",
        ]
        followups = ["엑스레이도 급여인가요?", "물리치료 기준은 뭐예요?", "비급여는 어디서 봐요?"]
    elif any(k in q for k in ["13200", "13201", "통계", "평균", "진료비통계"]):
        topic = "claim_statistics"
        sources = ["13200/13201"]
        lines = [
            "13200/13201은 지역·의료기관종별·진료과별 전체 청구통계를 보는 자료예요.",
            "검사, 주사, 재활치료, 반복 방문 등이 섞일 수 있어서 초진 진찰비나 1회 진단비로 쓰면 안 돼요.",
            "이 서비스에서는 ‘비용 규모 참고’와 ‘병원에 물어볼 질문 만들기’에만 사용합니다.",
        ]
        followups = ["초진비는 왜 계산 못 해요?", "진료과 통계는 어디에 써요?"]
    elif any(k in q for k in ["mri", "엠알", "자기공명"]):
        topic = "자기공명영상검사"
        sources = ["11997", "11990"]
        lines = [
            "자기공명영상검사는 무조건 비급여라고 단정하면 안 되고, 증상·진찰소견·기존 검사 결과에 따라 급여 가능성이 달라져요.",
            "첫 방문에서는 보통 진찰과 엑스레이 같은 기본검사 후 필요성을 확인하는 흐름이 안전합니다.",
            "병원에는 ‘자기공명영상검사가 급여 기준에 해당하나요? 비급여라면 1회 금액과 급여 대안이 있나요?’라고 물어보세요.",
        ]
        followups = ["자기공명영상검사 급여 기준", "비급여 가격은 어디서 확인해요?", "실손 청구는 어떻게 물어봐요?"]
    elif any(k in q for k in ["실손", "보험", "환급", "청구", "공제"]):
        topic = "insurance"
        sources = ["11997"]
        lines = [
            "공개자료에는 개인 실손보험 지급액·공제금액·거절 사유가 들어있지 않아요.",
            "그래서 ‘실손 후 체감액’을 계산하지 않고, 병원/보험사 질문으로 바꾸는 게 안전해요.",
            "질문: 급여/비급여 항목명과 코드가 뭔가요? 진료비 세부내역서와 영수증 발급되나요? 보험사에는 이 항목이 보장 대상인지 확인하면 됩니다.",
        ]
        followups = ["비급여면 실손 되나요?", "병원에서 어떤 서류 받아요?"]
    elif any(k in q for k in ["비급여", "도수", "체외", "충격파", "초음파", "주사", "프롤로"]):
        topic = "nonpay"
        sources = ["11997", "11990"]
        lines = [
            "도수치료·체외충격파·일부 주사/초음파·자기공명영상검사는 병원별 비급여 가격 차이가 클 수 있어요.",
            "공개 비급여 가격 자료는 병원별 비급여 금액을 보는 자료이고, 최종 실손 환급액은 포함하지 않아요.",
            "추가 치료를 권유받으면 1회 금액, 예상 횟수, 급여 대안, 오늘 꼭 해야 하는지부터 물어보세요.",
        ]
        followups = ["도수치료 가격", "체외충격파도 비급여예요?", "급여 대안 질문"]
    elif any(k in q for k in ["약국", "약값", "처방약", "처방전"]):
        topic = "pharmacy"
        sources = ["11990"]
        lines = [
            "현재 병원비 화면의 금액은 병원 창구 결제 기준이고, 약국에서 내는 약값은 제외했어요.",
            "처방전은 첫 방문에서 받을 수 있지만, 약국 약값은 약 종류·일수·조제료에 따라 달라 별도 확인이 필요합니다.",
            "병원에는 ‘처방전이 나올 수 있나요? 약국 결제는 별도죠?’라고 확인하면 됩니다.",
        ]
        followups = ["약국비도 포함해요?", "처방전은 언제 받을 수 있나요?"]
    elif any(k in q for k in ["야간", "공휴일", "주말", "저녁", "가산"]):
        topic = "surcharge"
        sources = ["11990"]
        lines = [
            "야간·공휴일·응급 상황에는 가산이 붙을 수 있어 같은 진료라도 병원비가 달라질 수 있어요.",
            "이 화면의 기본 가이드는 평일 주간 첫 방문을 기준으로 이해하는 게 안전합니다.",
            "방문 전 전화로 ‘오늘 이 시간대에 야간/공휴일 가산이 붙나요?’라고 물어보세요.",
        ]
        followups = ["평일에 가면 더 싸요?", "응급실은 왜 비싸요?"]
    else:
        lines = [
            f"{body_label} 첫 방문은 보통 진찰 → 필요 시 엑스레이 같은 기본검사 → 처방전 여부 확인 → 기본 물리치료 여부 확인 순서로 생각하면 돼요.",
            f"선택한 항목: {treatment}. 화면 금액은 확정 병원비가 아니라 첫 방문 전 안심 가이드입니다.",
            "추가 검사·주사·도수치료 같은 항목을 권유받으면 급여/비급여, 1회 금액, 예상 횟수, 급여 대안을 물어보세요.",
        ]
        followups = ["자기공명영상검사도 건강보험 돼요?", "진료과 통계는 어떻게 써요?", "비급여면 실손 되나요?"]

    answer = "\n".join(f"• {line}" for line in lines)
    source_notes = [_PUBLIC_DATA_NOTES[s] for s in sources if s in _PUBLIC_DATA_NOTES]
    return {
        "ok": True,
        "topic": topic,
        "question": raw_question,
        "body": body,
        "treatment": treatment,
        "answer": answer,
        "sources": sources,
        "source_notes": source_notes,
        "suggested_questions": followups,
        "disclaimer": "진단/처방이 아니라 공공데이터 기반 병원 방문 전 확인 가이드입니다.",
    }
