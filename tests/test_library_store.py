import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from concurrent.futures import ThreadPoolExecutor
from server.library_store import Library, Conflict, validate

def entry(name="IPA", ident="1"):
    return {"id": ident, "item": {"name": name, "abv": 6}}

class LibraryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.store = Library(self.temp.name)

    def test_persistence(self):
        self.assertEqual(self.store.read(), {"revision": 0, "entries": []})
        saved = self.store.replace([entry()], 0)
        self.assertEqual(saved["revision"], 1)
        self.assertEqual(Library(self.temp.name).read(), saved)
        self.assertEqual(self.store.replace([], 1)["entries"], [])

    def test_conflict(self):
        self.store.replace([entry()], 0)
        for revision in (0, True, None):
            with self.assertRaises(Conflict):
                self.store.replace([], revision)
        self.assertEqual(self.store.read()["entries"], [entry()])

    def test_validation(self):
        for value in (None, [None], [{}], [entry("")], [entry("x"*201)],
                      [entry(ident="")], [entry(ident="x"*129)],
                      [entry(), entry("ipa", "2")], [entry(), entry("Stout")],
                      [entry()] * 101, [entry(ident=1)]):
            with self.subTest(value=str(value)[:100]), self.assertRaises(ValueError):
                validate(value)
        with patch("server.library_store.MAX_BYTES", 1), self.assertRaises(ValueError):
            validate([entry()])

    def test_atomic_failure(self):
        self.store.replace([entry()], 0)
        with patch("server.library_store.os.replace", side_effect=OSError("failure")):
            with self.assertRaises(OSError):
                self.store.replace([], 1)
        self.assertEqual(self.store.read()["entries"], [entry()])
        self.assertEqual({p.name for p in Path(self.temp.name).iterdir()},
                         {"library.json", "library.lock"})

    def test_concurrent_writes(self):
        def write(i):
            try:
                self.store.replace([entry(str(i))], 0)
                return True
            except Conflict:
                return False
        with ThreadPoolExecutor(max_workers=4) as pool:
            self.assertEqual(sum(pool.map(write, range(8))), 1)
        self.assertEqual(self.store.read()["revision"], 1)
