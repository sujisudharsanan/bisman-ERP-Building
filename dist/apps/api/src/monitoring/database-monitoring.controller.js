"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseMonitoringController = void 0;
const common_1 = require("@nestjs/common");
const database_monitoring_service_1 = require("../../../../libs/shared/monitoring/database-monitoring.service");
let DatabaseMonitoringController = class DatabaseMonitoringController {
    monitoringService;
    constructor(monitoringService) {
        this.monitoringService = monitoringService;
    }
    getQueryStats() {
        return this.monitoringService.getQueryStats();
    }
    getRealTimeMetrics() {
        return this.monitoringService.getRealTimeMetrics();
    }
    getQueryPatterns() {
        return this.monitoringService.analyzeQueryPatterns();
    }
    async getDatabaseHealth() {
        const stats = this.monitoringService.getQueryStats();
        const patterns = this.monitoringService.analyzeQueryPatterns();
        const healthScore = this.calculateHealthScore(stats);
        return {
            status: healthScore > 80 ? 'healthy' : healthScore > 60 ? 'warning' : 'critical',
            score: healthScore,
            stats,
            recommendations: this.generateRecommendations(stats, patterns)
        };
    }
    calculateHealthScore(stats) {
        let score = 100;
        if (stats.slowQueries > 0) {
            const slowQueryPercentage = (stats.slowQueries / stats.total) * 100;
            score -= Math.min(slowQueryPercentage * 2, 40);
        }
        if (stats.averageDuration.overall > 100) {
            score -= Math.min((stats.averageDuration.overall - 100) / 10, 30);
        }
        if (stats.last5Minutes > 500) {
            score -= Math.min((stats.last5Minutes - 500) / 50, 20);
        }
        return Math.max(score, 0);
    }
    generateRecommendations(stats, patterns) {
        const recommendations = [];
        if (stats.slowQueries > 0) {
            recommendations.push('Consider adding database indexes for frequently queried columns');
            recommendations.push('Review and optimize slow queries');
        }
        if (stats.averageDuration.overall > 100) {
            recommendations.push('Overall query performance is below optimal. Consider query optimization.');
        }
        if (stats.last5Minutes > 1000) {
            recommendations.push('High query volume detected. Consider implementing caching.');
        }
        const topPattern = patterns[0];
        if (topPattern && topPattern.avgDuration > 200) {
            recommendations.push(`Most frequent query pattern is slow (${topPattern.avgDuration}ms avg). Consider optimization.`);
        }
        if (recommendations.length === 0) {
            recommendations.push('Database performance looks good!');
        }
        return recommendations;
    }
};
exports.DatabaseMonitoringController = DatabaseMonitoringController;
__decorate([
    (0, common_1.Get)('db-stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DatabaseMonitoringController.prototype, "getQueryStats", null);
__decorate([
    (0, common_1.Get)('db-metrics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DatabaseMonitoringController.prototype, "getRealTimeMetrics", null);
__decorate([
    (0, common_1.Get)('db-patterns'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DatabaseMonitoringController.prototype, "getQueryPatterns", null);
__decorate([
    (0, common_1.Get)('db-health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DatabaseMonitoringController.prototype, "getDatabaseHealth", null);
exports.DatabaseMonitoringController = DatabaseMonitoringController = __decorate([
    (0, common_1.Controller)('api/monitoring'),
    __metadata("design:paramtypes", [database_monitoring_service_1.DatabaseMonitoringService])
], DatabaseMonitoringController);
