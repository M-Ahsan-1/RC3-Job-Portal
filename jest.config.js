// only look in tests/ so stray test files elsewhere (like the frontend) never get picked up
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.js'],
};
