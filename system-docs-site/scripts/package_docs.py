"""
Package the built docs site and PDFs into a zip archive for CI artifacts.

Usage: python package_docs.py
"""
from pathlib import Path
import shutil
ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
OUT = ROOT / "artifacts"

OUT.mkdir(exist_ok=True)
archive = OUT / "docs-site.zip"
if archive.exists():
    archive.unlink()
shutil.make_archive(str(archive.with_suffix('')), 'zip', SITE)
print(f"Packaged site into {archive}")
