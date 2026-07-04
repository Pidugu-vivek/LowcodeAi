/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/test/jest.setup.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  clearMocks: true,
};
