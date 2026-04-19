import { useState } from 'react';
import { useAppStore } from '@/store/AppStore';
import type { UserRole } from '@/types';
import { credentials, mockUsers } from '@/data/mockData';
import { Sprout, User, Lock, AlertCircle, Loader2 } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (role: UserRole) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dispatch } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    // Validate credentials
    const user = mockUsers.find(u => u.employeeId === employeeId);

    if (!user) {
      setError('Invalid employee ID');
      setIsLoading(false);
      return;
    }

    const cred = credentials[user.role as keyof typeof credentials];
    if (!cred || cred.password !== password) {
      setError('Invalid password');
      setIsLoading(false);
      return;
    }

    // Login successful
    dispatch({ type: 'SET_USER', payload: user });
    setIsLoading(false);
    onLogin(user.role);
  };

  const quickLogin = (role: UserRole) => {
    if (!role) return;
    const cred = credentials[role];
    const user = mockUsers.find(u => u.employeeId === cred.employeeId);
    if (user) {
      setEmployeeId(cred.employeeId);
      setPassword(cred.password);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#15803d] rounded-xl mb-4 shadow-lg">
            <Sprout className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-mono text-2xl font-bold text-[#1e293b] tracking-wider">
            AgriFlo
          </h1>
          <p className="text-[#64748b] mt-1 text-sm font-medium">
            Agricultural Fertilizer Logistics
          </p>
          <p className="text-[#64748b] text-xs mt-1">
            State Fertilizer Corporation
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-[#e2e8f0] bg-green-50 rounded-t-lg">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#1e293b]">
              Staff Authentication
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wider text-[#64748b]">
                Employee ID
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 border border-[#e2e8f0] text-sm rounded focus:outline-none focus:border-[#15803d] focus:ring-1 focus:ring-[#15803d] transition-colors"
                  placeholder="Enter employee ID"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wider text-[#64748b]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 border border-[#e2e8f0] text-sm rounded focus:outline-none focus:border-[#15803d] focus:ring-1 focus:ring-[#15803d] transition-colors"
                  placeholder="Enter password"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !employeeId || !password}
              className="w-full h-10 bg-[#15803d] text-white font-medium text-sm hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 rounded"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  VERIFYING...
                </>
              ) : (
                'SIGN IN'
              )}
            </button>
          </form>
        </div>

        {/* Quick Login Buttons */}
        <div className="mt-6">
          <p className="text-center text-xs text-[#64748b] mb-3">Quick Login (Demo)</p>
          <div className="grid grid-cols-5 gap-2">
            {([
              { role: 'admin_staff', label: 'Staff' },
              { role: 'admin_manager', label: 'Admin' },
              { role: 'finance', label: 'Finance' },
              { role: 'warehouse', label: 'Warehouse' },
              { role: 'receiver', label: 'Receiver' },
            ] as { role: UserRole; label: string }[]).map(({ role, label }) => (
              <button
                key={role}
                onClick={() => quickLogin(role)}
                className="px-2 py-2 bg-white border border-[#e2e8f0] text-xs text-[#64748b] hover:border-[#15803d] hover:text-[#15803d] transition-colors rounded"
                title={role?.replace('_', ' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#64748b]">
            Authorized personnel only. All access is logged and monitored.
          </p>
          <p className="text-xs text-[#64748b] mt-1">
            v1.0.0 | MVP Build 2026.04.12
          </p>
        </div>
      </div>
    </div>
  );
}
