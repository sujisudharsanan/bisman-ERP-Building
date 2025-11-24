#!/usr/bin/env node
/**
 * Automated Static Scan for Potential Invalid React Elements
 * - Finds dynamic JSX like: const Comp = map[name]; return <Comp />
 * - Suggests wrapping with safeComponent(Comp, name, source)
 * - Flags inline JSX inside config/registry objects
 * - Rough circular import hints between layout, registry, sidebar, providers
 */

import { globby } from 'globby';
import fs from 'fs/promises';

const root = new URL('..', import.meta.url).pathname;

const DYNAMIC_JSX_REGEX = /[\s\S]*?([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*[A-Za-z_$][A-Za-z0-9_$]*\[[^\]]+\]\s*;[\s\S]*?<\1\b/gm;
const INLINE_JSX_IN_DATA = /[:=]\s*<\s*[A-Z][A-Za-z0-9_]*\b[\s\S]*?\/>/gm;

async function scan() {
  const files = await globby([
    'src/**/*.ts',
    'src/**/*.tsx',
    '!**/*.d.ts',
    '!node_modules/**',
  ], { cwd: root });

  const findings = { dynamicJsx: [], inlineJsxInData: [], circularHints: [] };

  // Build import graph map for simple circular hints
  const importGraph = new Map();

  for (const rel of files) {
    const path = `${root}/${rel}`;
    const text = await fs.readFile(path, 'utf8');

    // Dynamic JSX pattern
    if (DYNAMIC_JSX_REGEX.test(text)) {
      findings.dynamicJsx.push(rel);
    }

    // Inline JSX inside data/registry
    if (INLINE_JSX_IN_DATA.test(text)) {
      // Heuristic: if file includes 'registry' or 'config' or array/object literals
      if (/registry|config|menu|routes?/i.test(text)) {
        findings.inlineJsxInData.push(rel);
      }
    }

    // Simple import graph
    const imports = Array.from(text.matchAll(/import\s+[^'"\n]+from\s+['"]([^'"]+)['"]/g)).map(m => m[1]);
    importGraph.set(rel, imports);
  }

  // Heuristic circular hints across key areas
  const keyFiles = [
    'src/app/layout.tsx',
    'src/app/providers.tsx',
    'src/common/components/DynamicSidebar.tsx',
    'src/common/config/page-registry.ts',
    'src/components/layout/BaseSidebar.tsx',
  ];
  for (const a of keyFiles) {
    for (const b of keyFiles) {
      if (a === b) continue;
      const aImports = importGraph.get(a) || [];
      const bImports = importGraph.get(b) || [];
      if (aImports.some(i => i.includes(b.replace('src/', '@/')))) {
        if (bImports.some(i => i.includes(a.replace('src/', '@/')))) {
          findings.circularHints.push(`${a} <-> ${b}`);
        }
      }
    }
  }

  // Output report
  console.log('=== Invalid Component Scan Report ===');
  console.log('\nDynamic JSX candidates (wrap with safeComponent):');
  for (const f of findings.dynamicJsx) console.log(' -', f);

  console.log('\nInline JSX in registry/config (should use component refs, not JSX):');
  for (const f of findings.inlineJsxInData) console.log(' -', f);

  console.log('\nCircular import hints (manual check recommended):');
  for (const f of findings.circularHints) console.log(' -', f);

  // Return non-zero exit if risky patterns found
  const risky = findings.dynamicJsx.length + findings.inlineJsxInData.length;
  process.exitCode = risky ? 1 : 0;
}

scan().catch((e) => { console.error(e); process.exitCode = 2; });
