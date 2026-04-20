import type { RequestStatus } from '@/types';

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  new: { label: 'NEW', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  pending_admin_manager: { label: 'PENDING MGR', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  approved: { label: 'APPROVED', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  declined: { label: 'DECLINED', className: 'bg-red-100 text-red-800 border-red-200' },
  pending_finance: { label: 'PENDING FIN', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  invoiced: { label: 'INVOICED', className: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  invoice_declined: { label: 'INV DECLINED', className: 'bg-red-100 text-red-800 border-red-200' },
  paid: { label: 'PAID', className: 'bg-green-100 text-green-800 border-green-200' },
  released: { label: 'RELEASED', className: 'bg-green-100 text-green-800 border-green-200' },
  cleared: { label: 'CLEARED', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  booking_stock: { label: 'BOOKING STOCK', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  prepping: { label: 'PREPPING', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  driver_assigned: { label: 'DRIVER ASSIGNED', className: 'bg-teal-100 text-teal-800 border-teal-200' },
  order_picked_up: { label: 'PICKED UP', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  delivered: { label: 'DELIVERED', className: 'bg-gray-100 text-gray-800 border-gray-200' },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${config.className} ${className}`}>
      {config.label}
    </span>
  );
}
