import React from 'react';
import { useApp } from './contexts/AppContext';
import Login from './pages/Login';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Visits from './pages/Visits';
import Diagnosis from './pages/Diagnosis';
import Users from './pages/Users';
import Clinics from './pages/Clinics';
import Reports from './pages/Reports';
import Queue from './pages/Queue';
import ManualRevenue from './pages/ManualRevenue';
import Revenues from './pages/Revenues';
import Doctors from './pages/Doctors';

const App: React.FC = () => {
  const { user, currentView, loading, error } = useApp();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'patients':
        return <Patients />;
      case 'visits':
        return <Visits />;
      case 'diagnosis':
        return <Diagnosis />;
      case 'users':
        return <Users />;
      case 'clinics':
        return <Clinics />;
      case 'doctors':
        return <Doctors />;
      case 'reports':
        return <Reports />;
      case 'queue':
        return <Queue />;
      case 'manual-revenue':
        return <ManualRevenue />;
      case 'revenues':
        return <Revenues />;
      default:
        return <Dashboard />;
    }
  };
  
  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-teal-500 mx-auto"></div>
                <h2 className="mt-4 text-xl font-semibold text-gray-700">جاري تحميل البيانات...</h2>
                <p className="text-gray-500">يرجى الانتظار لحظات</p>
            </div>
        </div>
    );
  }

  if (error) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
              <div className="text-center bg-white p-8 rounded-lg shadow-md border border-red-200">
                  <h2 className="text-2xl font-bold text-red-700">حدث خطأ في الاتصال</h2>
                  <p className="text-gray-600 mt-2">لا يمكن الاتصال بالخادم. يرجى التحقق من صحة رابط الـ API أو المحاولة مرة أخرى لاحقًا.</p>
                  <p className="text-xs text-gray-400 mt-4 break-all">{error}</p>
              </div>
          </div>
      );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <DashboardLayout>
      {renderView()}
    </DashboardLayout>
  );
};

export default App;