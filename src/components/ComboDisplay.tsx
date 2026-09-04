import React from 'react';
import { Flame, Zap } from 'lucide-react';

interface ComboDisplayProps {
  combo: number;
}

export const ComboDisplay: React.FC<ComboDisplayProps> = ({ combo }) => {
  if (combo < 2) return null;

  const multiplier = (1 + (combo - 1) * 0.2).toFixed(1);
  const bonusPercent = Math.round((combo - 1) * 20);

  return (
    <div
      id="combo-streak-badge"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 border border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-pulse"
    >
      <div className="flex items-center gap-1">
        <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
        <span className="text-xs font-mono font-black text-amber-300 uppercase tracking-wider">
          COMBO x{combo}
        </span>
      </div>
      <div className="h-3 w-px bg-amber-500/40" />
      <div className="flex items-center gap-1 text-[11px] font-mono text-amber-200">
        <Zap className="w-3 h-3 text-cyan-300" />
        <span>+{bonusPercent}% XP ({multiplier}x)</span>
      </div>
    </div>
  );
};
