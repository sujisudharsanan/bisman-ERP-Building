#!/usr/bin/env node
// Use Playwright to render the built site index.html to PDF.
// This is a robust fallback when WeasyPrint or wkhtmltopdf are not available.
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const { chromium } = require('playwright');

function serveStatic(root) {
  const mime = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
  };

  const server = http.createServer((req, res) => {
    try {
      const parsed = url.parse(req.url);
      let pathname = decodeURIComponent(parsed.pathname);
      if (pathname === '/') pathname = '/index.html';
      const filePath = path.join(root, pathname);
      if (!filePath.startsWith(root)) {
        res.statusCode = 403;
        return res.end('Forbidden');
      }
      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          res.statusCode = 404;
          return res.end('Not found');
        }
        const ext = path.extname(filePath).toLowerCase();
        const type = mime[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', type);
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        stream.on('error', () => res.end());
      });
    } catch (e) {
      res.statusCode = 500;
      res.end('Server error');
    }
  });
  return server;
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const siteRoot = path.join(repoRoot, 'system-docs-site');
  const outDir = path.join(repoRoot, 'system-docs', 'artifacts');
  const outPdf = path.join(outDir, 'latest.pdf');

  if (!fs.existsSync(siteRoot)) {
    console.error('Built site not found at', siteRoot);
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  // Start a local static server so CSS/fonts/assets load correctly.
  const server = serveStatic(siteRoot);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const siteUrl = `http://127.0.0.1:${port}/`;
  console.log('Serving site at', siteUrl);

  console.log('Launching Chromium via Playwright...');
  const browser = await chromium.launch();
  // create context with a wide viewport so responsive layout matches desktop
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  // forward browser console messages to stdout for debug
  page.on('console', async msg => {
    try {
      const text = msg.text();
      const args = msg.args();
      const values = await Promise.all(args.map(a => a.jsonValue().catch(() => a.toString())));
      console.log('[pw-console]', msg.type(), text, ...values);
    } catch (e) {
      console.log('[pw-console]', msg.type(), msg.text());
    }
  });
  console.log('Loading', siteUrl);
  await page.goto(siteUrl, { waitUntil: 'networkidle' });

  // Inject print-friendly CSS overrides to ensure content is visible for PDF
  const printOverrides = `
    /* hide elements that don't belong in print */
    .md-header, .md-sidebar, .md-search, .md-overlay, .md-footer, .md-top { display: none !important; }
    /* make content use full width */
    .md-main__inner, .md-content, .md-content__inner { margin: 0 !important; padding: 0.5in !important; width: auto !important; }
    /* ensure typeset content is visible */
    .md-typeset { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
    /* avoid sticky positioning interfering with print layout */
    header, .md-header, .md-sidebar { position: static !important; }
  `;
  try {
    await page.addStyleTag({ content: printOverrides });
  } catch (e) {
    console.warn('Failed to inject print CSS:', e && e.message ? e.message : e);
  }

  // Wait for the main content to be present and have some text.
  const contentSelector = '.md-content__inner, article.md-content__inner, .md-typeset';
    try {
    await page.waitForSelector(contentSelector, { timeout: 10000 });
    // wait until the selector contains non-trivial text
    const maxChecks = 6;
    let ok = false;
    for (let i = 0; i < maxChecks; i++) {
      const len = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return el ? (el.innerText || el.textContent || '').trim().length : 0;
      }, contentSelector);
      if (len && len > 20) {
        ok = true;
        break;
      }
      await page.waitForTimeout(700);
    }
    if (!ok) {
      console.warn('Content selector present but text length is small; continuing anyway');
    }
  } catch (e) {
    console.warn('Content selector not found before timeout, continuing to render PDF');
  }

  // Wait for webfonts to load and a short extra delay so client-side scripts settle
  try {
    await page.evaluate(() => document.fonts && document.fonts.ready ? undefined : undefined);
    if (page.evaluate) {
      await page.evaluate(() => {});
    }
    await page.waitForTimeout(2000);
    // ensure print overrides applied
    await page.addStyleTag({ content: '@media print{html,body{background:#fff!important}}' });
  } catch (e) {
    console.warn('Font or extra wait step failed:', e && e.message ? e.message : e);
  }

  // take a screenshot for debugging what the page looks like
  const screenshotPath = path.join(outDir, 'debug.png');
  try {
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Saved debug screenshot to', screenshotPath);
  } catch (e) {
    console.warn('Screenshot failed:', e && e.message ? e.message : e);
  }

  // Save the rendered HTML and some text sample for debugging
  try {
    const renderedHtml = await page.content();
    const dumpHtmlPath = path.join(outDir, 'debug_rendered.html');
    fs.writeFileSync(dumpHtmlPath, renderedHtml, 'utf8');
    const visibleText = await page.evaluate(() => document.body.innerText || document.body.textContent || '');
    const sample = (visibleText || '').trim().slice(0, 2000);
    const samplePath = path.join(outDir, 'debug_text_sample.txt');
    fs.writeFileSync(samplePath, sample, 'utf8');
    console.log('Saved rendered HTML to', dumpHtmlPath);
    console.log('Saved text sample to', samplePath, `(length ${sample.length})`);
  } catch (e) {
    console.warn('Failed to save rendered HTML/text:', e && e.message ? e.message : e);
  }

  console.log('Rendering PDF to', outPdf);
  await page.pdf({ path: outPdf, format: 'A4', printBackground: true, preferCSSPageSize: true });

  // If PDF appears tiny or content seems missing, render a content-only fallback
  try {
    const stats = fs.statSync(outPdf);
    if (stats.size < 20000) {
      console.log('PDF size small (', stats.size, 'bytes ). Running content-only fallback...');
      // extract main article content from the rendered page
      const contentHtml = await page.evaluate(() => {
        const sel = document.querySelector('.md-content__inner') || document.querySelector('article') || document.body;
        return sel ? sel.outerHTML : '';
      });

      if (contentHtml && contentHtml.length > 10) {
        // try to inline main css from built site
        let cssText = '';
        try {
          const stylesDir = path.join(siteRoot, 'assets', 'stylesheets');
          if (fs.existsSync(stylesDir)) {
            const files = fs.readdirSync(stylesDir).filter(f => f.endsWith('.css'));
            for (const f of files) {
              try { cssText += '\n/* ' + f + ' */\n' + fs.readFileSync(path.join(stylesDir, f), 'utf8'); } catch(e){}
            }
          }
        } catch (e) {
          console.warn('Failed to read stylesheet files for fallback:', e && e.message ? e.message : e);
        }

        const fallbackHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${cssText}\n${printOverrides}</style></head><body>${contentHtml}</body></html>`;

        const printPage = await context.newPage();
        await printPage.setContent(fallbackHtml, { waitUntil: 'networkidle' });
        const fallbackPdf = outPdf.replace(/\.pdf$/, '.content-fallback.pdf');
        console.log('Rendering fallback PDF to', fallbackPdf);
        await printPage.pdf({ path: fallbackPdf, format: 'A4', printBackground: true, preferCSSPageSize: true });
        await printPage.close();
        console.log('✅ Fallback PDF written to', fallbackPdf);
      } else {
        console.warn('Content fallback: no content found to render');
      }
    }
  } catch (e) {
    console.warn('Error checking PDF or running fallback:', e && e.message ? e.message : e);
  }
  await browser.close();

  server.close();
  console.log('✅ PDF written to', outPdf);
}

main().catch(err => {
  console.error('Playwright PDF generation failed:', err);
  process.exit(2);
});
