"""
Connect to DB (Postgres/MySQL/SQLite) and export table/column metadata into
system-docs/schema/*.md. DB connection is read from environment variables.

Supported env vars:
 - DOCS_DB_URL (eg: postgres://user:pass@host:5432/dbname)
If not present, the script will attempt to parse local migrations to build a simple
schema summary (fallback mode).
"""
import os
import sys
from pathlib import Path
from urllib.parse import urlparse
import psycopg2

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'schema'
OUT.mkdir(exist_ok=True)

DB_URL = os.environ.get('DOCS_DB_URL')


def fallback_from_migrations():
    mig_dir = ROOT.parent / 'database' / 'migrations'
    if not mig_dir.exists():
        print('No migrations folder found; skipping schema extraction')
        return
    for f in mig_dir.glob('*.sql'):
        text = f.read_text(encoding='utf-8')
        # crude parse: find CREATE TABLE statements
        for tbl in text.split('CREATE TABLE'):
            if '(' in tbl:
                name = tbl.split('(')[0].strip().split()[-1]
                cols = tbl.split('(')[1].split(')')[0]
                md = f"---\ntitle: \"{name}\"\nsource: \"{f.name}\"\n\n---\n\n# Table: {name}\n\nColumns:\n\n"
                for line in cols.split(','):
                    md += f"- {line.strip()}\n"
                out_file = OUT / f"{name}.md"
                out_file.write_text(md, encoding='utf-8')
                print('Wrote', out_file)


def extract_postgres(url):
    parsed = urlparse(url)
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
    tables = [r[0] for r in cur.fetchall()]
    for t in tables:
        cur.execute("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name=%s;", (t,))
        cols = cur.fetchall()
        md = f"---\ntitle: \"{t}\"\nsource: \"database\"\n---\n\n# Table: {t}\n\nColumns:\n\n"
        for c in cols:
            md += f"- {c[0]}: {c[1]} (nullable={c[2]})\n"
        (OUT / f"{t}.md").write_text(md, encoding='utf-8')
        print('Wrote', t)


if __name__ == '__main__':
    if not DB_URL:
        print('DOCS_DB_URL not set; attempting migration fallback')
        fallback_from_migrations()
        sys.exit(0)
    if DB_URL.startswith('postgres'):
        extract_postgres(DB_URL)
    else:
        print('Unsupported DB scheme for automated extraction; using fallback')
        fallback_from_migrations()
