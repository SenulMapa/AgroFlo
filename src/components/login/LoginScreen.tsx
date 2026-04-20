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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="https://lh3.googleusercontent.com/sitesv/AA5AbUDoVb4JT9HaAeOCZDT1u5Q2h8KBs_xvDgs3zVPXj27bp_kZldUepX1IwU30DDpl6tlsJxrgXeXD2-aHR0FKm3vYFlVcc1vuOqyI_G2tYkIn7LSck2orlccxUNBd0ujcJZweIYqxoZidHrdBKM8ZPLlNNVfSEQszbEJ1f5Eli_rxcrzPevvzh-IX=w16383"
          alt="Login Background"
          className="w-full h-full object-cover"
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-600/70 via-green-700/60 to-teal-800/50"></div>
      </div>
      <div className="w-full max-w-md relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-4 shadow-lg border border-white/30">
            <Sprout className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-mono text-3xl font-bold text-white tracking-wider drop-shadow-md">
            AgriFlo
          </h1>
          <p className="text-white mt-2 text-sm font-medium">
            Fertilizer Distribution Management System
          </p>
          <p className="text-white/90 text-xs mt-1">
            State Fertilizer Corporation
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/95 backdrop-blur-sm border border-white/30 rounded-lg shadow-xl">
          <div className="px-6 py-4 border-b border-[#e2e8f0]/50 bg-white/20 rounded-t-lg">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
              Staff Authentication
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50/20 border border-red-200/30 text-red-100 text-xs rounded">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-100" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wider text-white">
                Employee ID
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/80" />
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 border border-white/30 text-white rounded focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-colors bg-white/10"
                  placeholder="Enter employee ID"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wider text-white">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/80" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 border border-white/30 text-white rounded focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-colors bg-white/10"
                  placeholder="Enter password"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !employeeId || !password}
              className="w-full h-10 bg-white/20 text-white font-medium text-sm hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 rounded backdrop-blur-sm border border-white/20"
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
          <p className="text-center text-xs text-white/80 mb-3">Quick Login (Demo)</p>
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
                className="px-2 py-2 bg-white/20 border border-white/30 text-xs text-white/80 hover:bg-white/30 hover:text-white transition-colors rounded backdrop-blur-sm"
                title={role?.replace('_', ' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-white/80">
            Authorized personnel only. All access is logged and monitored.
          </p>
          <p className="text-xs text-white/80 mt-1">
            v1.0.0 | MVP Build 2026.04.12
          </p>
        </div>
      </div>
    </div>
  );
}
