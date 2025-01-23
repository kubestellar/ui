import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import App from '../../src/App'
import { Link } from 'react-router-dom'

jest.mock('../../src/components/Navbar', () => {
  return function MockNavbar() {
    return (
      <nav data-testid="navbar">
        <Link to="/" data-testid="home-link">Clusters</Link>
        <Link to="/its" data-testid="its-link">ITS</Link>
        <Link to="/wds" data-testid="wds-link">WDS</Link>
      </nav>
    )
  }
})

jest.mock('../../src/components/Clusters', () => {
  return function MockClusters() {
    return <div data-testid="clusters-page">Clusters Page</div>
  }
})

jest.mock('../../src/pages/ITS', () => {
  return function MockITS() {
    return <div data-testid="its-page">ITS Page</div>
  }
})

jest.mock('../../src/pages/WDS', () => {
  return function MockWDS() {
    return <div data-testid="wds-page">WDS Page</div>
  }
})

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom')
  return {
    ...original,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

let warnMock: jest.SpyInstance;

beforeAll(() => {
  warnMock = jest.spyOn(console, 'warn').mockImplementation((message) => {
    if (!message.includes('React Router Future Flag Warning')) {
      console.warn(message)
    }
  })
})

afterAll(() => {
  warnMock.mockRestore() // Restore the original console.warn method
})

describe('App Component', () => {
  test('renders the Navbar and default page', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('clusters-page')).toBeInTheDocument()
  })

  test('navigates to ITS page when ITS link is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByTestId('its-link'))

    await waitFor(() => {
      expect(screen.getByTestId('its-page')).toBeInTheDocument()
    })
  })

  test('navigates to WDS page when WDS link is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByTestId('wds-link'))

    await waitFor(() => {
      expect(screen.getByTestId('wds-page')).toBeInTheDocument()
    })
  })

  test('renders the correct page for different routes', () => {
    const routes = [
      { path: '/', testId: 'clusters-page' },
      { path: '/its', testId: 'its-page' },
      { path: '/wds', testId: 'wds-page' },
    ]

    routes.forEach((route) => {
      const { unmount } = render(
        <MemoryRouter initialEntries={[route.path]}>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByTestId(route.testId)).toBeInTheDocument()
      unmount()
    })
  })
})
