import { Controller, Get, Req, Query, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';

@Controller('api')
export class MeController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  async me(@Req() req: Request, @Query('role') requiredRole?: string) {
    // Accept either an Authorization header or the 'token' cookie
    const auth = req && req.get && req.get('authorization');
    try {
      console.log('[ME DEBUG] headers.authorization=', auth);
      console.log('[ME DEBUG] cookies=', req.cookies);
    } catch (e) { /* ignore */ }

    let tokenSource = auth;
    if (!tokenSource) {
      const cookieToken = req.cookies && req.cookies['token'];
      if (cookieToken) tokenSource = `Bearer ${cookieToken}`;
    }

    const user = await this.authService.getUserFromToken(tokenSource);
    if (!user) throw new UnauthorizedException('Invalid or missing token');

    // If a required role was requested, enforce it here. Accept either
    // the numeric/DB role string or an uppercase role name.
    if (requiredRole) {
      const actual = String((user as any).role || '').toUpperCase();
      const required = String(requiredRole || '').toUpperCase();
      if (actual !== required) throw new ForbiddenException('Insufficient role');
    }

    return user;
  }
}
