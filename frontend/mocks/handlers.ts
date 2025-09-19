import { rest } from 'msw';

export const handlers = [
  // Example: Mock installation endpoint
  rest.get('http://localhost:5173/api/install', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'Mocked install response 🚀' })
    );
  }),

  // Another example: Mock "clusters" API
  rest.get('http://localhost:5173/api/clusters', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([{ id: 1, name: 'kind' }, { id: 2, name: 'k3d' }])
    );
  }),
];
