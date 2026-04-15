'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Icon } from '@iconify/react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

const TOAST_CONFIG: Record<ToastType, { icon: string; bg: string; text: string; border: string }> = {
  success: { icon: 'mdi:check-circle', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  error: { icon: 'mdi:alert-circle', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  info: { icon: 'mdi:information', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  warning: { icon: 'mdi:alert', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map(toast => {
          const config = TOAST_CONFIG[toast.type];
          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg ${config.bg} ${config.border} animate-in slide-in-from-right`}
              style={{ animation: 'slideIn 0.3s ease-out' }}
            >
              <Icon icon={config.icon} className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.text}`} />
              <p className={`text-sm font-medium flex-1 ${config.text}`}>{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className={`${config.text} opacity-60 hover:opacity-100 transition-opacity flex-shrink-0`}
              >
                <Icon icon="mdi:close" className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
