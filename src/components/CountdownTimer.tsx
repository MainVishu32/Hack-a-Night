import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface CountdownTimerProps {
  expiresAt: string; // ISO timestamp
  serverTimeOffset?: number; // delta in ms between local client and server
  onExpire?: () => void;
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  expiresAt,
  serverTimeOffset = 0,
  onExpire,
  className = ''
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const target = new Date(expiresAt).getTime();
    const effectiveNow = Date.now() + serverTimeOffset;
    return Math.max(0, Math.floor((target - effectiveNow) / 1000));
  });

  useEffect(() => {
    const target = new Date(expiresAt).getTime();

    const interval = setInterval(() => {
      const effectiveNow = Date.now() + serverTimeOffset;
      const diff = Math.max(0, Math.floor((target - effectiveNow) / 1000));
      setSecondsRemaining(diff);

      if (diff <= 0) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [expiresAt, serverTimeOffset, onExpire]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const isUrgent = secondsRemaining < 60 && secondsRemaining > 0;
  const isExpired = secondsRemaining === 0;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono tabular-nums ${
        isExpired
          ? 'bg-[#EF4444]/10 border-[#EF4444]/40 text-[#EF4444]'
          : isUrgent
          ? 'bg-[#F59E0B]/10 border-[#F59E0B]/40 text-[#F59E0B]'
          : 'bg-[#111C2E] border-[#293548] text-[#2DD4BF]'
      } ${className}`}
    >
      {isExpired ? (
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Clock className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>
        {isExpired
          ? 'Hold Expired'
          : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} remaining`}
      </span>
    </div>
  );
};
