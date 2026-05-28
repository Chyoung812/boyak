from app.cost_service import answer_cost_question


def test_cost_chat_department_stats_not_initial_consultation_price():
    result = answer_cost_question(
        question="진료과 통계는 초진 진찰비로 써도 돼요?",
        body="허리",
        treatment="진찰 + X-ray + 처방전 받을 수 있음",
    )

    assert result["ok"] is True
    assert result["topic"] in {"department", "claim_statistics"}
    assert "초진 진찰비" in result["answer"]
    assert "쓰면 안" in result["answer"]
    assert "13200/13201" in result["sources"]


def test_cost_chat_fee_basis_mentions_11990_and_first_visit_flow():
    result = answer_cost_question(
        question="수가기준 데이터 포함해서 설명해줘",
        body="무릎",
        treatment="진찰 + X-ray + 처방전 받을 수 있음",
    )

    assert result["topic"] == "covered_fee_basis"
    assert "11990" in result["answer"]
    assert "진찰" in result["answer"]
    assert "X-ray" in result["answer"]


def test_cost_chat_insurance_does_not_make_net_price():
    result = answer_cost_question(
        question="실손 청구하면 체감액 얼마야?",
        body="어깨",
        treatment="MRI 급여기준 확인",
    )

    assert result["topic"] == "insurance"
    assert "실손보험 지급액" in result["answer"]
    assert "계산하지 않고" in result["answer"]
