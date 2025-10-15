import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Whitelist of directories under app/ that we allow scanning
const ALLOWED_DIRS = new Set([
  'hub-incharge',
  'manager',
  'admin',
  'super-admin',
]);

interface RolePageInfo {
  label: string;
  href: string;
  slug: string;
}

function titleCase(segment: string) {
  return segment
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function collectPages(baseDir: string, baseRoute: string): RolePageInfo[] {
  const results: RolePageInfo[] = [];

  const walk = (dir: string, rel: string = '') => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      const relPath = rel ? path.join(rel, entry.name) : entry.name;
      if (entry.isDirectory()) {
        // check if this directory has a page.tsx
        const pageFile = ['page.tsx','page.ts','page.jsx','page.js'].find(f => fs.existsSync(path.join(full, f)));
        if (pageFile) {
          // Exclude root index (handled elsewhere) by requiring relPath not empty
          const slug = relPath.replace(/\\/g,'/');
          if (slug !== '') {
            const label = titleCase(slug.split('/').pop() || slug);
            results.push({ label, href: `/${baseRoute}/${slug}`, slug });
          }
        }
        walk(full, relPath); // continue deeper for nested pages
      }
    }
  };

  walk(baseDir, '');
  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dir = searchParams.get('dir');
  if (!dir || !ALLOWED_DIRS.has(dir)) {
    return NextResponse.json({ pages: [], error: 'invalid or missing dir' }, { status: 400 });
  }
  try {
    const baseDir = path.join(process.cwd(), 'src', 'app', dir);
    if (!fs.existsSync(baseDir)) {
      return NextResponse.json({ pages: [], error: 'directory not found' }, { status: 404 });
    }
    const pages = collectPages(baseDir, dir).sort((a,b) => a.label.localeCompare(b.label));
    return NextResponse.json({ pages, count: pages.length });
  } catch (e: any) {
    return NextResponse.json({ pages: [], error: e.message }, { status: 500 });
  }
}

export const revalidate = 0; // always fresh