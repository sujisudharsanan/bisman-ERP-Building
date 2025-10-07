"""
Package the generated documentation site and optional PDF into a versioned ZIP.

Usage:
  python package_docs.py --version 1.2.3

Inputs:
  - site_dir: repository root / system-docs-site
  - optional PDF: system-docs/artifacts/latest.pdf

Outputs:
  - system-docs/artifacts/docs_<version>_<timestamp>.zip

This script is hardened for CI and local runs. It exits with non-zero code on
serious failures and prints clear messages for operators.
"""
from __future__ import annotations
import argparse
from datetime import datetime
from pathlib import Path
import shutil
import sys
import zipfile


ROOT = Path(__file__).resolve().parents[2]
DOCS_SITE = ROOT / "system-docs-site"
ARTIFACTS = ROOT / "system-docs" / "artifacts"
PDF_PATH = ROOT / "system-docs" / "artifacts" / "latest.pdf"


def eprint(msg: str) -> None:
    print(msg, file=sys.stderr)


def package_docs(version: str) -> Path:
    """Create a versioned zip containing the HTML site and optional PDF.

    Returns the path to the created archive.
    """
    if not DOCS_SITE.exists() or not any(DOCS_SITE.iterdir()):
        raise FileNotFoundError(f"Documentation site not found or empty at: {DOCS_SITE}")

    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    safe_version = version.replace('/', '_').replace('\n', '_')
    archive_name = f"docs_{safe_version}_{ts}.zip"
    archive_path = ARTIFACTS / archive_name

    print(f"📦 Packaging documentation into {archive_path}")

    with zipfile.ZipFile(archive_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        # Walk site directory and add files preserving relative paths
        for p in DOCS_SITE.rglob('*'):
            if p.is_file():
                rel = p.relative_to(DOCS_SITE)
                zf.write(p, arcname=Path('site') / rel)

        # Include PDF if present
        if PDF_PATH.exists():
            zf.write(PDF_PATH, arcname=Path('site') / 'latest.pdf')
            print(f"Included PDF: {PDF_PATH}")
        else:
            print("No PDF found to include; continuing without PDF")

    print(f"✅ Packaged documentation: {archive_path}")
    return archive_path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Package generated documentation site and PDF")
    parser.add_argument('--version', '-v', help='Documentation version string; can be a tag or SHA', default=None)
    args = parser.parse_args(argv)

    version = args.version or (sh := (sh := (ROOT / '.git').exists() and None)) or 'dev'
    # Try to obtain git commit if version not provided
    if version == 'dev':
        try:
            import subprocess
            git_sha = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT).decode().strip()
            version = git_sha
        except Exception:
            version = 'dev'

    try:
        archive = package_docs(version)
        print(archive)
        return 0
    except FileNotFoundError as e:
        eprint(f"ERROR: {e}")
        return 2
    except Exception as e:
        eprint(f"ERROR packaging docs: {e}")
        return 3


if __name__ == '__main__':
    raise SystemExit(main())
