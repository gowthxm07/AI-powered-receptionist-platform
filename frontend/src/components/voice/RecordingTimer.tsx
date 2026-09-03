import React from 'react';

interface RecordingTimerProps {
  durationSec: number;
}

export const RecordingTimer: React.FC<RecordingTimerProps> = ({ durationSec }) => {
  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs tracking-wider">
      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
      <span>{formatTime(durationSec)}</span>
    </div>
  );
};
