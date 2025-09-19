import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create an MSW server with all handlers
export const server = setupServer(...handlers);
