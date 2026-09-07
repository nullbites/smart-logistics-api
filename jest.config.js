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
  ],
  clearMocks: true,
  coverageDirectory: '<rootDir>/coverage',
};
