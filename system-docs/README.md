# BISMAN Living Documentation

This folder contains the "living docs" source. The repository previously included a Python-based generator (`system-docs/scripts/generate_docs.py`) and a CI pipeline to build/package the site.
NOTE: The Python docs toolchain has been removed from this branch; the generator scripts and requirements were deleted. If you need to restore the generator, re-add the scripts and `system-docs/requirements.txt`, or revert this change.

How it works:

- Markdown templates live under `system-docs/` with YAML front-matter.
- `scripts/generate_docs.py --fill-dates` replaces `{{AUTO_DATE_FIELD}}` with the current UTC timestamp.
- The generator can also extract code signatures (`extract_code_js.js`) and DB schema (`extract_schema.py`).
- `scripts/generate_docs.py --build` runs `mkdocs build` using `mkdocs.yml` at repository root and outputs to `system-docs-site/`.

Prerequisites (if generator is restored):

- Python 3.10+
- mkdocs, mkdocs-material, and required mkdocs plugins (installed via `system-docs/requirements.txt`)
- Node.js 18+ (for JS extraction and npm scripts)

CI:

The repository used to include a GitHub Actions workflow at `.github/workflows/docs.yml` that ran the Python-based generator; that workflow has been simplified to skip docs generation in CI on this branch.

## 📘 Living Documentation — Local Commands

Makefile targets that invoked the Python toolchain have been disabled in this branch. If you want to re-enable them, restore the deleted scripts and `system-docs/requirements.txt`.

Artifacts are created under `system-docs/artifacts/` and the HTML site is at `system-docs-site/` after a successful build.
