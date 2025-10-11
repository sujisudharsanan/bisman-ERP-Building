"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const health_controller_1 = require("./health/health.controller");
const me_controller_1 = require("./me/me.controller");
const auth_controller_1 = require("./auth/auth.controller");
const db_health_service_1 = require("./health/db-health.service");
const auth_service_1 = require("./auth/auth.service");
const sticky_controller_1 = require("./sticky/sticky.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [],
        controllers: [health_controller_1.HealthController, me_controller_1.MeController, auth_controller_1.AuthController, sticky_controller_1.StickyController],
        providers: [app_service_1.AppService, db_health_service_1.DbHealthService, auth_service_1.AuthService],
    })
], AppModule);
