import { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface SLACountdownProps {
  deadline: Date;
  className?: string;
}

export function SLACountdown({ deadline, className = '' }: SLACountdownProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const deadlineTime = new Date(deadline).getTime();
      const diff = deadlineTime - now;

      if (diff <= 0) {
        setTimeLeft('OVERDUE');
        setIsOverdue(true);
        setIsUrgent(false);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setIsUrgent(hours < 2);
      setIsOverdue(false);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d ${hours % 24}h`);
      } else {
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  if (isOverdue) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium text-red-600 ${className}`}>
        <AlertCircle className="w-3 h-3" />
        {timeLeft}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isUrgent ? 'text-red-600' : 'text-[#64748b]'} ${className}`}>
      <Clock className={`w-3 h-3 ${isUrgent ? 'animate-pulse' : ''}`} />
      {timeLeft}
    </span>
  );
}
