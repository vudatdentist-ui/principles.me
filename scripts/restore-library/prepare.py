"""Restore data files only. Never run executable content from book packages."""
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import sys
import urllib.request
import zipfile

out = Path(sys.argv[1])
out.mkdir(mode=0o700)
books = []
for item in json.loads(os.environ["BOOK_RESTORE_PACKAGES"]):
    url = item["url"]
    if not url.startswith("https://"):
        raise ValueError("HTTPS required")
    try:
        with urllib.request.urlopen(url, timeout=90) as response:
            raw = response.read(32 * 1024 * 1024 + 1)
    except Exception:
        raise RuntimeError("Temporary book download unavailable") from None
    if hashlib.sha256(raw).hexdigest() != item["sha256"]:
        raise ValueError("Release checksum mismatch")
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        def read_one(fragment):
            names = [n for n in archive.namelist() if fragment in "/" + n and n.endswith(".json")]
            if len(names) != 1 or archive.getinfo(names[0]).file_size > 100_000_000:
                raise ValueError("Unexpected book layout")
            return PurePosixPath(names[0]).name, archive.read(names[0])
        _, manifest = read_one("/manifest.json")
        meta = json.loads(manifest)
        if (meta["anythingllm_native_model_id"], meta["embedding_dimensions"]) != ("MintplexLabs/multilingual-e5-small", 384):
            raise ValueError("Incompatible embeddings")
        name, document = read_one("/documents/custom-documents/")
        _, vectors = read_one("/vector-cache/")
        if name in books:
            raise ValueError("Duplicate book")
        (out / name).write_bytes(document)
        (out / (name + ".vectors")).write_bytes(vectors)
        books.append(name)
if not books:
    raise ValueError("Empty release")
(out / "books.json").write_text(json.dumps(books))
print("Verified book packages:", len(books))
