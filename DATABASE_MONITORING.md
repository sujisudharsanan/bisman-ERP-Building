# Database Query Monitoring System

## Overview

This comprehensive database monitoring system provides real-time tracking of database query performance, health monitoring, and automated alerting for your ERP application.

## Features

### 🔍 Query Performance Tracking
- Real-time query execution monitoring
- Response time measurement
- Slow query detection and logging
- Query pattern analysis

### 📊 Health Monitoring
- Overall database health scoring
- Performance trend analysis
- Automated health status determination
- Resource utilization tracking

### 🚨 Alerting & Notifications
- Configurable slow query thresholds
- Error rate monitoring
- Performance degradation alerts
- Historical performance data

### 📈 Analytics Dashboard
- Visual performance metrics
- Query statistics overview
- Health score visualization
- Recent slow queries display

## Architecture

### Backend Components

#### 1. Query Monitor (`my-backend/middleware/database.js`)
```javascript
class QueryMonitor {
  - Query execution tracking
  - Performance metrics collection
  - Slow query detection
  - Error logging
}
```

#### 2. Database Monitoring Service (`libs/shared/monitoring/database-monitoring.service.ts`)
```typescript
class DatabaseMonitoringService {
  - Prometheus metrics integration
  - Advanced query analysis
  - Health scoring algorithm
  - Performance trend analysis
}
```

#### 3. Monitored Database Pool (`libs/shared/database/monitored-pool.ts`)
```typescript
class MonitoredPool extends Pool {
  - Automatic query instrumentation
  - Connection pool monitoring
  - Performance data collection
}
```

### Frontend Components

#### Database Monitoring Dashboard (`my-frontend/src/components/monitoring/DatabaseMonitoringDashboard.tsx`)
- Real-time performance metrics display
- Health status overview
- Slow query analysis
- Interactive charts and graphs

## Installation & Setup

### 1. Backend Setup

#### Install Dependencies
```bash
cd my-backend
npm install express cors pg dotenv
```

#### Environment Configuration
Create `.env` file in `my-backend/`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/database
PORT=3001
SLOW_QUERY_THRESHOLD_MS=1000
```

#### Start Backend Server
```bash
cd my-backend
PORT=3001 node index.js
```

### 2. Frontend Setup

#### Install Dependencies
```bash
cd my-frontend
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
```

#### Add Monitoring Route
The monitoring dashboard is available at:
```
http://localhost:3000/dashboard/monitoring
```

### 3. Database Configuration

Ensure your PostgreSQL database is running and accessible. The monitoring system will automatically:
- Track all query executions
- Measure response times
- Detect slow queries
- Log performance metrics

## API Endpoints

### GET /api/db-monitoring
Returns comprehensive database monitoring data:

```json
{
  "status": "ok",
  "monitoring": {
    "total": 42,
    "last5Minutes": 8,
    "slowQueries": 2,
    "errors": 0,
    "averageDuration": 85,
    "slowQueryThreshold": 1000,
    "recentSlowQueries": [
      {
        "query": "SELECT * FROM users WHERE role = $1",
        "duration": 1250,
        "timestamp": "2025-10-01T12:34:52.602Z"
      }
    ]
  },
  "health": {
    "score": 80,
    "status": "warning"
  }
}
```

### Health Status Levels
- **healthy** (100-90): All systems optimal
- **warning** (89-70): Minor performance issues
- **critical** (<70): Significant performance problems

## Configuration Options

### Slow Query Threshold
Set in environment variables:
```env
SLOW_QUERY_THRESHOLD_MS=1000  # Default: 1000ms
```

### Monitoring History
Configure maximum stored queries:
```javascript
const queryMonitor = new QueryMonitor({
  maxHistory: 1000,  // Default: 1000 queries
  slowQueryThreshold: 1000  // Default: 1000ms
})
```

## Usage Examples

### 1. View Real-time Dashboard
Navigate to: `http://localhost:3000/dashboard/monitoring`

### 2. API Integration
```javascript
// Fetch monitoring data
const response = await fetch('/api/db-monitoring')
const data = await response.json()

console.log('Health Score:', data.health.score)
console.log('Slow Queries:', data.monitoring.slowQueries)
```

### 3. Custom Alerting
```javascript
// Check if action needed
if (data.health.status === 'critical') {
  // Send alert notification
  sendAlert('Database performance critical!')
}
```

## Monitoring Metrics

### Core Metrics
- **Total Queries**: All-time query count
- **Recent Activity**: Queries in last 5 minutes
- **Slow Queries**: Queries exceeding threshold
- **Error Count**: Failed query attempts
- **Average Duration**: Mean query response time

### Advanced Metrics
- **Query Patterns**: Most frequent queries
- **Performance Trends**: Historical performance data
- **Resource Usage**: Database connection utilization
- **Health Score**: Computed performance rating

## Troubleshooting

### Common Issues

#### 1. Server Connection Failed
```bash
# Check if backend is running
curl http://127.0.0.1:3001/api/db-monitoring

# Restart backend
cd my-backend
PORT=3001 node index.js
```

#### 2. Database Connection Issues
```bash
# Test database connectivity
curl http://127.0.0.1:3001/api/db-test
```

#### 3. High Slow Query Count
- Review and optimize slow queries
- Add database indexes
- Check database server resources
- Increase `SLOW_QUERY_THRESHOLD_MS` if needed

#### 4. Dashboard Not Loading
- Ensure frontend is running on port 3000
- Check CORS configuration in backend
- Verify API endpoint accessibility

### Debug Mode
Enable detailed logging:
```bash
DEBUG=* PORT=3001 node index.js
```

## Performance Optimization

### Database Indexing
Monitor slow queries and add appropriate indexes:
```sql
-- Example: Add index for frequently queried columns
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

### Query Optimization
- Use parameterized queries
- Limit result sets with LIMIT clauses
- Avoid SELECT * statements
- Use appropriate JOIN types

### Connection Pool Tuning
```javascript
const pool = createSecurePool(databaseUrl, {
  max: 20,        // Maximum connections
  min: 5,         // Minimum connections
  idleTimeoutMillis: 30000
})
```

## Security Considerations

- Monitor for SQL injection attempts
- Track unauthorized query patterns
- Alert on unusual query volumes
- Log all database access attempts

## Future Enhancements

- [ ] Real-time alerting via email/Slack
- [ ] Advanced query optimization suggestions
- [ ] Historical performance trending
- [ ] Custom metric dashboards
- [ ] Integration with external monitoring tools
- [ ] Automated performance tuning recommendations

## Support

For issues or questions regarding the database monitoring system:
1. Check the troubleshooting section
2. Review server logs for error details
3. Verify database connectivity
4. Ensure all dependencies are installed

## License

This monitoring system is part of the BISMAN ERP project and follows the project's licensing terms.
