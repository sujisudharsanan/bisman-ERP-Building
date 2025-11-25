/**
 * Environment Variable Validator
 * Ensures all required environment variables are set for production
 */

interface RequiredEnvVars {
  [key: string]: {
    required: boolean;
    description: string;
    default?: string;
  };
}

const requiredEnvVars: RequiredEnvVars = {
  NODE_ENV: {
    required: true,
    description: 'Application environment (development, production)',
  },
  NEXT_PUBLIC_API_URL: {
    required: true,
    description: 'Backend API URL',
  },
  AI_BASE_URL: {
    required: false,
    description: 'AI service base URL',
  },
  NEXT_PUBLIC_TAWK_ENABLED: {
    required: false,
    description: 'Enable Tawk chat widget',
    default: 'false',
  },
  NEXT_PUBLIC_TAWK_PROPERTY_ID: {
    required: false,
    description: 'Tawk property ID',
  },
  NEXT_PUBLIC_TAWK_WIDGET_ID: {
    required: false,
    description: 'Tawk widget ID',
  },
};

export function validateEnvVars(): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  Object.entries(requiredEnvVars).forEach(([key, config]) => {
    const value = process.env[key];

    if (config.required && !value) {
      errors.push(`Missing required environment variable: ${key} - ${config.description}`);
    } else if (!config.required && !value && config.default) {
      warnings.push(`Using default for ${key}: ${config.default}`);
    } else if (!config.required && !value) {
      warnings.push(`Optional environment variable not set: ${key} - ${config.description}`);
    }
  });

  const isValid = errors.length === 0;

  if (!isValid && process.env.NODE_ENV === 'production') {
    console.error('❌ Environment validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }

  if (warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  Environment warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  return { isValid, errors, warnings };
}

// Run validation on import in production
if (process.env.NODE_ENV === 'production') {
  validateEnvVars();
}
