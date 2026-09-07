/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/algorithm/**/*.test.ts',
        '<rootDir>/src/domain/**/*.test.ts',
        '<rootDir>/src/lib/**/*.test.ts',
      ],
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/server/**/*.test.ts',
        '<rootDir>/src/routes/**/*.test.ts',
        '<rootDir>/src/services/**/*.test.ts',
        '<rootDir>/src/worker/**/*.test.ts',
        '<rootDir>/src/cli/**/*.test.ts',
      ],
      globalSetup: '<rootDir>/src/test/global-setup.ts',
      setupFiles: ['<rootDir>/src/test/env-setup.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
      maxWorkers: 1,
      clearMocks: true,
    },
  ],
  clearMocks: true,
  coverageDirectory: '<rootDir>/coverage',
};
