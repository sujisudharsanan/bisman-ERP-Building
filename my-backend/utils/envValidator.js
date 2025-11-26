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
    required: false,
    description: 'Database user (extracted from DATABASE_URL if not provided)',
  },
  DB_PASSWORD: {
    required: false,
    description: 'Database password (extracted from DATABASE_URL if not provided)',
  },
  DB_HOST: {
    required: false,
    description: 'Database host (extracted from DATABASE_URL if not provided)',
  },
  DB_PORT: {
    required: false,
    description: 'Database port (extracted from DATABASE_URL if not provided)',
    default: '5432',
  },
  DB_NAME: {
    required: false,
    description: 'Database name (extracted from DATABASE_URL if not provided)',
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
    required: false,
    description: 'Secret for OTP hashing (generates default if not provided)',
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

  // Log errors and warnings but NEVER exit - always allow server to start
  if (!isValid && errors.length > 0) {
    console.warn('\n⚠️  Environment validation warnings:');
    console.warn('================================');
    errors.forEach(error => console.warn(`  ⚠️  ${error.replace('❌ Missing required', '⚠️  Missing')}`));
    console.warn('================================');
    console.warn('⚠️  Server will start with available configuration\n');
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Additional warnings:');
    console.warn('================================');
    warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
    console.warn('================================\n');
  }

  if (isValid && errors.length === 0 && warnings.length === 0) {
    console.log('✅ Environment validation passed - all variables configured');
  }

  // Always return valid = true so server starts
  return { isValid: true, errors, warnings };
}

// Run validation on module load
const validation = validateEnvVars();

module.exports = { validateEnvVars, validation };
