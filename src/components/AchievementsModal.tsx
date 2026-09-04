import React from 'react';
import { ACHIEVEMENTS_LIST } from '../data/questions';
import { Trophy, X, CheckCircle2, Lock, Zap, FlaskConical, Lightbulb, Radio, Cpu, Rocket, Activity, Flame, Gauge } from 'lucide-react';
import { sound } from '../utils/audio';

interface AchievementsModalProps {
  unlockedAchievements: string[];
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  unlockedAchievements,
  onClose,
}) => {
  const getIcon = (iconName: string) => {
    const props = { className: 'w-6 h-6' };
    switch (iconName) {
      case 'Zap': return <Zap {...props} />;
      case 'FlaskConical': return <FlaskConical {...props} />;
      case 'Lightbulb': return <Lightbulb {...props} />;
      case 'Radio': return <Radio {...props} />;
      case 'Cpu': return <Cpu {...props} />;
      case 'Rocket': return <Rocket {...props} />;
      case 'Activity': return <Activity {...props} />;
      case 'Flame': return <Flame {...props} />;
      case 'Gauge': return <Gauge {...props} />;
      default: return <Trophy {...props} />;
    }
  };

  const unlockedCount = unlockedAchievements.length;
  const totalCount = ACHIEVEMENTS_LIST.length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div id="achievements-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-amber-500/40 rounded-3xl flex flex-col overflow-hidden shadow-[0_10px_50px_rgba(245,158,11,0.2)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-500/30 flex items-center justify-between gap-4 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                Mural de Honra dos Astronautas
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Conquistas & Distintivos ({unlockedCount} / {totalCount})
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { sound.playClick(); onClose(); }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex items-center gap-4">
          <div className="text-xs font-mono text-slate-300 whitespace-nowrap">
            Progresso Geral: <span className="text-amber-400 font-bold">{progressPercent}%</span>
          </div>
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {ACHIEVEMENTS_LIST.map((ach) => {
            const isUnlocked = unlockedAchievements.includes(ach.id);

            return (
              <div
                key={ach.id}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                  isUnlocked
                    ? 'bg-slate-950/80 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] text-white'
                    : 'bg-slate-950/40 border-slate-800/80 text-slate-400 opacity-60'
                }`}
              >
                <div className={`p-2.5 rounded-xl border shrink-0 ${
                  isUnlocked
                    ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-600'
                }`}>
                  {getIcon(ach.icon)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-xs sm:text-sm font-bold truncate">
                      {ach.title}
                    </h4>
                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        DESBLOQUEADA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500">
                        <Lock className="w-3 h-3" />
                        BLOQUEADA
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {ach.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
