import { Controller, Get, Req, Res } from '@nestjs/common';


@Controller()
export class HealthController {
  @Get('health')
  health(@Req() req: any, @Res() res: any) {
    // express app locals set in main.ts
    const isDry = Boolean(req && req.app && (req.app.locals as any)?.isDryRun);
    if (isDry) {
      return res.status(503).json({ status: 'dry-run', ok: false, message: 'Running in dry-run mode, not production healthy' });
    }
    return res.status(200).json({ status: 'ok', ok: true });
  }
}
