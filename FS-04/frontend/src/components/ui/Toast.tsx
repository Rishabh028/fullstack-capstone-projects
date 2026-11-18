import React from 'react';
import { Toaster, ToastBar } from 'react-hot-toast';

export const ToastProvider: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        className: 'text-sm font-medium shadow-lg rounded-xl border border-gray-100',
        style: {
          background: '#ffffff',
          color: '#111827',
          padding: '12px 16px',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#ffffff',
          },
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <div className="flex items-center space-x-2">
              {icon}
              <div className="text-sm font-medium">{message}</div>
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
};

export default ToastProvider;
