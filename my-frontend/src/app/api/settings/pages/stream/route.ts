import fs from 'fs';
import path from 'path';

export async function GET() {
  const projectRoot = process.cwd();
  const appDir = path.join(projectRoot, 'src', 'app');
  const pagesDir = path.join(projectRoot, 'src', 'pages');

  const encoder = new TextEncoder();

  let watchers: fs.FSWatcher[] = [];
  let keepAlive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // initial retry hint
      controller.enqueue(encoder.encode('retry: 2000\n\n'));

      const watchIfExists = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        try {
          const w = fs.watch(dir, { recursive: true }, (eventType, filename) => {
            const payload = { eventType, filename: filename || null, timestamp: Date.now() };
            try {
              controller.enqueue(encoder.encode(`event: change\ndata: ${JSON.stringify(payload)}\n\n`));
            } catch (e) {
              // ignore enqueue errors
            }
          });
          watchers.push(w);
        } catch (e) {
          // ignore watcher errors on some platforms
        }
      };

      watchIfExists(appDir);
      watchIfExists(pagesDir);

      // keepalive ping every 15s
      keepAlive = setInterval(() => {
        try { controller.enqueue(encoder.encode(`event: ping\ndata: ${Date.now()}\n\n`)); } catch {}
      }, 15000);
    },
    cancel() {
      if (keepAlive) {
        try { clearInterval(keepAlive as any); } catch {}
        keepAlive = null;
      }
      for (const w of watchers) {
        try { w.close(); } catch {}
      }
      watchers = [];
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
