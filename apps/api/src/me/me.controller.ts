import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';

@Controller('api')
export class MeController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  async me(@Req() req: Request) {
    const auth = req && req.get && req.get('authorization');
    const user = await this.authService.getUserFromToken(auth);
    if (!user) throw new UnauthorizedException('Invalid or missing token');
    return user;
  }
}
