Debug Recorder & Analyzer Prototype
=================================

Usage
-----

Record a flow (Playwright must be available in this project):

```bash
npm run debug:record -- --test=tests/playwright/login.spec.ts
```

Analyze the most recent run:

```bash
npm run debug:analyze
```

Or run both:

```bash
npm run debug:report
```

Notes
-----
- Patches are suggestions only. Review before applying.
- Artifacts are written under `debug-artifacts/<timestamp>` and are gitignored.
