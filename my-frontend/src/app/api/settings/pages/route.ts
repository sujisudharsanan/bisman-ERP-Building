import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type PageEntry = {
  name: string;
  filePath: string;
  urlPath: string;
  connected: string[];
  status: 'connected' | 'partial' | 'missing';
  accessRoles: string[];
  notes: string[];
};

const projectRoot = process.cwd();

function walk(dir: string, out: string[] = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      // skip node_modules and .next
      if (ent.name === 'node_modules' || ent.name === '.next') continue;
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

function scanPages(): PageEntry[] {
  const results: PageEntry[] = [];
  const appDir = path.join(projectRoot, 'src', 'app');
  const pagesDir = path.join(projectRoot, 'src', 'pages');
  const candidates: string[] = [];

  if (fs.existsSync(appDir)) {
    walk(appDir, candidates);
  }
  if (fs.existsSync(pagesDir)) {
    walk(pagesDir, candidates);
  }

  const pageFiles = candidates.filter(f => /page\.(tsx|jsx|ts|js)$/.test(f) || /index\.(tsx|jsx|ts|js)$/.test(f));

  for (const file of pageFiles) {
    try {
      const rel = path.relative(projectRoot, file);
      const content = fs.readFileSync(file, 'utf8');

      // derive url path for app router
      let urlPath = '';
      if (file.includes(path.join('src', 'app'))) {
        const p = path.dirname(path.relative(path.join(projectRoot, 'src', 'app'), file));
        urlPath = '/' + (p === '.' ? '' : p);
        urlPath = urlPath.replace(/\\/g, '/');
      } else if (file.includes(path.join('src', 'pages'))) {
        const relp = path.relative(path.join(projectRoot, 'src', 'pages'), file);
        const withoutExt = relp.replace(/index\.(tsx|jsx|ts|js)$/i, '').replace(/\.(tsx|jsx|ts|js)$/i, '');
        urlPath = '/' + withoutExt;
        urlPath = urlPath.replace(/\\/g, '/');
      }
      if (urlPath === '/') urlPath = '/';

  const connected: string[] = [];
  const notes: string[] = [];
  const accessRoles: string[] = [];
      const checks: { name: string; pattern: RegExp }[] = [
        { name: 'layout', pattern: /layout\.(tsx|jsx|ts|js)/i },
        { name: 'DashboardLayout', pattern: /DashboardLayout/i },
        { name: 'DashboardSidebar', pattern: /DashboardSidebar/i },
        { name: 'TopNavbar', pattern: /TopNavbar/i },
        { name: 'useAuth', pattern: /useAuth\(|from\s+['"][^'"]*useAuth['"]/i },
        { name: 'roleBinding', pattern: /roleName|STAFF|SUPER_ADMIN|ADMIN|MANAGER/i },
      ];

      // look for layout files in the same folder or parent
      const dir = path.dirname(file);
      let hasLayout = false;
      let cur = dir;
      for (let i = 0; i < 6; i++) {
        const layoutFile = path.join(cur, 'layout.tsx');
        if (fs.existsSync(layoutFile)) {
          hasLayout = true;
          break;
        }
        const parent = path.dirname(cur);
        if (parent === cur) break;
        cur = parent;
      }
  if (hasLayout) connected.push('layout');

      for (const c of checks) {
        if (c.pattern.test(content)) {
          if (!connected.includes(c.name)) connected.push(c.name);
        }
      }

      // detect explicit role mentions
      try {
        const roleMatches = content.match(/\b(SUPER_ADMIN|ADMIN|MANAGER|STAFF|USER|GUEST)\b/g);
        if (roleMatches) {
          for (const r of roleMatches) {
            if (!accessRoles.includes(r)) accessRoles.push(r);
          }
        }
      } catch {}

      // add notes for missing pieces
      if (!hasLayout) notes.push('No layout file detected in folder or parents');
      if (connected.length === 0) notes.push('No connected UI elements found (layout, navbar, sidebar, hooks)');

      const status: PageEntry['status'] = connected.length >= 2 ? 'connected' : connected.length > 0 ? 'partial' : 'missing';

      results.push({
        name: path.basename(file),
        filePath: rel,
        urlPath: urlPath === '/' ? '/' : urlPath.replace(/\\/g, '/'),
        connected,
        status,
        accessRoles,
        notes,
      });
    } catch (err) {
      // ignore problematic files
    }
  }

  // sort by urlPath
  results.sort((a, b) => a.urlPath.localeCompare(b.urlPath));

  // If a hub-incharge page exists, synthesize tab entries for its internal tabs so
  // the SuperAdmin panel can jump directly to specific HubIncharge tabs.
  try {
    const hubPage = path.join(projectRoot, 'src', 'app', 'hub-incharge', 'page.tsx');
    if (fs.existsSync(hubPage)) {
      const hubTabs = ['Dashboard','About Me','Approvals','Purchase','Expenses','Performance','Messages','Create Task','Tasks & Requests','Settings'];
      for (const t of hubTabs) {
        results.push({
          name: `HubIncharge: ${t}`,
          filePath: path.relative(projectRoot, hubPage),
          urlPath: `/hub-incharge?tab=${encodeURIComponent(t)}`,
          connected: ['HubInchargeEmbed'],
          status: 'connected',
          accessRoles: ['STAFF','ADMIN','MANAGER'],
          notes: [`Synthetic entry for HubIncharge tab: ${t}`],
        });
      }
    }
  } catch (e) {
    // ignore
  }
  return results;
}

export async function GET() {
  try {
    const data = scanPages();
    return NextResponse.json({ pages: data }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
