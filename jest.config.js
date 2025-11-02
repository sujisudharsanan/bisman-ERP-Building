module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  verbose: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'my-backend/**/*.js',
    '!my-backend/tests/**',
    '!my-backend/node_modules/**'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/'
  ],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/my-backend/tests/setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/my-backend/$1'
  }
};
