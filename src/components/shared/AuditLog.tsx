import type { AuditLogEntry } from '@/types';
import { History, User, CheckCircle, XCircle, ArrowRight, FileText, Truck, Package } from 'lucide-react';

interface AuditLogProps {
  entries: AuditLogEntry[];
  className?: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  'REQUEST_CREATED': <FileText className="w-3 h-3" />,
  'ROUTED': <ArrowRight className="w-3 h-3" />,
  'APPROVED': <CheckCircle className="w-3 h-3" />,
  'DECLINED': <XCircle className="w-3 h-3" />,
  'INVOICE_GENERATED': <FileText className="w-3 h-3" />,
  'CLEARED': <CheckCircle className="w-3 h-3" />,
  'STOCK_BOOKED': <Package className="w-3 h-3" />,
  'PREPPING': <Package className="w-3 h-3" />,
  'SHIPPED': <Truck className="w-3 h-3" />,
  'DRIVER_ASSIGNED': <Truck className="w-3 h-3" />,
};

const actionColors: Record<string, string> = {
  'REQUEST_CREATED': 'bg-gray-100 text-gray-600',
  'ROUTED': 'bg-blue-100 text-blue-600',
  'APPROVED': 'bg-emerald-100 text-emerald-600',
  'DECLINED': 'bg-red-100 text-red-600',
  'INVOICE_GENERATED': 'bg-cyan-100 text-cyan-600',
  'CLEARED': 'bg-green-100 text-green-600',
  'STOCK_BOOKED': 'bg-orange-100 text-orange-600',
  'PREPPING': 'bg-indigo-100 text-indigo-600',
  'SHIPPED': 'bg-gray-100 text-gray-600',
  'DRIVER_ASSIGNED': 'bg-teal-100 text-teal-600',
};

export function AuditLog({ entries, className = '' }: AuditLogProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`bg-white border border-fdms-border ${className}`}>
      <div className="px-3 py-2 border-b border-fdms-border bg-fdms-zebra flex items-center gap-2">
        <History className="w-3 h-3 text-fdms-muted" />
        <span className="text-xs font-semibold uppercase tracking-wider text-fdms-muted">Audit Log</span>
      </div>
      
      <div className="max-h-48 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="p-4 text-center text-xs text-fdms-muted">
            No audit entries
          </div>
        ) : (
          <div className="divide-y divide-fdms-border">
            {[...entries].reverse().map((entry) => (
              <div key={entry.id} className="p-3 hover:bg-fdms-zebra transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center ${actionColors[entry.action] || 'bg-gray-100 text-gray-600'}`}>
                    {actionIcons[entry.action] || <History className="w-3 h-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-fdms-text">{entry.action}</span>
                      <span className="text-xs text-fdms-muted">{formatTime(entry.timestamp)}</span>
                    </div>
                    <p className="text-xs text-fdms-muted mt-0.5">{entry.details}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <User className="w-2.5 h-2.5 text-fdms-muted" />
                      <span className="text-xs text-fdms-muted">{entry.user}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
