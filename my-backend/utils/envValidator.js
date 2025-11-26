/**
 * Environment Variable Validator for Backend
 * Ensures all required environment variables are set for production
 */

const requiredEnvVars = {
  NODE_ENV: {
    required: true,
    description: 'Application environment (development, production)',
  },
  PORT: {
    required: true,
    description: 'Server port',
    default: '3000',
  },
  DATABASE_URL: {
    required: true,
    description: 'PostgreSQL database connection URL',
  },
  DB_USER: {
    required: true,
    description: 'Database user',
  },
  DB_PASSWORD: {
    required: true,
    description: 'Database password',
  },
  DB_HOST: {
    required: true,
    description: 'Database host',
  },
  DB_PORT: {
    required: true,
    description: 'Database port',
    default: '5432',
  },
  DB_NAME: {
    required: true,
    description: 'Database name',
  },
  JWT_SECRET: {
    required: true,
    description: 'JWT signing secret (min 32 characters)',
    validate: (value) => {
      if (value && value.length < 32) {
        return 'JWT_SECRET must be at least 32 characters';
      }
      return null;
    },
  },
  FRONTEND_URL: {
    required: true,
    description: 'Frontend URL for CORS',
  },
  FRONTEND_URLS: {
    required: false,
    description: 'Multiple frontend URLs for CORS (comma-separated)',
  },
  OTP_HASH_SECRET: {
    required: true,
    description: 'Secret for OTP hashing',
  },
  DISABLE_RATE_LIMIT: {
    required: false,
    description: 'Disable rate limiting (should be false in production)',
    default: 'false',
  },
  REDIS_URL: {
    required: false,
    description: 'Redis URL for rate limiting and caching',
  },
};

function validateEnvVars() {
  const errors = [];
  const warnings = [];

  Object.entries(requiredEnvVars).forEach(([key, config]) => {
    const value = process.env[key];

    if (config.required && !value) {
      errors.push(`Missing required environment variable: ${key} - ${config.description}`);
    } else if (value && config.validate) {
      const validationError = config.validate(value);
      if (validationError) {
        errors.push(`${key}: ${validationError}`);
      }
    } else if (!config.required && !value && config.default) {
      process.env[key] = config.default;
      warnings.push(`Using default for ${key}: ${config.default}`);
    } else if (!config.required && !value) {
      warnings.push(`Optional environment variable not set: ${key} - ${config.description}`);
    }
  });

  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      warnings.push('⚠️  Rate limiting is DISABLED in production - this is not recommended!');
    }

    if (!process.env.REDIS_URL) {
      warnings.push('⚠️  REDIS_URL not set - rate limiting will use in-memory store (not suitable for multi-instance deployments)');
    }

    if (process.env.JWT_SECRET === 'your-secret-key-here' || process.env.JWT_SECRET === 'changeme') {
      errors.push('JWT_SECRET is set to default value - generate a secure random string!');
    }
  }

  const isValid = errors.length === 0;

  if (!isValid) {
    console.error('\n❌ Environment validation failed:');
    console.error('================================');
    errors.forEach(error => console.error(`  ❌ ${error}`));
    console.error('================================\n');
    
    // Only exit in production if critical DATABASE_URL or JWT_SECRET is missing
    if (process.env.NODE_ENV === 'production') {
      const criticalErrors = errors.filter(err => 
        err.includes('DATABASE_URL') || err.includes('JWT_SECRET')
      );
      
      if (criticalErrors.length > 0) {
        console.error('Cannot start server - critical environment variables missing.');
        console.error('Server will attempt to start but may be unstable.');
        // Don't exit - let Railway see the logs and health endpoint
      } else {
        console.warn('⚠️  Non-critical environment variables missing - server will start with degraded functionality.');
      }
    }
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment warnings:');
    console.warn('================================');
    warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
    console.warn('================================\n');
  }

  if (isValid && errors.length === 0 && warnings.length === 0) {
    console.log('✅ Environment validation passed');
  }

  return { isValid, errors, warnings };
}

// Run validation on module load
const validation = validateEnvVars();

module.exports = { validateEnvVars, validation };
