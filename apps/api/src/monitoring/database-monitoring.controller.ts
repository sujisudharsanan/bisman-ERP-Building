import { Controller, Get, Query } from '@nestjs/common'
import { DatabaseMonitoringService } from '../../../../libs/shared/monitoring/database-monitoring.service'

@Controller('api/monitoring')
export class DatabaseMonitoringController {
  constructor(private readonly monitoringService: DatabaseMonitoringService) {}

  @Get('db-stats')
  getQueryStats() {
    return this.monitoringService.getQueryStats()
  }

  @Get('db-metrics')
  getRealTimeMetrics() {
    return this.monitoringService.getRealTimeMetrics()
  }

  @Get('db-patterns')
  getQueryPatterns() {
    return this.monitoringService.analyzeQueryPatterns()
  }

  @Get('db-health')
  async getDatabaseHealth() {
    const stats = this.monitoringService.getQueryStats()
    const patterns = this.monitoringService.analyzeQueryPatterns()
    
    // Define health thresholds
    const healthScore = this.calculateHealthScore(stats)
    
    return {
      status: healthScore > 80 ? 'healthy' : healthScore > 60 ? 'warning' : 'critical',
      score: healthScore,
      stats,
      recommendations: this.generateRecommendations(stats, patterns)
    }
  }

  private calculateHealthScore(stats: any): number {
    let score = 100
    
    // Penalize for slow queries
    if (stats.slowQueries > 0) {
      const slowQueryPercentage = (stats.slowQueries / stats.total) * 100
      score -= Math.min(slowQueryPercentage * 2, 40) // Max 40 points penalty
    }
    
    // Penalize for high average duration
    if (stats.averageDuration.overall > 100) {
      score -= Math.min((stats.averageDuration.overall - 100) / 10, 30) // Max 30 points penalty
    }
    
    // Penalize for high query volume
    if (stats.last5Minutes > 500) {
      score -= Math.min((stats.last5Minutes - 500) / 50, 20) // Max 20 points penalty
    }
    
    return Math.max(score, 0)
  }

  private generateRecommendations(stats: any, patterns: any[]): string[] {
    const recommendations: string[] = []
    
    if (stats.slowQueries > 0) {
      recommendations.push('Consider adding database indexes for frequently queried columns')
      recommendations.push('Review and optimize slow queries')
    }
    
    if (stats.averageDuration.overall > 100) {
      recommendations.push('Overall query performance is below optimal. Consider query optimization.')
    }
    
    if (stats.last5Minutes > 1000) {
      recommendations.push('High query volume detected. Consider implementing caching.')
    }
    
    // Analyze patterns for recommendations
    const topPattern = patterns[0]
    if (topPattern && topPattern.avgDuration > 200) {
      recommendations.push(`Most frequent query pattern is slow (${topPattern.avgDuration}ms avg). Consider optimization.`)
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Database performance looks good!')
    }
    
    return recommendations
  }
}
