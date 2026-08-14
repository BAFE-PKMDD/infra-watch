from __future__ import annotations

from collections.abc import Callable
from typing import Any


class ConnectionModelFactory:
    def __init__(self, create_model: Callable[[], Any]) -> None:
        self._create_model = create_model

    def create(self) -> Any:
        return self._create_model()