import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { MeController } from './me/me.controller';
import { AuthController } from './auth/auth.controller';
import { DbHealthService } from './health/db-health.service';
import { AuthService } from './auth/auth.service';

@Module({
  imports: [],
  controllers: [HealthController, MeController, AuthController],
  providers: [AppService, DbHealthService, AuthService],
})
export class AppModule {}
