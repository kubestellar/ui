import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoginForm from './LoginForm';

interface KubeStellarLayoutProps {
  isLoaded: boolean;
  showLogin: boolean;
  leftSide: ReactNode;
}

const KubeStellarLayout = ({ isLoaded, showLogin, leftSide }: KubeStellarLayoutProps) => {
  return (
    <>
      {/* Left Side - 3D Visualization */}
      <div className="w-full md:w-[70%] h-[40vh] md:h-screen relative">
        {leftSide}
        
        {/* Logo and Tagline Overlay - Updated to use local image */}
        <div className="absolute top-6 left-6 flex flex-col items-start gap-3 z-10">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: isLoaded ? 0.2 : 1.2 }}
          >
            <img 
              src="/KubeStellar.png" 
              alt="KubeStellar" 
              className="h-14 md:h-16"
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: isLoaded ? 0.6 : 1.6, duration: 0.8 }}
            className="max-w-md mt-1"
          >
            <motion.p 
              className="text-lg md:text-xl text-blue-200 font-light leading-relaxed"
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
                Seamless Multi-Cluster Management,
              </motion.span>
              <br />
              <motion.span
                className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-medium"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: isLoaded ? 1.6 : 2.6, duration: 0.6 }}
              >
                Built for the Future.
              </motion.span>
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full md:w-[30%] min-h-[60vh] md:h-screen flex items-center justify-center p-4 md:p-8 relative">
        {/* Enhanced background with more depth */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Base gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 via-purple-900/5 to-blue-900/10" />
          <div className="absolute inset-0 bg-[#050a15]/80" />
          
          {/* Improved decorative elements with consistent blur */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px] opacity-50" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] opacity-50" />
          <div className="absolute bottom-40 right-20 w-48 h-48 bg-cyan-500/5 rounded-full blur-[100px] opacity-50" />
        </div>
        
        {/* Content container with better positioning */}
        <div className="relative z-10 w-full max-w-md mx-auto">
          {/* Company branding for mobile view (only visible on mobile) */}
          <div className="flex justify-center mb-10 md:hidden">
            <img 
              src="/KubeStellar.png" 
              alt="KubeStellar" 
              className="h-12"
            />
          </div>
          
          {/* Improved Welcome Back Message */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: showLogin ? 1 : 0, y: showLogin ? 0 : -10 }}
            transition={{ duration: 0.6 }}
            className="mb-8 text-center"
          >
            <h1 className="text-3xl font-bold text-white">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-100">Welcome Back</span>
            </h1>
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: "120px" }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto mt-2"
            />
          </motion.div>
          
          {/* Animated login form entrance with improved styling */}
          <AnimatePresence>
            {showLogin && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full backdrop-blur-sm bg-gradient-to-br from-white/5 to-white/[0.02] p-6 md:p-8 rounded-2xl border border-white/10 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden"
              >
                {/* Decorative elements inside the form */}
                <div className="absolute -top-24 -right-24 w-40 h-40 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-32 -left-20 w-60 h-60 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
                
                {/* KubeStellar logo centered above form */}
                <div className="mb-6 text-center relative">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                    className="inline-block bg-gradient-to-b from-blue-400 to-blue-600 p-3 rounded-2xl shadow-lg mb-2"
                  >
                    <img 
                      src="/favicon.ico"
                      alt="KubeStellar Icon" 
                      className="h-8 w-8"
                    />
                  </motion.div>
                  
                  {/* Improved account text */}
                  <div className="relative">
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-xl font-medium"
                    >
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-300">
                        Access Your Dashboard
                      </span>
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-sm text-blue-300/60 mt-1"
                    >
                      Enter your credentials below
                    </motion.p>
                  </div>
                </div>
                
                {/* Login form with slightly enhanced container */}
                <div className="relative z-10 bg-white/[0.02] p-5 rounded-xl border border-white/5">
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
            <p>Need help? <a href="https://kubernetes.slack.com/archives/C058SUSL5AA" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">Contact Support</a></p>
          </motion.div>
        </div>
        
        {/* Footer with version info */}
        <div className="absolute bottom-4 right-4 text-xs text-blue-300/40">
          v1.0.0
        </div>
      </div>
    </>
  );
};

export default KubeStellarLayout; 