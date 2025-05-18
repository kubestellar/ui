import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

const routesConfig = [
  {
    path: '/',
    element: <div>Home Page</div>,
  },
  {
    path: '/about',
    element: <div>About Page</div>,
  },
  {
    path: '*',
    element: <div>404 Not Found</div>,
  },
];

describe('App Component', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the home page by default', () => {
    const router = createMemoryRouter(routesConfig, {
      initialEntries: ['/'],
      future: {
        v7_relativeSplatPath: true,
      },
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('renders the about page when navigating to /about', () => {
    const router = createMemoryRouter(routesConfig, {
      initialEntries: ['/about'],
      future: {
        v7_relativeSplatPath: true,
      },
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByText('About Page')).toBeInTheDocument();
  });

  it('renders a 404 page for unknown routes', () => {
    const router = createMemoryRouter(routesConfig, {
      initialEntries: ['/unknown'],
      future: {
        v7_relativeSplatPath: true,
      },
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByText('404 Not Found')).toBeInTheDocument();
  });
});
