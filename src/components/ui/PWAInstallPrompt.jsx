import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white p-4 rounded-xl shadow-2xl z-[9999] border border-blue-100 flex items-center justify-between">
      <div>
        <h4 className="font-bold text-gray-900">Install ExamGuard</h4>
        <p className="text-xs text-gray-500">Get the best experience by installing the app.</p>
      </div>
      <button 
        onClick={handleInstall}
        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"
      >
        <Download className="w-5 h-5" />
      </button>
    </div>
  );
};

export default PWAInstallPrompt;
