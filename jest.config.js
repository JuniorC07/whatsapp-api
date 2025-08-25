export default {
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json'],
  verbose: true,
  injectGlobals: false,
  setupFiles: ['dotenv/config'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.js',
    '!<rootDir>/src/**/errors/**',
    '!<rootDir>/src/**/test/**',
    '!<rootDir>/src/**/config/**',
    '!<rootDir>/src/**/models/**',
    '!<rootDir>/src/**/routes/**',
    '!<rootDir>/src/app.js',
  ],
  testMatch: ['**/*.test.js'],
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
    '@test/(.+)': '<rootDir>/test/$1',
  },
}
