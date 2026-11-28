import io
import json
import tempfile
import unittest
from unittest.mock import patch
from server.library_api import create_app, application

class ApiTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.directory = temp.name
        self.app = create_app(temp.name, "secret")

    def request(self, method="GET", data=None, **overrides):
        body = json.dumps(data).encode() if data is not None else b""
        env = {"PATH_INFO": "/api/library", "REQUEST_METHOD": method,
               "HTTP_AUTHORIZATION": "Bearer secret", "CONTENT_TYPE": "application/json",
               "CONTENT_LENGTH": str(len(body)), "wsgi.input": io.BytesIO(body)}
        env.update(overrides)
        result = []
        payload = self.app(env, lambda status, headers: result.extend([status, dict(headers)]))
        return int(result[0].split()[0]), json.loads(b"".join(payload)), result[1]

    def test_roundtrip(self):
        status, data, headers = self.request()
        self.assertEqual((status, data), (200, {"revision": 0, "entries": []}))
        self.assertEqual(headers["Cache-Control"], "no-store")
        entry = {"id": "1", "item": {"name": "IPA"}}
        self.assertEqual(self.request("PUT", {"revision": 0, "entries": [entry]})[0], 200)
        self.assertEqual(self.request()[1]["entries"], [entry])
        self.assertEqual(self.request("PUT", {"revision": 0, "entries": []})[0], 409)

    def test_errors(self):
        for overrides, status in [
            ({"PATH_INFO": "/other"}, 404),
            ({"HTTP_AUTHORIZATION": ""}, 401),
            ({"HTTP_AUTHORIZATION": "Bearer wrong"}, 401),
            ({"REQUEST_METHOD": "POST"}, 405),
            ({"CONTENT_TYPE": "text/plain"}, 415),
            ({"CONTENT_LENGTH": "bad"}, 400),
            ({"CONTENT_LENGTH": "0"}, 413),
            ({"CONTENT_LENGTH": "999999999"}, 413),
            ({"CONTENT_LENGTH": "999"}, 400),
            ({"wsgi.input": io.BytesIO(b"invalid")}, 400),
        ]:
            with self.subTest(overrides=overrides):
                self.assertEqual(self.request("PUT", {}, **overrides)[0], status)
        self.assertEqual(self.request("PUT", [])[0], 400)
        self.assertEqual(self.request("PUT", {"entries": [None], "revision": 0})[0], 400)

    def test_storage_failure(self):
        with patch("server.library_store.Library.read", side_effect=OSError):
            self.assertEqual(self.request()[0], 500)

    def test_configuration(self):
        with self.assertRaises(ValueError):
            create_app(self.directory, "")
        with patch.dict("os.environ", {"LIBRARY_DATA_DIR": self.directory, "LIBRARY_TOKEN": "secret"}):
            self.assertTrue(callable(application()))
