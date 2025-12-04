/**
 * Test Runner API Routes
 * 
 * Provides endpoints for running security tests and retrieving results
 * for display in the Enterprise Security Dashboard.
 * 
 * @module routes/admin/testRunnerRoutes
 */

'use strict';

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const router = express.Router();

// ============================================================================
// CONFIGURATION
// ============================================================================

// Test file paths (relative to my-backend)
const TEST_FILES = {
  redis: 'tests/redisInvalidate.test.js',
  rls: 'tests/rls.test.js',
  tenantIsolation: 'tests/tenant-isolation.test.js',
  rbac: 'tests/calls.rbac.test.js',
  calls: 'tests/calls.test.js',
};

// Store test results in memory (for demo - use Redis/DB in production)
const testResults = new Map();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse Jest JSON output to extract test results
 */
function parseJestOutput(jsonOutput) {
  try {
    const data = JSON.parse(jsonOutput);
    return {
      success: data.success,
      numTotalTests: data.numTotalTests || 0,
      numPassedTests: data.numPassedTests || 0,
      numFailedTests: data.numFailedTests || 0,
      numPendingTests: data.numPendingTests || 0,
      startTime: data.startTime,
      testResults: (data.testResults || []).map(suite => ({
        name: path.basename(suite.name),
        status: suite.status,
        duration: suite.endTime - suite.startTime,
        tests: (suite.assertionResults || []).map(test => ({
          title: test.title,
          fullName: test.fullName,
          status: test.status,
          duration: test.duration,
          failureMessages: test.failureMessages || []
        }))
      }))
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to parse test output',
      rawOutput: jsonOutput.substring(0, 1000)
    };
  }
}

/**
 * Run a Jest test file and return results
 */
