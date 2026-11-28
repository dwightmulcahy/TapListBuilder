"""Authenticated WSGI API for the shared library, served behind the site proxy."""
import hmac
import json
import os
from server.library_store import Library, Conflict, MAX_BYTES

def create_app(directory, token):
    if not token:
        raise ValueError("A library access token is required")
    store = Library(directory)

    def app(environ, start_response):
        def respond(status, data):
            body = json.dumps(data, ensure_ascii=False).encode()
            start_response(status, [("Content-Type", "application/json; charset=utf-8"),
                                    ("Cache-Control", "no-store"),
                                    ("X-Content-Type-Options", "nosniff"),
                                    ("Content-Length", str(len(body)))])
            return [body]

        if environ.get("PATH_INFO") != "/api/library":
            return respond("404 Not Found", {"error": "Not found"})
        supplied = environ.get("HTTP_AUTHORIZATION", "")
        if not hmac.compare_digest(supplied.encode(), ("Bearer " + token).encode()):
            return respond("401 Unauthorized", {"error": "Authentication required"})
        method = environ.get("REQUEST_METHOD")
        try:
            if method == "GET":
                return respond("200 OK", store.read())
            if method != "PUT":
                return respond("405 Method Not Allowed", {"error": "Method not allowed"})
            if environ.get("CONTENT_TYPE", "").split(";")[0].strip() != "application/json":
                return respond("415 Unsupported Media Type", {"error": "Expected JSON"})
            try:
                size = int(environ.get("CONTENT_LENGTH") or "0")
            except ValueError:
                return respond("400 Bad Request", {"error": "Invalid length"})
            if size <= 0 or size > MAX_BYTES + 1024:
                return respond("413 Payload Too Large", {"error": "Invalid payload size"})
            try:
                raw = environ["wsgi.input"].read(size)
                if len(raw) != size:
                    raise ValueError("Incomplete body")
                data = json.loads(raw)
                if not isinstance(data, dict):
                    raise ValueError("Expected object")
                result = store.replace(data.get("entries"), data.get("revision"))
            except (ValueError, TypeError, RecursionError):
                return respond("400 Bad Request", {"error": "Invalid library data"})
            except Conflict:
                return respond("409 Conflict", {"error": "Library changed; reload before saving"})
            return respond("200 OK", result)
        except (OSError, ValueError, KeyError, TypeError):
            return respond("500 Internal Server Error", {"error": "Library storage unavailable"})
    return app

def application():
    return create_app(os.environ.get("LIBRARY_DATA_DIR", "/data"),
                      os.environ.get("LIBRARY_TOKEN", ""))
