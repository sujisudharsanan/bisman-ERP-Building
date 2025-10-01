import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  RefreshIcon,
  IconButton
} from '@mui/material'
import { Refresh } from '@mui/icons-material'
import LogoutButton from '../ui/LogoutButton'

interface DatabaseStats {
  total: number
  last5Minutes: number
  slowQueries: number
  errors: number
  averageDuration: number
  slowQueryThreshold: number
  recentSlowQueries: Array<{
    query: string
    duration: number
    timestamp: string
  }>
}

interface HealthInfo {
  score: number
  status: 'healthy' | 'warning' | 'critical'
}

interface MonitoringData {
  status: string
  monitoring: DatabaseStats
  health: HealthInfo
}

const DatabaseMonitoringDashboard: React.FC = () => {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchMonitoringData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/db-monitoring')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const result = await response.json()
      setData(result)
      setError(null)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMonitoringData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMonitoringData, 30000)
    return () => clearInterval(interval)
  }, [])

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success'
      case 'warning': return 'warning'
      case 'critical': return 'error'
      default: return 'info'
    }
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅'
      case 'warning': return '⚠️'
      case 'critical': return '🚨'
      default: return '❓'
    }
  }

  if (loading && !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Database Monitoring
        </Typography>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading monitoring data...</Typography>
      </Box>
    )
  }

  if (error && !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Database Monitoring
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load monitoring data: {error}
        </Alert>
        <IconButton onClick={fetchMonitoringData} sx={{ mt: 2 }}>
          <Refresh />
        </IconButton>
      </Box>
    )
  }

  if (!data) return null

  const { monitoring, health } = data

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3 },
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 },
        mb: { xs: 2, sm: 3 }
      }}>
        <Typography 
          variant="h4"
          sx={{ 
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
            fontWeight: 600,
            color: '#1976d2'
          }}
        >
          Database Monitoring
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 1, sm: 2 },
          flexDirection: { xs: 'column', sm: 'row' },
          width: { xs: '100%', sm: 'auto' }
        }}>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              order: { xs: 2, sm: 1 }
            }}
          >
            Last updated: {lastRefresh.toLocaleTimeString()}
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            order: { xs: 1, sm: 2 }
          }}>
            <IconButton 
              onClick={fetchMonitoringData} 
              disabled={loading}
              size={window?.innerWidth < 768 ? 'small' : 'medium'}
              sx={{ color: '#1976d2' }}
            >
              <Refresh />
            </IconButton>
            <LogoutButton variant="danger" />
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert 
          severity="warning" 
          sx={{ 
            mb: { xs: 2, sm: 3 },
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          {error}
        </Alert>
      )}

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Health Overview */}
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
              >
                {getHealthIcon(health.status)} Overall Health
              </Typography>
              <Chip 
                label={health.status.toUpperCase()} 
                color={getHealthColor(health.status)} 
                sx={{ 
                  mb: 2,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
                size={window?.innerWidth < 768 ? 'small' : 'medium'}
              />
              <LinearProgress 
                variant="determinate" 
                value={health.score} 
                color={getHealthColor(health.status)}
                sx={{ mb: 1, height: { xs: 6, sm: 8 } }}
              />
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
              >
                Health Score: {health.score}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Query Statistics */}
        <Grid item xs={12} sm={6} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
              >
                Query Statistics
              </Typography>
              <Grid container spacing={{ xs: 1, sm: 2 }}>
                <Grid item xs={6} sm={3}>
                  <Typography 
                    variant="h4" 
                    color="primary"
                    sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}
                  >
                    {monitoring.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Queries
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h4" color="info.main">
                    {monitoring.last5Minutes}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last 5 Minutes
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h4" color="warning.main">
                    {monitoring.slowQueries}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Slow Queries
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h4" color="error.main">
                    {monitoring.errors}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Errors
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Average Query Duration
                </Typography>
                <Typography variant="h5" color={monitoring.averageDuration > 100 ? 'error.main' : 'success.main'}>
                  {monitoring.averageDuration}ms
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Slow Query Threshold
                </Typography>
                <Typography variant="body1">
                  {monitoring.slowQueryThreshold}ms
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recommendations
              </Typography>
              {monitoring.slowQueries > 0 && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  {monitoring.slowQueries} slow queries detected. Consider optimizing or adding indexes.
                </Alert>
              )}
              {monitoring.errors > 0 && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {monitoring.errors} query errors detected. Check application logs.
                </Alert>
              )}
              {monitoring.slowQueries === 0 && monitoring.errors === 0 && (
                <Alert severity="success">
                  Database performance looks good! 🎉
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Slow Queries */}
        {monitoring.recentSlowQueries.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Slow Queries
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Query</TableCell>
                        <TableCell align="right">Duration</TableCell>
                        <TableCell align="right">Timestamp</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {monitoring.recentSlowQueries.map((query, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                maxWidth: '400px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {query.query}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={`${query.duration}ms`} 
                              color="warning" 
                              size="small" 
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {new Date(query.timestamp).toLocaleTimeString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}

export default DatabaseMonitoringDashboard
