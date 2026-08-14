import unittest

from decoding import transcription_options


class TranscriptionOptionsTests(unittest.TestCase):
    def test_uses_deterministic_domain_aware_search(self):
        options = transcription_options("en")

        self.assertGreaterEqual(options["beam_size"], 5)
        self.assertGreaterEqual(options["best_of"], 5)
        self.assertEqual(options["temperature"], 0.0)
        self.assertFalse(options["condition_on_previous_text"])
        self.assertTrue(options["vad_filter"])

        prompt = options["initial_prompt"]
        hotwords = options["hotwords"]
        for term in ("InfraWatch", "Aklan", "AMEFIP", "contractors", "budgets"):
            self.assertIn(term, prompt)
            self.assertIn(term, hotwords)


if __name__ == "__main__":
    unittest.main()
