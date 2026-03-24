import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null, isConfirm: false });

  const showAlert = useCallback((message, type = 'info', title = 'Notification') => {
    setAlertState({ isOpen: true, message, type, title, isConfirm: false, onConfirm: null });
  }, []);

  const showConfirm = useCallback((message, title = 'Confirm Action') => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        message,
        title,
        type: 'warning',
        isConfirm: true,
        onConfirm: (result) => {
          setAlertState(prev => ({ ...prev, isOpen: false }));
          resolve(result);
        }
      });
    });
  }, []);

  const close = () => {
    if (alertState.isConfirm && alertState.onConfirm) {
      alertState.onConfirm(false);
    } else {
      setAlertState(prev => ({ ...prev, isOpen: false }));
    }
  };

  // Prevent background scrolling when modal is active
  useEffect(() => {
    if (alertState.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [alertState.isOpen]);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {alertState.isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  alertState.type === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                  alertState.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' :
                  alertState.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' :
                  'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30'
                }`}>
                  {alertState.type === 'error' ? <X size={20} /> :
                   alertState.type === 'success' ? <CheckCircle2 size={20} /> :
                   alertState.type === 'warning' ? <AlertCircle size={20} /> :
                   <Info size={20} />}
                </div>
                <div className="flex-1 pt-0.5">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{alertState.title}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{alertState.message}</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 flex justify-end gap-3">
              {alertState.isConfirm && (
                <button 
                  onClick={() => alertState.onConfirm(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              )}
              <button 
                onClick={() => alertState.isConfirm ? alertState.onConfirm(true) : close()}
                className={`px-6 py-2 text-sm font-bold text-white rounded-xl shadow-sm transition-all active:scale-[0.98] ${
                  alertState.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                  alertState.type === 'warning' && alertState.isConfirm ? 'bg-amber-600 hover:bg-amber-700' :
                  'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {alertState.isConfirm ? 'Confirm' : 'Okay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};
