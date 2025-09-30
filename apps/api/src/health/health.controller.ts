import { Controller, Get, Req, Res } from '@nestjs/common';
import { DbHealthService } from './db-health.service';

// Note: this controller exposes a lightweight DB health check at /api/health/db


@Controller()
export class HealthController {
  constructor(private readonly dbHealth: DbHealthService) {}

  @Get('health')
  health(@Req() req: any, @Res() res: any) {
    // express app locals set in main.ts
    const isDry = Boolean(req && req.app && (req.app.locals as any)?.isDryRun);
    if (isDry) {
      return res.status(503).json({ status: 'dry-run', ok: false, message: 'Running in dry-run mode, not production healthy' });
    }
    return res.status(200).json({ status: 'ok', ok: true });
  }

  @Get('api/health/db')
  async db(@Req() _req: any, @Res() res: any) {
    try {
      const ok = await this.dbHealth.check();
      if (ok) return res.status(200).json({ status: 'ok', ok: true });
      return res.status(503).json({ status: 'error', ok: false });
    } catch (err) {
      return res.status(503).json({ status: 'error', ok: false, message: String(err && err.message) });
    }
  }
}
