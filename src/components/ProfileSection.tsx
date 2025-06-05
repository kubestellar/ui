import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiUserCircle } from 'react-icons/hi2';
import { FiLogOut, FiHelpCircle } from 'react-icons/fi';
import { useAuth, useAuthActions } from '../hooks/useAuth';
import { api } from '../lib/api';
import useTheme from '../stores/themeStore';
import { useTranslation } from 'react-i18next';

// Array of profile icon components to randomly select from
const profileIcons = [
  HiUserCircle,
  // Add more icon components if desired
];

const ProfileSection = () => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: authData } = useAuth();
  const { logout } = useAuthActions();

  // Randomly select a profile icon
  const [ProfileIcon] = useState(() => {
    const randomIndex = Math.floor(Math.random() * profileIcons.length);
    return profileIcons[randomIndex];
  });

  // Fetch user data
  useEffect(() => {
    if (authData?.isAuthenticated) {
      const token = localStorage.getItem('jwtToken');
      if (token) {
        api
          .get('/api/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          .then(response => {
            setUsername(response.data.username);
          })
          .catch(error => {
            console.error('Error fetching user data:', error);
          });
      }
    }
  }, [authData?.isAuthenticated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        buttonRef.current &&
        !userMenuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuRef, buttonRef]);

  // Close on escape key press
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const openDocs = () => {
    window.open('https://docs.kubestellar.io/release-0.27.2/', '_blank', 'noopener,noreferrer');
    setShowUserMenu(false);
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);

    navigate('/login', {
      state: {
        infoMessage: t('profileSection.logoutMessage'),
      },
    });
  };

  if (!authData?.isAuthenticated) return null;

  // Define styles based on theme
  const styles = {
    profileMenu: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      color: isDark ? '#f3f4f6' : '#1f2937',
      borderColor: isDark ? '#374151' : '#e5e7eb',
      boxShadow: isDark
        ? '0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -2px rgba(0, 0, 0, 0.4)'
        : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
    profileHeader: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
      background: isDark
        ? 'linear-gradient(to right, rgba(59, 130, 246, 0.1), transparent)'
        : 'linear-gradient(to right, rgba(59, 130, 246, 0.05), transparent)',
    },
    menuSection: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
    },
    helpButton: {
      color: isDark ? '#f3f4f6' : '#374151',
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      '&:hover': {
        backgroundColor: isDark ? 'rgba(124, 58, 237, 0.1)' : '#f5f3ff',
      },
    },
    logoutButton: {
      color: isDark ? '#f3f4f6' : '#374151',
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      '&:hover': {
        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fee2e2',
      },
    },
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="btn btn-circle border-2 border-primary/30 bg-primary/5 shadow-sm 
          transition-all duration-300 hover:scale-105 hover:bg-primary/10
          hover:shadow-md active:scale-95"
        aria-label="Open user menu"
        aria-expanded={showUserMenu}
        aria-haspopup="menu"
      >
        <ProfileIcon className="text-xl text-primary" />
      </button>

      {/* User dropdown menu */}
      {showUserMenu && (
        <div
          ref={userMenuRef}
          className="animate-in fade-in slide-in-from-top-5 absolute right-0 top-full z-50 mt-2 
            w-64 origin-top-right overflow-hidden rounded-xl duration-300 ease-out"
          style={{
            backgroundColor: styles.profileMenu.backgroundColor,
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: styles.profileMenu.borderColor,
            boxShadow: styles.profileMenu.boxShadow,
          }}
          role="menu"
          aria-orientation="vertical"
          tabIndex={-1}
        >
          {/* User Info Section */}
          <div
            style={{
              backgroundColor: styles.profileHeader.backgroundColor,
              borderBottomWidth: '1px',
              borderBottomStyle: 'solid',
              borderBottomColor: styles.profileHeader.borderBottomColor,
              background: styles.profileHeader.background,
            }}
            className="p-5"
          >
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div
                  className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full shadow-inner"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
                  }}
                >
                  <ProfileIcon
                    className="text-4xl"
                    style={{ color: '#3b82f6' }} // Primary blue color
                  />
                </div>
                <div
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{
                    color: isDark ? '#9ca3af' : '#6b7280',
                  }}
                >
                  Account
                </div>
                <div
                  className="mt-1 text-lg font-semibold"
                  style={{
                    color: isDark ? '#f9fafb' : '#1f2937',
                  }}
                >
                  {username || 'Admin'}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2" style={{ backgroundColor: styles.menuSection.backgroundColor }}>
            <div className="grid grid-cols-1 gap-1">
              <button
                onClick={openDocs}
                className="group flex w-full items-center rounded-lg px-4 py-3
                  text-sm font-medium transition-colors duration-150"
                style={{
                  color: styles.helpButton.color,
                  backgroundColor: styles.helpButton.backgroundColor,
                }}
                onMouseOver={e => {
                  e.currentTarget.style.backgroundColor = isDark
                    ? 'rgba(124, 58, 237, 0.1)'
                    : '#f5f3ff';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.backgroundColor = isDark ? '#1f2937' : '#ffffff';
                }}
                role="menuitem"
              >
                <div className="flex w-full items-center gap-3">
                  <div
                    className="rounded-full p-2 transition-colors duration-200"
                    style={{
                      backgroundColor: isDark ? 'rgba(124, 58, 237, 0.1)' : '#f5f3ff',
                    }}
                  >
                    <FiHelpCircle
                      style={{
                        color: isDark ? '#a78bfa' : '#8b5cf6',
                      }}
                      size={16}
                    />
                  </div>
                  <span>{t('profileSection.helpSupport')}</span>
                </div>
              </button>
            </div>
          </div>

          {/* Sign Out Button */}
          <div
            className="border-t p-2"
            style={{
              backgroundColor: styles.menuSection.backgroundColor,
              borderColor: isDark ? '#374151' : '#e5e7eb',
            }}
          >
            <button
              onClick={handleLogout}
              className="group flex w-full items-center rounded-lg px-4 py-3
                text-sm font-medium transition-all duration-200"
              style={{
                color: styles.logoutButton.color,
                backgroundColor: styles.logoutButton.backgroundColor,
              }}
              onMouseOver={e => {
                e.currentTarget.style.backgroundColor = isDark
                  ? 'rgba(239, 68, 68, 0.1)'
                  : '#fee2e2';
              }}
              onMouseOut={e => {
                e.currentTarget.style.backgroundColor = isDark ? '#1f2937' : '#ffffff';
              }}
              role="menuitem"
            >
              <div className="flex w-full items-center gap-3">
                <div
                  className="rounded-full p-2 transition-colors duration-200"
                  style={{
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fee2e2',
                  }}
                >
                  <FiLogOut
                    style={{
                      color: isDark ? '#f87171' : '#ef4444',
                    }}
                    size={16}
                  />
                </div>
                <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                  {t('profileSection.signOut')}
                </span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSection;
