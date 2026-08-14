from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parent
PYTHON_IMAGE = "python:3.11-slim@sha256:a630a63cdb314e2d138a2fca3e375e319e8568346ffafac5b980f888630ac4f1"
WHISPER_REVISION = "d1d751a5f8271d482d14ca55d9e2deeebbae577f"


class VoiceImageContractTests(unittest.TestCase):
    def test_voice_images_pin_their_python_base(self):
        for service in ("ania-wake-word", "ania-whisper"):
            dockerfile = (ROOT / service / "Dockerfile").read_text(encoding="utf-8")
            self.assertIn(f"FROM {PYTHON_IMAGE}", dockerfile)

    def test_whisper_model_snapshot_is_pinned(self):
        dockerfile = (ROOT / "ania-whisper" / "Dockerfile").read_text(encoding="utf-8")
        self.assertIn(f"revision='{WHISPER_REVISION}'", dockerfile)

    def test_voice_runtime_direct_dependencies_are_exactly_pinned(self):
        for service in ("ania-wake-word", "ania-whisper"):
            requirements = (ROOT / service / "requirements.txt").read_text(encoding="utf-8")
            for requirement in requirements.splitlines():
                if requirement and not requirement.startswith("#"):
                    self.assertIn("==", requirement, f"Unpinned dependency: {requirement}")


if __name__ == "__main__":
    unittest.main()
