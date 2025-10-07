# BISMAN Living Documentation

This folder contains the "living docs" source. It is maintained by `system-docs/scripts/generate_docs.py` and a CI pipeline.

How it works:

- Markdown templates live under `system-docs/` with YAML front-matter.
- `scripts/generate_docs.py --fill-dates` replaces `{{AUTO_DATE_FIELD}}` with the current UTC timestamp.
- The generator can also extract code signatures (`extract_code_js.js`) and DB schema (`extract_schema.py`).
- `scripts/generate_docs.py --build` runs `mkdocs build` using `mkdocs.yml` at repository root and outputs to `system-docs-site/`.

Prerequisites:

- Python 3.10+
- mkdocs, mkdocs-material, and required mkdocs plugins (installed via `system-docs/requirements.txt`)
- Node.js 18+ (for JS extraction and npm scripts)

CI:

The repository includes a GitHub Actions workflow at `.github/workflows/docs.yml` which runs lint, generates the site, creates a PDF using `wkhtmltopdf`, packages the artifacts, and uploads the resulting ZIP.

## 📘 Living Documentation — Local Commands

Use the Makefile targets below for a reproducible local workflow:

```
make setup    # create venv and install dependencies
make build    # generate docs: fill dates, extract code, extract schema, build site
make lint     # lint markdown files
make package  # package the site into a versioned zip
make clean    # remove generated site and artifacts
```

Artifacts are created under `system-docs/artifacts/` and the HTML site is at `system-docs-site/` after a successful build.
