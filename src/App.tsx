import { useState } from 'react';
import { AppProvider } from '@/store/AppStore';
import { LoginScreen } from '@/components/login/LoginScreen';
import { AdminStaffDashboard } from '@/components/dashboards/AdminStaffDashboard';
import { AdminManagerDashboard } from '@/components/dashboards/AdminManagerDashboard';
import { FinanceDashboard } from '@/components/dashboards/FinanceDashboard';
import { WarehouseDashboard } from '@/components/dashboards/WarehouseDashboard';
import { IMSDashboard } from '@/components/dashboards/IMSDashboard';
import { ReceiverPortal } from '@/components/dashboards/ReceiverPortal';

import type { UserRole } from '@/types';
import { Toaster } from '@/components/ui/sonner';

function AppContent() {
  const [currentRole, setCurrentRole] = useState<UserRole>(null);

  const handleLogin = (role: UserRole) => {
    setCurrentRole(role);
  };

  const handleLogout = () => {
    setCurrentRole(null);
  };

  if (!currentRole) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  switch (currentRole) {
    case 'admin_staff':
      return <AdminStaffDashboard onLogout={handleLogout} />;
    case 'admin_manager':
      return <AdminManagerDashboard onLogout={handleLogout} />;
    case 'finance':
      return <FinanceDashboard onLogout={handleLogout} />;
    case 'warehouse':
      return <WarehouseDashboard onLogout={handleLogout} />;
    case 'inventory_manager':
      return <IMSDashboard onLogout={handleLogout} />;
    case 'receiver':
      return <ReceiverPortal onLogout={handleLogout} />;
    default:
      return <LoginScreen onLogin={handleLogin} />;
  }
}

function App() {
  return (
    <AppProvider>
      <AppContent />
      <Toaster position="top-right" />
    </AppProvider>
  );
}

export default App;
