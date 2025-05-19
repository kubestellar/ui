import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  isLoaded: boolean;
}

const LoadingScreen = ({ isLoaded }: LoadingScreenProps) => {
  return (
    <AnimatePresence>
      {!isLoaded && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#050a15]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <img src="/KubeStellar.png" alt="KubeStellar" className="mb-8 h-24" />
            <div className="h-1.5 w-64 overflow-hidden rounded-full bg-blue-900/30">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-400"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.2 }}
              />
            </div>
            <motion.p
              className="mt-4 text-sm text-blue-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Initializing KubeStellar Environment...
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingScreen;
