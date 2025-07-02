import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiUserCircle } from 'react-icons/hi2';
import { FiLogOut, FiHelpCircle, FiExternalLink } from 'react-icons/fi';
import { useAuth, useAuthActions } from '../hooks/useAuth';
import { api } from '../lib/api';
import useTheme from '../stores/themeStore';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import CloseIcon from '@mui/icons-material/Close';
import { createPortal } from 'react-dom';

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

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

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

  const openRaiseIssue = () => {
    window.open('https://github.com/kubestellar/ui/issues', '_blank', 'noopener,noreferrer');
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
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setFormError(t('profileSection.passwordRequired'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setFormError(t('profileSection.passwordsDoNotMatch'));
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('jwtToken');
      await api.put(
        '/api/me/password',
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success(t('profileSection.passwordChangedSuccess'));
      setShowChangePasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const err = error as { response?: { data?: { error?: string } } };
        setFormError(err.response?.data?.error || t('profileSection.passwordChangedError'));
      } else {
        setFormError(t('profileSection.passwordChangedError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to render modal via portal
  const renderChangePasswordModal = () => {
    if (!showChangePasswordModal) return null;
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-2">
        <div
          className="relative flex w-full max-w-lg flex-col"
          style={{
            background: '#232f3e',
            backgroundColor: '#232f3e',
            borderRadius: '18px',
            boxShadow: '0 8px 32px 0 rgba(0,0,0,0.65)',
            border: '1.5px solid #2d3748',
            minWidth: 0,
            width: '100%',
            maxWidth: 480,
            padding: 0,
          }}
        >
          {/* Close Icon */}
          <button
            type="button"
            aria-label="Close change password dialog"
            className="absolute right-5 top-5 z-10 rounded-full p-1 text-gray-400 transition-colors hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={() => {
              setShowChangePasswordModal(false);
              setCurrentPassword('');
              setNewPassword('');
              setConfirmNewPassword('');
              setFormError('');
            }}
          >
            <CloseIcon fontSize="medium" />
          </button>
          <div style={{ padding: '2.5rem 2.5rem 2rem 2.5rem', width: '100%' }}>
            <h2
              style={{
                color: '#fff',
                fontWeight: 700,
                fontSize: 24,
                marginBottom: '0.5rem',
                textAlign: 'left',
                letterSpacing: '-0.5px',
              }}
            >
              {t('profileSection.changePassword')}
            </h2>
            <div
              style={{ color: '#cbd5e1', fontSize: 16, marginBottom: '2rem', textAlign: 'left' }}
            >
              {t('profileSection.changePasswordSubtitle')}
            </div>
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '1.2rem' }}>
                <label
                  className="mb-2 block text-sm font-semibold"
                  htmlFor="current-password"
                  style={{ color: '#fff', fontSize: 15 }}
                >
                  {t('profileSection.currentPassword')}
                </label>
                <div className="relative">
                  <input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    style={{
                      width: '100%',
                      borderRadius: 10,
                      background: '#2d3748',
                      color: '#fff',
                      fontSize: 16,
                      padding: '1rem',
                      border: 'none',
                      outline: 'none',
                      marginBottom: 0,
                    }}
                    placeholder={t('profileSection.currentPassword')}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    aria-label={t('profileSection.currentPassword')}
                  />
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label={
                      showCurrentPassword
                        ? t('login.form.hidePassword')
                        : t('login.form.showPassword')
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none"
                    onClick={() => setShowCurrentPassword(v => !v)}
                    style={{ background: 'none', border: 'none', padding: 0, margin: 0 }}
                  >
                    {showCurrentPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: '1.2rem' }}>
                <label
                  className="mb-2 block text-sm font-semibold"
                  htmlFor="new-password"
                  style={{ color: '#fff', fontSize: 15 }}
                >
                  {t('profileSection.newPassword')}
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    style={{
                      width: '100%',
                      borderRadius: 10,
                      background: '#2d3748',
                      color: '#fff',
                      fontSize: 16,
                      padding: '1rem',
                      border: 'none',
                      outline: 'none',
                      marginBottom: 0,
                    }}
                    placeholder={t('profileSection.newPassword')}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    aria-label={t('profileSection.newPassword')}
                  />
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label={
                      showNewPassword ? t('login.form.hidePassword') : t('login.form.showPassword')
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none"
                    onClick={() => setShowNewPassword(v => !v)}
                    style={{ background: 'none', border: 'none', padding: 0, margin: 0 }}
                  >
                    {showNewPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: '1.2rem' }}>
                <label
                  className="mb-2 block text-sm font-semibold"
                  htmlFor="confirm-new-password"
                  style={{ color: '#fff', fontSize: 15 }}
                >
                  {t('profileSection.confirmNewPassword')}
                </label>
                <div className="relative">
                  <input
                    id="confirm-new-password"
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    style={{
                      width: '100%',
                      borderRadius: 10,
                      background: '#2d3748',
                      color: '#fff',
                      fontSize: 16,
                      padding: '1rem',
                      border: 'none',
                      outline: 'none',
                      marginBottom: 0,
                    }}
                    placeholder={t('profileSection.confirmNewPassword')}
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    aria-label={t('profileSection.confirmNewPassword')}
                  />
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label={
                      showConfirmNewPassword
                        ? t('login.form.hidePassword')
                        : t('login.form.showPassword')
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none"
                    onClick={() => setShowConfirmNewPassword(v => !v)}
                    style={{ background: 'none', border: 'none', padding: 0, margin: 0 }}
                  >
                    {showConfirmNewPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>
              {formError && (
                <div
                  style={{
                    background: '#2d2323',
                    color: '#e57373',
                    borderRadius: 8,
                    fontSize: 16,
                    padding: '0.7rem 1rem',
                    marginBottom: '1.5rem',
                    textAlign: 'left',
                    fontWeight: 500,
                  }}
                >
                  {formError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2.2rem' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 8,
                    background: '#374151',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 16,
                    border: 'none',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = '#27303f')}
                  onMouseOut={e => (e.currentTarget.style.background = '#374151')}
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setFormError('');
                  }}
                  disabled={isSubmitting}
                >
                  {t('profileSection.cancel')}
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 8,
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 16,
                    border: 'none',
                    transition: 'background 0.2s',
                    boxShadow: '0 2px 8px 0 rgba(37,99,235,0.10)',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = '#1d4ed8')}
                  onMouseOut={e => (e.currentTarget.style.background = '#2563eb')}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('common.loading') : t('profileSection.changePasswordButton')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>,
      document.body
    );
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
        className="\ hover:bg-primary/10\ btn btn-circle border-2 border-primary/30 bg-primary/5
          shadow-sm transition-all duration-300 hover:scale-105
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
          className="animate-in fade-in slide-in-from-top-5 \ absolute right-0 top-full z-50 mt-2
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
                  {t('profileSection.account')}
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
                onClick={() => setShowChangePasswordModal(true)}
                className="py-3\ group flex w-full items-center rounded-lg px-4
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
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#e0e7ff',
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm6-7V7a6 6 0 1 0-12 0v3m12 0H6m12 0v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8" />
                    </svg>
                  </div>
                  <span>{t('profileSection.changePassword')}</span>
                </div>
              </button>
              <button
                onClick={openRaiseIssue}
                className="py-3\ group flex w-full items-center rounded-lg px-4
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
                    <FiExternalLink
                      style={{
                        color: isDark ? '#38bdf8' : '#2563eb',
                      }}
                      size={16}
                    />
                  </div>
                  <span>{t('profileSection.raiseIssue')}</span>
                </div>
              </button>
              <button
                onClick={openDocs}
                className="py-3\ group flex w-full items-center rounded-lg px-4
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
              className="py-3\ group flex w-full items-center rounded-lg px-4
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
      {/* Change Password Modal */}
      {renderChangePasswordModal()}
    </div>
  );
};

export default ProfileSection;
