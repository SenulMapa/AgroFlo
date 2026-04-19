import type { Priority } from '@/types';
import { AlertTriangle, ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
  showIcon?: boolean;
}

const priorityConfig: Record<Priority, { label: string; className: string; icon: React.ReactNode }> = {
  low: { 
    label: 'LOW', 
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: <ArrowDown className="w-3 h-3" />
  },
  medium: { 
    label: 'MED', 
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Minus className="w-3 h-3" />
  },
  high: { 
    label: 'HIGH', 
    className: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: <ArrowUp className="w-3 h-3" />
  },
  critical: { 
    label: 'CRIT', 
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: <AlertTriangle className="w-3 h-3" />
  },
};

export function PriorityBadge({ priority, className = '', showIcon = true }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border ${config.className} ${className}`}>
      {showIcon && config.icon}
      {config.label}
    </span>
  );
}
