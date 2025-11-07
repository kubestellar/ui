/**
 * Test constants
 * Centralized constants for e2e tests
 */

export const DEFAULT_CREDENTIALS = {
  username: 'admin',
  password: 'admin',
} as const;

export const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
