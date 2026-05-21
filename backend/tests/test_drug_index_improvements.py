import unittest

from app.drug_index_service import normalize_medicine_names
from app.drug_info_service import get_drug_descriptions
from app.ocr_service import _filter_medicine_name_candidates, _match_db_candidate_details, _top_matched_names
from app.safety_service import check_selected_medicines_safety


class DrugIndexImprovementsTest(unittest.IsolatedAsyncioTestCase):
    def test_fuzzy_typo_returns_confirmation_candidate(self):
        result = normalize_medicine_names(["타이래놀"], limit_per_name=5)
        item = result["items"][0]

        self.assertIn(item["status"], {"needs_confirmation", "matched"})
        aliases = [candidate.get("alias", "") for candidate in item.get("candidates", [])]
        self.assertTrue(any("타이레놀" in alias for alias in aliases))

    def test_ocr_noise_filter_keeps_drug_like_names(self):
        texts = [
            "약제비 계산서 영수증",
            "본인부담금 2,300",
            "복약안내",
            "주소 서울시 어딘가",
            "씨프로바이정250일리그럼",
            "한미아스피린장용정100ng",
            "부스코판당의정",
        ]
        candidates = _filter_medicine_name_candidates(texts)

        self.assertNotIn("약제비 계산서 영수증", candidates)
        self.assertNotIn("복약안내", candidates)
        self.assertIn("씨프로바이정250밀리그램", candidates)
        self.assertIn("한미아스피린장용정100mg", candidates)
        self.assertIn("부스코판당의정", candidates)

    def test_ocr_candidates_return_top3_db_autocomplete(self):
        candidates = ["씨프로바이정250일리그럼", "초록소정", "한미아스피린장용정100ng"]
        match_items = _match_db_candidate_details(candidates, limit_per_name=3)
        top_names = _top_matched_names(match_items)

        self.assertTrue(any("씨프로바이정250밀리그램" in name for name in top_names))
        self.assertTrue(any("화록소정" in name for name in top_names))
        self.assertTrue(any("한미아스피린장용정100" in name for name in top_names))
        self.assertGreaterEqual(len(match_items[0].get("candidates", [])), 1)

    async def test_drug_descriptions_ignore_ocr_noise_words(self):
        result = await get_drug_descriptions([
            "팜봉투",
            "복약안내",
            "소화 불량을 개선해요",
            "해머물건경",
            "소영진통제",
            "반드시",
        ])
        self.assertEqual(result, {})

    def test_selected_medicines_does_not_warn_duplicate_ingredient_without_dur_rule(self):
        result = check_selected_medicines_safety(
            selected_medicines=[
                {"display_name": "타이레놀정", "ingredient_code": "A"},
                {"display_name": "타이레놀정", "ingredient_code": "A"},
            ],
            age=70,
        )
        self.assertNotIn("동일 성분", "\n".join(w.get("message", "") for w in result.get("warnings", [])))


if __name__ == "__main__":
    unittest.main()
