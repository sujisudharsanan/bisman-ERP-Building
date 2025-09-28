import { Module } from "@nestjs/common";
import { HealthController } from './health/health.controller';
import { MeController } from './me/me.controller';
import { AuthService } from './auth/auth.service';

@Module({
  imports: [],
  controllers: [HealthController, MeController],
  providers: [AuthService],
})
export class AppModule {}
