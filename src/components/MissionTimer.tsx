import React, { useEffect, useRef } from 'react';
import { Timer, AlertTriangle, Flame } from 'lucide-react';
import { sound } from '../utils/audio';

interface MissionTimerProps {
  timeRemaining: number;
  totalTime: number;
  isPaused?: boolean;
}

export const MissionTimer: React.FC<MissionTimerProps> = ({
  timeRemaining,
  totalTime,
  isPaused = false,
}) => {
  const percent = Math.max(0, Math.min(100, (timeRemaining / totalTime) * 100));
  const warnedRef = useRef<boolean>(false);
  const criticalRef = useRef<boolean>(false);

  // Audio cues on critical time thresholds
  useEffect(() => {
    if (isPaused) return;

    if (timeRemaining <= 30 && timeRemaining > 10 && !warnedRef.current) {
      warnedRef.current = true;
      sound.playWarning();
    }
    if (timeRemaining <= 10 && timeRemaining > 0 && !criticalRef.current) {
      criticalRef.current = true;
      sound.playCritical();
    }
    if (timeRemaining > 30) {
      warnedRef.current = false;
      criticalRef.current = false;
    }
  }, [timeRemaining, isPaused]);

  // Visual status classes
  const isCritical = timeRemaining <= 10;
  const isWarning = timeRemaining <= 30 && !isCritical;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      id="mission-timer-widget"
      className={`relative flex items-center gap-3 px-3.5 py-2 rounded-2xl border backdrop-blur-md transition-all duration-300 ${
        isCritical
          ? 'bg-rose-950/80 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.4)] animate-pulse'
          : isWarning
          ? 'bg-amber-950/80 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
          : 'bg-slate-900/90 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
      }`}
    >
      {/* Icon */}
      <div className="flex items-center justify-center">
        {isCritical ? (
          <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
        ) : isWarning ? (
          <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
        ) : (
          <Timer className="w-5 h-5 text-cyan-400" />
        )}
      </div>

      {/* Digits & Bar */}
      <div className="flex flex-col min-w-[80px]">
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400">
            {isCritical ? 'CRÍTICO' : isWarning ? 'ALERTA' : 'TEMPO'}
          </span>
          <span
            className={`font-mono font-black text-base sm:text-lg tracking-wider ${
              isCritical
                ? 'text-rose-300'
                : isWarning
                ? 'text-amber-300'
                : 'text-cyan-300'
            }`}
          >
            {formattedTime}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mt-0.5">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isCritical
                ? 'bg-gradient-to-r from-rose-500 to-red-600'
                : isWarning
                ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                : 'bg-gradient-to-r from-cyan-400 to-blue-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
