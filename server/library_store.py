"""Small, durable shared beverage library; no database required."""
import fcntl
import json
import os
import tempfile
from pathlib import Path
from contextlib import contextmanager

MAX_BYTES = 16 * 1024 * 1024
MAX_ITEMS = 100

class Conflict(Exception):
    pass

def validate(entries):
    if not isinstance(entries, list) or len(entries) > MAX_ITEMS:
        raise ValueError("Invalid library size")
    names, ids = set(), set()
    for entry in entries:
        if not isinstance(entry, dict) or not isinstance(entry.get("item"), dict):
            raise ValueError("Invalid entry")
        name = entry["item"].get("name")
        ident = entry.get("id")
        if not isinstance(name, str) or not name.strip() or len(name) > 200:
            raise ValueError("Invalid name")
        if not isinstance(ident, str) or not ident or len(ident) > 128:
            raise ValueError("Invalid ID")
        key = name.strip().casefold()
        if key in names or ident in ids:
            raise ValueError("Duplicate entry")
        names.add(key)
        ids.add(ident)
    if len(json.dumps(entries, allow_nan=False).encode()) > MAX_BYTES:
        raise ValueError("Library too large")

class Library:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.path = self.directory / "library.json"

    @contextmanager
    def locked(self):
        with (self.directory / "library.lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            yield

    def _read(self):
        if not self.path.exists():
            return {"revision": 0, "entries": []}
        with self.path.open(encoding="utf-8") as source:
            data = json.load(source)
        validate(data["entries"])
        return data

    def read(self):
        with self.locked():
            return self._read()

    def _backup(self, current):
        if not self.path.exists():
            return
        folder = self.directory / "backups"
        folder.mkdir(exist_ok=True)
        target = folder / f"library-{current['revision']:020d}.json"
        self._atomic_write(target, current)
        for old in sorted(folder.glob("library-*.json"))[:-10]:
            old.unlink()

    def replace(self, entries, revision):
        validate(entries)
        with self.locked():
            current = self._read()
            if type(revision) is not int or revision != current["revision"]:
                raise Conflict("Library changed; reload before saving")
            data = {"revision": revision + 1, "entries": entries}
            self._backup(current)
            self._atomic_write(self.path, data)
            return data

    def _atomic_write(self, path, data):
        fd, name = tempfile.mkstemp(dir=path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as target:
                json.dump(data, target, ensure_ascii=False, allow_nan=False)
                target.flush()
                os.fsync(target.fileno())
            os.replace(name, path)
            directory_fd = os.open(path.parent, os.O_DIRECTORY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
        finally:
            if os.path.exists(name):
                os.unlink(name)
