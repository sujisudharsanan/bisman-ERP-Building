/**
 * Environment Variables Validation
 * This file validates all required environment variables at startup
 * Prevents runtime errors due to missing configuration
 */

interface RequiredEnvVars {
  [key: string]: {
    required: boolean;
    description: string;
    validate?: (value: string) => boolean;
  };
}

const envVars: RequiredEnvVars = {
  // Database
  DATABASE_URL: {
    required: true,
    description: 'PostgreSQL connection string',
    validate: (val) => val.startsWith('postgres://') || val.startsWith('postgresql://'),
  },

  // Authentication
  JWT_SECRET: {
    required: true,
    description: 'JWT signing secret (min 32 characters)',
    validate: (val) => val.length >= 32,
  },
  ACCESS_TOKEN_SECRET: {
    required: false,
    description: 'Access token secret (falls back to JWT_SECRET)',
  },
  REFRESH_TOKEN_SECRET: {
    required: false,
    description: 'Refresh token secret (falls back to JWT_REFRESH_SECRET)',
  },

  // Redis (for caching and rate limiting)
  REDIS_URL: {
    required: true,
    description: 'Redis connection string',
    validate: (val) => val.startsWith('redis://') || val.startsWith('rediss://'),
  },

  // Application URLs
  FRONTEND_URL: {
    required: true,
    description: 'Frontend application URL',
    validate: (val) => val.startsWith('http://') || val.startsWith('https://'),
  },
  BACKEND_URL: {
    required: false,
    description: 'Backend API URL (for documentation)',
  },

  // Encryption
  ENCRYPTION_KEY: {
    required: true,
    description: 'AES-256 encryption key (64 hex characters)',
    validate: (val) => val.length === 64 && /^[0-9a-f]+$/i.test(val),
  },

  // Environment
  NODE_ENV: {
    required: true,
    description: 'Environment (development, staging, production)',
    validate: (val) => ['development', 'staging', 'production'].includes(val),
  },

  // Port
  PORT: {
    required: false,
    description: 'Server port (default: 3001)',
  },
};

export function validateEnvironment(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('🔍 Validating environment variables...\n');

  // Check each environment variable
  Object.entries(envVars).forEach(([key, config]) => {
    const value = process.env[key];

    // Check if required variable is missing
    if (config.required && !value) {
      errors.push(`❌ Missing required variable: ${key}\n   Description: ${config.description}`);
      return;
    }

    // Skip validation if optional and not provided
    if (!config.required && !value) {
      warnings.push(`⚠️  Optional variable not set: ${key}\n   Description: ${config.description}`);
      return;
    }

    // Validate value if validator is provided
    if (value && config.validate && !config.validate(value)) {
      errors.push(`❌ Invalid value for ${key}\n   Description: ${config.description}\n   Current value: ${value.substring(0, 20)}...`);
      return;
    }

    // Success
    console.log(`✅ ${key}: Valid`);
  });

  console.log('\n');

  // Print warnings
  if (warnings.length > 0) {
    console.warn('Warnings:\n');
    warnings.forEach((warning) => console.warn(warning));
    console.warn('\n');
  }

  // Print errors and exit if any
  if (errors.length > 0) {
    console.error('❌ Environment validation failed!\n');
    errors.forEach((error) => console.error(error));
    console.error('\n');
    console.error('Please set all required environment variables and restart the application.');
    process.exit(1);
  }

  console.log('✅ All required environment variables are valid!\n');
}

// Additional environment helper functions
export function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
}

export function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isStaging(): boolean {
  return process.env.NODE_ENV === 'staging';
}
