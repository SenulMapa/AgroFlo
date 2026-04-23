import { useAppStore } from '@/store/AppStore';
import type { UserRole } from '@/types';
import { LogOut, User, Sprout } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  onLogout: () => void;
}

const roleLabels: Record<NonNullable<UserRole>, string> = {
  admin_staff: 'ADMIN STAFF',
  admin_manager: 'ADMIN MANAGER',
  finance: 'FINANCE',
  warehouse: 'WAREHOUSE',
  inventory_manager: 'INVENTORY MANAGER',
  receiver: 'RECEIVER',
};

export function DashboardHeader({ title, onLogout }: DashboardHeaderProps) {
  const { state } = useAppStore();
  const { currentUser } = state;

  return (
    <header className="h-12 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 bg-[#15803d] rounded">
            <Sprout className="w-4 h-4 text-white" />
          </div>
          <span className="font-mono text-lg font-bold text-[#15803d] tracking-wider">AgroFlo</span>
          <span className="text-[#e2e8f0]">|</span>
          <span className="text-sm font-semibold text-[#1e293b] uppercase tracking-wider">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {currentUser && (
          <>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#64748b] uppercase tracking-wider">
                {roleLabels[currentUser.role as NonNullable<UserRole>]}
              </span>
              <div className="flex items-center gap-2 px-3 py-1 bg-[#f1f5f9] border border-[#e2e8f0] rounded">
                <User className="w-3 h-3 text-[#64748b]" />
                <span className="text-xs font-medium text-[#1e293b]">{currentUser.name}</span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#64748b] hover:text-[#dc2626] hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors rounded"
            >
              <LogOut className="w-3 h-3" />
              LOGOUT
            </button>
          </>
        )}
      </div>
    </header>
  );
}
