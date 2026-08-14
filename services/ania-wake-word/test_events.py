import unittest

from events import detected_event


class WakeEventTests(unittest.TestCase):
    def test_emits_wake_for_the_wake_classifier(self):
        self.assertEqual(
            detected_event({"hey_ania": 0.81, "anh_ya_sleep": 0.04}, threshold=0.5),
            "wake_detected",
        )

    def test_emits_sleep_for_the_sleep_classifier(self):
        self.assertEqual(
            detected_event({"hey_ania": 0.08, "anh_ya_sleep": 0.72}, threshold=0.5),
            "sleep_detected",
        )

    def test_uses_the_highest_classifier_and_ignores_subthreshold_scores(self):
        self.assertEqual(
            detected_event({"hey_ania": 0.61, "anh_ya_sleep": 0.74}, threshold=0.5),
            "sleep_detected",
        )
        self.assertIsNone(
            detected_event({"hey_ania": 0.49, "anh_ya_sleep": 0.48}, threshold=0.5)
        )


if __name__ == "__main__":
    unittest.main()
