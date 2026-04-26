import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, WifiOff, CloudOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const APP_VERSION = "1.0.0";

const PWAUpdater = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log(`[PWA] Service Worker registered. App Version: ${APP_VERSION}`);
    },
    onRegisterError(error) {
      console.error('[PWA] Service Worker registration error:', error);
    },
  });

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {/* Update Available Modal */}
      <AnimatePresence>
        {needRefresh && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 md:translate-x-0 md:left-6 md:bottom-6 bg-white border border-blue-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl p-5 z-[10000] w-[90%] md:w-80"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-2 rounded-full">
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin-slow" />
                </div>
                <h4 className="font-bold text-gray-900 text-lg">Update Available</h4>
              </div>
              <button 
                onClick={() => setNeedRefresh(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              A new version of ExamGuard is ready. Refresh to update to the latest features.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => updateServiceWorker(true)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex justify-center items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Reload
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 z-[10000] flex items-center justify-center gap-3 shadow-lg"
          >
            <WifiOff className="w-5 h-5 animate-pulse" />
            <span className="font-bold">You're offline. Please check your connection.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version Badge */}
      <div className="fixed bottom-4 right-4 bg-slate-900/80 backdrop-blur-md text-slate-300 text-[10px] font-mono px-2 py-1 rounded-md z-[9998] pointer-events-none border border-slate-700/50">
        v{APP_VERSION}
      </div>
    </>
  );
};

export default PWAUpdater;
