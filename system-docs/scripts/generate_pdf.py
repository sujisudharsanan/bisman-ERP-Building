"""
Generate a PDF of the built MkDocs site.

Primary method: WeasyPrint (Python library, recommended and already in the docs venv).
Fallback: wkhtmltopdf (external binary).

Output:
  system-docs/artifacts/latest.pdf

This script is safe to run in CI or locally. It prints clear progress messages.
"""
from __future__ import annotations
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE_DIR = ROOT / "system-docs-site"
INDEX_HTML = SITE_DIR / "index.html"
ARTIFACTS = ROOT / "system-docs" / "artifacts"
PDF_OUT = ARTIFACTS / "latest.pdf"


def use_weasyprint(index: Path, out: Path) -> int:
    try:
        from weasyprint import HTML
    except Exception as e:
        print("WeasyPrint not available:", e)
        return 2
    print(f"Using WeasyPrint to render {index} -> {out}")
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    try:
        HTML(filename=str(index)).write_pdf(target=str(out))
        print(f"✅ PDF written to {out}")
        return 0
    except Exception as e:
        print("WeasyPrint failed:", e)
        return 3


def use_wkhtmltopdf(index: Path, out: Path) -> int:
    wk = shutil.which("wkhtmltopdf")
    if not wk:
        print("wkhtmltopdf not found on PATH")
        return 2
    print(f"Using wkhtmltopdf ({wk}) to render {index} -> {out}")
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    cmd = [wk, str(index), str(out)]
    try:
        subprocess.check_call(cmd)
        print(f"✅ PDF written to {out}")
        return 0
    except subprocess.CalledProcessError as e:
        print("wkhtmltopdf failed:", e)
        return 3


def use_playwright(index: Path, out: Path) -> int:
    # Call the Node Playwright script as a fallback; ensure Node & playwright are installed
    node_script = Path(__file__).resolve().parents[1] / 'scripts' / 'generate_pdf_playwright.js'
    if not node_script.exists():
        print('Playwright script not found; skipping')
        return 2
    print('Using Playwright fallback to render PDF')
    try:
        subprocess.check_call(['node', str(node_script)])
        print(f'✅ Playwright wrote PDF at {out}')
        return 0
    except subprocess.CalledProcessError as e:
        print('Playwright PDF generation failed:', e)
        return 3


def main() -> int:
    if not INDEX_HTML.exists():
        print(f"ERROR: built site index not found at {INDEX_HTML}. Run the build step first.")
        return 1

    # Prefer WeasyPrint (installed in venv), fallback to wkhtmltopdf
    status = use_weasyprint(INDEX_HTML, PDF_OUT)
    if status == 0:
        return 0
    print("Attempting wkhtmltopdf fallback...")
    status = use_wkhtmltopdf(INDEX_HTML, PDF_OUT)
    if status == 0:
        return 0
    print('Attempting Playwright fallback...')
    return use_playwright(INDEX_HTML, PDF_OUT)


if __name__ == '__main__':
    raise SystemExit(main())
