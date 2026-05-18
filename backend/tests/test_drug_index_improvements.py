import unittest

from app.drug_index_service import normalize_medicine_names
from app.safety_service import check_selected_medicines_safety


class DrugIndexImprovementsTest(unittest.TestCase):
    def test_fuzzy_typo_returns_confirmation_candidate(self):
        result = normalize_medicine_names(["타이래놀"], limit_per_name=5)
        item = result["items"][0]

        self.assertIn(item["status"], {"needs_confirmation", "matched"})
        aliases = [candidate.get("alias", "") for candidate in item.get("candidates", [])]
        self.assertTrue(any("타이레놀" in alias for alias in aliases))

    def test_selected_medicines_does_not_warn_duplicate_ingredient_without_dur_rule(self):
        result = check_selected_medicines_safety(
            selected_medicines=[
                {"display_name": "임의약A", "product_code": "P1", "ingredient_code": "NO_DUR_DUP_TEST"},
                {"display_name": "임의약B", "product_code": "P2", "ingredient_code": "NO_DUR_DUP_TEST"},
            ],
            age=76,
        )

        categories = [match.get("category") for match in result.get("matches", [])]
        self.assertNotIn("동일성분중복", categories)
        self.assertNotIn("duplicate_ingredients", result)
        self.assertEqual(result["level"], "확인완료")


if __name__ == "__main__":
    unittest.main()
