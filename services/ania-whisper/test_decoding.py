import unittest
from types import SimpleNamespace

from decoding import transcription_options, verified_transcript


class TranscriptionOptionsTests(unittest.TestCase):
    def test_uses_deterministic_domain_aware_search(self):
        options = transcription_options("en")

        self.assertGreaterEqual(options["beam_size"], 5)
        self.assertGreaterEqual(options["best_of"], 5)
        self.assertEqual(options["temperature"], 0.0)
        self.assertFalse(options["condition_on_previous_text"])
        self.assertTrue(options["vad_filter"])
        self.assertEqual(options["vad_parameters"]["min_speech_duration_ms"], 250)
        self.assertGreaterEqual(options["vad_parameters"]["threshold"], 0.6)

        prompt = options["initial_prompt"]
        hotwords = options["hotwords"]
        for term in ("InfraWatch", "Aklan", "AMEFIP", "contractors", "budgets"):
            self.assertIn(term, prompt)
            self.assertIn(term, hotwords)

    def segment(self, **overrides):
        values = dict(
            text=" Show projects in Aklan ", start=0.0, end=1.5,
            no_speech_prob=0.05, avg_logprob=-0.3, compression_ratio=1.2,
        )
        return SimpleNamespace(**(values | overrides))

    def test_accepts_confident_spoken_commands(self):
        self.assertEqual(
            verified_transcript([self.segment()], 1.5), "Show projects in Aklan"
        )

    def test_silence_never_uses_generated_text(self):
        for duration in (0, 0.1, float("nan")):
            self.assertEqual(verified_transcript([self.segment()], duration), "")

    def test_rejects_uncertain_repetitive_and_invalid_segments(self):
        for overrides in (
            {"no_speech_prob": 0.9}, {"avg_logprob": -1.5},
            {"compression_ratio": 3.0}, {"avg_logprob": float("nan")},
            {"end": 0.0},
        ):
            with self.subTest(overrides=overrides):
                self.assertEqual(verified_transcript([self.segment(**overrides)], 1.5), "")

    def test_uncertain_qualifier_does_not_submit_a_partial_command(self):
        segments = [self.segment(), self.segment(text="except completed projects", avg_logprob=-2)]
        self.assertEqual(verified_transcript(segments, 3), "")

    def test_joins_valid_segments_and_ignores_blank_text(self):
        segments = [self.segment(), self.segment(text=" "), self.segment(text="with budgets.")]
        self.assertEqual(verified_transcript(iter(segments), 3), "Show projects in Aklan with budgets.")

    def test_empty_segments_return_no_command(self):
        self.assertEqual(verified_transcript([], 1.5), "")


if __name__ == "__main__":
    unittest.main()
