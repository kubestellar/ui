import { ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoginForm from './LoginForm';
import Footer from '../Footer';

interface KubeStellarLayoutProps {
  isLoaded: boolean;
  showLogin: boolean;
  leftSide: ReactNode;
}

const KubeStellarLayout = ({ isLoaded, showLogin, leftSide }: KubeStellarLayoutProps) => {
  const commitHash = import.meta.env.VITE_GIT_COMMIT_HASH || 'development';
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Check if browser is in full screen mode
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  // Toggle full screen function
  const toggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        // Enter full screen
        await document.documentElement.requestFullscreen();
      } else {
        // Exit full screen
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  // Add keyboard shortcut for full screen (F11)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullScreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Left Side - 3D Visualization */}
      <div className="relative h-[40vh] w-full md:h-screen md:w-[70%]">
        {leftSide}

        {/* Logo and Tagline Overlay - Updated to use local image */}
        <div className="absolute left-6 top-6 z-10 flex flex-col items-start gap-3">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: isLoaded ? 0.2 : 1.2 }}
            className="flex items-center gap-4"
          >
            <img src="/KubeStellar.png" alt="KubeStellar" className="h-14 md:h-16" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: isLoaded ? 0.6 : 1.6, duration: 0.8 }}
            className="mt-1 max-w-md"
          >
            <motion.p
              className="text-lg font-light leading-relaxed text-blue-200 md:text-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: isLoaded ? 1.0 : 2.0, duration: 0.6 }}
            >
              <motion.span
                className="inline-block"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: isLoaded ? 1.2 : 2.2, duration: 0.6 }}
              >
                Seamless Multi-Cluster Management
              </motion.span>
              <br />
              <motion.span
                className="inline-block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text font-medium text-transparent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: isLoaded ? 1.6 : 2.6, duration: 0.6 }}
              >
                Built for the Future.
              </motion.span>
            </motion.p>
          </motion.div>
        </div>

        {/* Full Screen Toggle Button - Repositioned to top-right corner */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: isLoaded ? 0.4 : 1.4 }}
          onClick={() => toggleFullScreen()}
          className="absolute right-6 top-6 z-10 flex items-center justify-center rounded-full bg-blue-900/30 p-2 text-blue-300 transition-colors duration-200 hover:bg-blue-800/40"
          aria-label="Toggle full screen"
          title="Toggle full screen"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isFullScreen ? (
              <>
                <path d="M8 3v3a2 2 0 0 1-2 2H3"></path>
                <path d="M21 8h-3a2 2 0 0 1-2-2V3"></path>
                <path d="M3 16h3a2 2 0 0 1 2 2v3"></path>
                <path d="M16 21v-3a2 2 0 0 1 2-2h3"></path>
              </>
            ) : (
              <>
                <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
                <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
                <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
              </>
            )}
          </svg>
        </motion.button>
      </div>

      {/* Right Side - Login Form */}
      <div className="relative flex min-h-[60vh] w-full items-center justify-center p-4 md:h-screen md:w-[30%] md:p-8">
        {/* Enhanced background with more depth */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Base gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 via-purple-900/5 to-blue-900/10" />
          <div className="absolute inset-0 bg-[#050a15]/80" />

          {/* Improved decorative elements with consistent blur */}
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-blue-500/10 opacity-50 blur-[100px]" />
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-purple-500/10 opacity-50 blur-[100px]" />
          <div className="absolute bottom-40 right-20 h-48 w-48 rounded-full bg-cyan-500/5 opacity-50 blur-[100px]" />
        </div>

        {/* Content container with better positioning */}
        <div className="relative z-10 mx-auto w-full max-w-md">
          {/* Company branding for mobile view (only visible on mobile) */}
          <div className="mb-10 flex justify-center md:hidden">
            <img src="/KubeStellar.png" alt="KubeStellar" className="h-12" />
          </div>

          {/* Improved Welcome Back Message */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: showLogin ? 1 : 0, y: showLogin ? 0 : -10 }}
            transition={{ duration: 0.6 }}
            className="mb-8 text-center"
          >
            <h1 className="text-3xl font-bold text-white">
              <span className="bg-gradient-to-r from-blue-300 to-blue-100 bg-clip-text text-transparent">
                Welcome Back
              </span>
            </h1>
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '120px' }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mx-auto mt-2 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600"
            />
          </motion.div>

          {/* Animated login form entrance with improved styling */}
          <AnimatePresence>
            {showLogin && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.3)] backdrop-blur-sm md:p-8"
              >
                {/* Decorative elements inside the form */}
                <div className="pointer-events-none absolute -right-24 -top-24 h-40 w-40 rounded-full bg-blue-500/5 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-32 -left-20 h-60 w-60 rounded-full bg-purple-500/5 blur-2xl" />

                {/* KubeStellar logo centered above form */}
                <div className="relative mb-6 text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
                    className="mb-2 inline-block rounded-2xl bg-gradient-to-b from-blue-400 to-blue-600 p-3 shadow-lg"
                  >
                    <img src="/favicon.ico" alt="KubeStellar Icon" className="h-8 w-8" />
                  </motion.div>

                  {/* Improved account text */}
                  <div className="relative">
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-xl font-medium"
                    >
                      <span className="bg-gradient-to-r from-blue-200 to-purple-300 bg-clip-text text-transparent">
                        Access Your Dashboard
                      </span>
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mt-1 text-sm text-blue-300/60"
                    >
                      Enter your credentials below
                    </motion.p>
                  </div>
                </div>

                {/* Login form with slightly enhanced container */}
                <div className="relative z-10 rounded-xl border border-white/5 bg-white/[0.02] p-5">
                  <LoginForm />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Support link with Slack URL */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showLogin ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-6 text-center text-sm text-blue-200/60"
          >
            <p>
              Need help?{' '}
              <a
                href="https://kubernetes.slack.com/archives/C058SUSL5AA"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 transition-colors hover:text-blue-300"
              >
                Contact Support
              </a>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Add the Footer component */}
      <Footer commitHash={commitHash} />
    </>
  );
};

export default KubeStellarLayout;
