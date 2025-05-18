import { Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { api } from '../lib/api';
import useTheme from '../stores/themeStore';

const Navbar = () => {
  const theme = useTheme(state => state.theme);
  const toggleTheme = useTheme(state => state.toggleTheme);

  const generateLog = async () => {
    try {
      const response = await api.get('/api/log', {
        responseType: 'blob',
      });

      // Create a Blob from the response data
      const blob = new Blob([response.data], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);

      // Create a link element
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'kubestellarui.log');

      // Append to the document and trigger click
      document.body.appendChild(link);
      link.click();

      // Clean up
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating log:', error);
      alert('Failed to generate log. Please try again.');
    }
  };

  return (
    <div className="navbar w-full bg-base-100 px-4 shadow-md">
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h8m-8 6h16"
              />
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="menu dropdown-content menu-sm z-[1] mt-3 w-52 rounded-box bg-base-100 p-2 shadow"
          >
            <li>
              <Link to="/its">ITS</Link>
            </li>
            <li>
              <Link to="/wds">WDS</Link>
            </li>
          </ul>
        </div>
        <Link to="/" className="btn btn-ghost text-xl">
          KubestellarUI
        </Link>
      </div>
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li>
            <Link to="/its">ITS</Link>
          </li>
          <li>
            <Link to="/wds">WDS</Link>
          </li>
        </ul>
      </div>
      <div className="navbar-end space-x-2">
        <button onClick={toggleTheme} className="btn btn-circle btn-ghost rounded p-2">
          {theme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
        </button>

        <button className="btn" onClick={generateLog}>
          Generate Log
        </button>
      </div>
    </div>
  );
};

export default Navbar;
