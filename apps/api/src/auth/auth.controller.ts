import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('api')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Minimal dev login: set an HttpOnly cookie named 'token' with value 'devtoken'
  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const { email, password } = body || {};
    // In production: validate credentials and issue real token
    // Validate against DB (or fallback to dev behavior if DB not configured)
    const user = await this.authService.validateUser(email, password);
    // If validateUser returns null, authentication failed
    if (!user) {
      // In dev fallback, validateUser will return a mock user even for any cred
      return { ok: false };
    }

    // Compute cookie secure flag
    const isProduction = process.env.NODE_ENV === 'production';
    const hostHeader = (res as any).req && ((res as any).req.hostname || ((res as any).req.headers && (res as any).req.headers.host)) || '';
    const isLocalHost = String(hostHeader).includes('localhost') || String(hostHeader).includes('127.0.0.1');
    const cookieSecure = Boolean(isProduction && !isLocalHost);

    // Sign token with sub=user.id
    const token = this.authService.signToken({ sub: user.id, email: user.email, role: user.role });
    res.cookie('token', token, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });
    return { ok: true };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    // Clear cookie with same path/sameSite options used when setting it
    res.clearCookie('token', { path: '/' });
    return { ok: true };
  }
}