async function runJestTest(testFile, timeout = 60000) {
  return new Promise((resolve) => {
    const backendDir = path.join(__dirname, '..', '..');
    const testPath = path.join(backendDir, testFile);
    
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    
    const startTime = Date.now();
    
    const jest = spawn('npx', ['jest', testPath, '--json', '--forceExit'], {
      cwd: backendDir,
      env: { ...process.env, CI: 'true' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const timer = setTimeout(() => {
      timedOut = true;
      jest.kill('SIGKILL');
    }, timeout);
    
    jest.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    jest.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    jest.on('close', (code) => {
      clearTimeout(timer);
      const endTime = Date.now();
      
      if (timedOut) {
        resolve({
          testFile,
          success: false,
          error: 'Test timed out after ' + (timeout / 1000) + ' seconds',
          duration: endTime - startTime,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Extract JSON from output (Jest outputs extra stuff sometimes)
      const jsonMatch = stdout.match(/\{[\s\S]*"numTotalTests"[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = parseJestOutput(jsonMatch[0]);
        resolve({
          testFile,
          ...parsed,
          duration: endTime - startTime,
          timestamp: new Date().toISOString()
        });
      } else {
        // No JSON output - test failed to run
        resolve({
          testFile,
          success: false,
          error: stderr || 'No test output received',
          exitCode: code,
          duration: endTime - startTime,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    jest.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        testFile,
        success: false,
        error: err.message,
        timestamp: new Date().toISOString()
      });
    });
  });
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/tests
 * Get list of available tests and their last results
 */
router.get('/', (req, res) => {
  const tests = Object.entries(TEST_FILES).map(([key, file]) => {
    const lastResult = testResults.get(key);
    return {
      id: key,
      file,
      name: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
      lastResult: lastResult ? {
        success: lastResult.success,
        numPassedTests: lastResult.numPassedTests || 0,
        numFailedTests: lastResult.numFailedTests || 0,
        numTotalTests: lastResult.numTotalTests || 0,
        duration: lastResult.duration,
        timestamp: lastResult.timestamp
      } : null
    };
  });
  
  res.json({ tests });
});

/**
 * GET /api/admin/tests/:testId
 * Get detailed results for a specific test
 */
router.get('/:testId', (req, res) => {
  const { testId } = req.params;
  
  if (!TEST_FILES[testId]) {
    return res.status(404).json({ error: 'Test not found' });
  }
  
  const result = testResults.get(testId);
  
  if (!result) {
    return res.json({
      testId,
      file: TEST_FILES[testId],
      status: 'not_run',
      message: 'Test has not been run yet'
    });
  }
  
  res.json(result);
});

/**
 * POST /api/admin/tests/:testId/run
 * Run a specific test
 */
router.post('/:testId/run', async (req, res) => {
  const { testId } = req.params;
  
  if (!TEST_FILES[testId]) {
    return res.status(404).json({ error: 'Test not found' });
  }
  
  // Check if test requires database
  const dbRequiredTests = ['rls', 'tenantIsolation'];
  if (dbRequiredTests.includes(testId) && !process.env.DATABASE_URL) {
    return res.json({
      testId,
      success: false,
      skipped: true,
      reason: 'DATABASE_URL not configured - these tests require a database connection',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    const result = await runJestTest(TEST_FILES[testId]);
    testResults.set(testId, result);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      testId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/tests/run-all
 * Run all tests sequentially
 */
router.post('/run-all', async (req, res) => {
  const results = [];
  
  for (const [testId, testFile] of Object.entries(TEST_FILES)) {
    // Skip DB-required tests if no DATABASE_URL
    const dbRequiredTests = ['rls', 'tenantIsolation'];
    if (dbRequiredTests.includes(testId) && !process.env.DATABASE_URL) {
      const skipped = {
        testId,
        testFile,
        success: false,
        skipped: true,
        reason: 'DATABASE_URL not configured',
        timestamp: new Date().toISOString()
      };
      testResults.set(testId, skipped);
      results.push(skipped);
      continue;
    }
    
    try {
      const result = await runJestTest(testFile);
      result.testId = testId;
      testResults.set(testId, result);
      results.push(result);
    } catch (error) {
      const errorResult = {
        testId,
        testFile,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      testResults.set(testId, errorResult);
      results.push(errorResult);
    }
  }
  
  // Calculate summary
  const summary = {
    totalSuites: results.length,
    passedSuites: results.filter(r => r.success).length,
    failedSuites: results.filter(r => !r.success && !r.skipped).length,
    skippedSuites: results.filter(r => r.skipped).length,
    totalTests: results.reduce((sum, r) => sum + (r.numTotalTests || 0), 0),
    passedTests: results.reduce((sum, r) => sum + (r.numPassedTests || 0), 0),
    failedTests: results.reduce((sum, r) => sum + (r.numFailedTests || 0), 0),
    timestamp: new Date().toISOString()
  };
  
  res.json({ summary, results });
});

/**
 * GET /api/admin/tests/summary
 * Get overall test summary from last runs
 */
router.get('/summary/all', (req, res) => {
  const results = [];
  
  for (const [testId, testFile] of Object.entries(TEST_FILES)) {
    const result = testResults.get(testId);
    if (result) {
      results.push({ testId, testFile, ...result });
    } else {
      results.push({
        testId,
        testFile,
        status: 'not_run'
      });
    }
  }
  
  const ranTests = results.filter(r => r.status !== 'not_run');
  
  const summary = {
    totalSuites: results.length,
    ranSuites: ranTests.length,
    passedSuites: ranTests.filter(r => r.success).length,
    failedSuites: ranTests.filter(r => !r.success && !r.skipped).length,
    skippedSuites: ranTests.filter(r => r.skipped).length,
    notRunSuites: results.filter(r => r.status === 'not_run').length,
    totalTests: ranTests.reduce((sum, r) => sum + (r.numTotalTests || 0), 0),
    passedTests: ranTests.reduce((sum, r) => sum + (r.numPassedTests || 0), 0),
    failedTests: ranTests.reduce((sum, r) => sum + (r.numFailedTests || 0), 0),
    lastUpdate: ranTests.length > 0 
      ? ranTests.reduce((latest, r) => r.timestamp > latest ? r.timestamp : latest, '')
      : null
  };
  
  res.json({ summary, results });
});

module.exports = router;
