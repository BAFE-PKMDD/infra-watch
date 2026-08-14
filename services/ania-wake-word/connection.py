from __future__ import annotations


def should_close_websocket(client_state: str) -> bool:
    return client_state != "DISCONNECTED"
