import { server } from './mocks/server';

async function globalTeardown() {
  server.close();
  console.log('🛑 MSW Node server stopped');
}

export default globalTeardown;
