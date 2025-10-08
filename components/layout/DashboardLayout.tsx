import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useApp } from '../../contexts/AppContext';
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';

// Notification component defined locally to display global messages
const Notification: React.FC<{ message: string; type: 'success' | 'error'; }> = ({ message, type }) => {
    const { hideNotification } = useApp();

    const isSuccess = type === 'success';
    const bgColor = isSuccess ? 'bg-teal-500' : 'bg-red-500';
    const Icon = isSuccess ? CheckCircleIcon : XCircleIcon;

    return (
        <div 
            className={`fixed top-5 left-1/2 -translate-x-1/2 min-w-[300px] z-[100] p-4 rounded-lg shadow-lg flex items-center text-white ${bgColor} animate-fade-in-down no-print`}
            role="alert"
            aria-live="assertive"
        >
            <div className="flex-shrink-0">
                <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="mx-3">
                <p className="font-medium">{message}</p>
            </div>
            <button 
                onClick={hideNotification} 
                className="ml-auto -mx-1.5 -my-1.5 bg-white bg-opacity-20 p-1.5 rounded-lg inline-flex h-8 w-8 text-white hover:bg-opacity-30 focus:ring-2 focus:ring-white"
                aria-label="إغلاق"
            >
                <span className="sr-only">إغلاق</span>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
        </div>
    );
};


const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notification, isSidebarOpen, toggleSidebar } = useApp();
  
  return (
    <div className="relative flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      {isSidebarOpen && (
          <div 
              onClick={toggleSidebar}
              className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden no-print"
              aria-hidden="true"
          ></div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="no-print">
          <Header />
        </div>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-6">
          {children}
        </main>
      </div>
      {notification && <Notification message={notification.message} type={notification.type} />}
    </div>
  );
};

export default DashboardLayout;
