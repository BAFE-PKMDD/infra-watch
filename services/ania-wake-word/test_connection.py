import unittest

from connection import should_close_websocket
from model_factory import ConnectionModelFactory


class WakeConnectionTests(unittest.TestCase):
    def test_does_not_close_an_already_disconnected_client(self):
        self.assertFalse(should_close_websocket("DISCONNECTED"))

    def test_closes_a_connected_client_at_server_timeout(self):
        self.assertTrue(should_close_websocket("CONNECTED"))

    def test_each_connection_receives_independent_inference_state(self):
        created = []
        factory = ConnectionModelFactory(lambda: created.append(object()) or created[-1])

        first = factory.create()
        second = factory.create()

        self.assertIsNot(first, second)
        self.assertEqual(len(created), 2)


if __name__ == "__main__":
    unittest.main()
