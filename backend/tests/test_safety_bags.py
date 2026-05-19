import unittest

from app.safety_service import check_medicine_bags_safety


class SafetyBagsTest(unittest.TestCase):
    def test_multiple_ocr_photos_are_flattened_into_one_safety_check_with_bag_sources(self):
        result = check_medicine_bags_safety(
            medicine_bags=[
                {"bag_id": "photo_1", "source_label": "정형외과 약봉투", "medicine_names": ["명인할로페리돌주사"]},
                {"bag_id": "photo_2", "source_label": "내과 약봉투", "medicine_names": ["두드리진시럽"]},
            ],
            age=76,
        )

        self.assertEqual(result["photo_count"], 2)
        self.assertEqual(result["medicine_count"], 2)
        self.assertIn("명인할로페리돌주사", result["medicine_names"])
        self.assertIn("두드리진시럽", result["medicine_names"])
        self.assertEqual(result["level"], "위험")
        self.assertTrue(result["cross_bag_matches"])
        self.assertEqual(
            {origin["bag_id"] for origin in result["medicine_origins"]},
            {"photo_1", "photo_2"},
        )


if __name__ == "__main__":
    unittest.main()
