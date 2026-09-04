import React, { useState } from 'react';
import { Play, BookOpen, Trophy, HelpCircle, Zap, Sparkles, Volume2, VolumeX, ShieldCheck, Atom, User, Edit2, Check } from 'lucide-react';
import { TigraoMascot } from './TigraoMascot';
import { sound } from '../utils/audio';

interface MainMenuProps {
  playerName: string;
  onUpdatePlayerName: (name: string) => void;
  onStartGame: () => void;
  onOpenHowToPlay: () => void;
  onOpenTheory: () => void;
  onOpenAchievements: () => void;
  onOpenLab?: () => void;
  onOpenCalculator?: () => void;
  onOpenAudioSettings?: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  completedSectorsCount: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  playerName,
  onUpdatePlayerName,
  onStartGame,
  onOpenHowToPlay,
  onOpenTheory,
  onOpenAchievements,
  onOpenLab,
  onOpenCalculator,
  onOpenAudioSettings,
  soundEnabled,
  onToggleSound,
  completedSectorsCount,
}) => {
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>(playerName);

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = tempName.trim() || 'Astronauta';
    onUpdatePlayerName(trimmed);
    setIsEditingName(false);
    sound.playClick();
  };
  return (
    <div id="main-menu-container" className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 text-center animate-fade-in">
      {/* Hero Station Hologram Card */}
      <div className="relative bg-gradient-to-b from-slate-900/90 via-slate-900/95 to-slate-950/95 border border-cyan-500/50 rounded-3xl p-6 sm:p-10 backdrop-blur-md shadow-[0_0_60px_rgba(6,182,212,0.25)] overflow-hidden">
        {/* Ambient background orbital glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-xl h-64 bg-cyan-500/15 blur-3xl rounded-full pointer-events-none" />

        {/* Audio Toggle & Top Badge */}
        <div className="relative z-10 flex items-center justify-between gap-4 mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono font-bold tracking-widest uppercase">
            <Atom className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Física • 3º Ano do Ensino Médio</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAudioSettings && (
              <button
                type="button"
                onClick={() => { sound.playClick(); onOpenAudioSettings(); }}
                className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                title="Configurações de Voz e Volume"
              >
                <Volume2 className="w-4 h-4" />
                <span className="hidden sm:inline">Voz & Áudio</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleSound}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-cyan-500/30 text-cyan-400 transition-colors cursor-pointer"
              title={soundEnabled ? 'Desativar Sons' : 'Ativar Sons'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>

        {/* Main Game Titles */}
        <div className="relative z-10 space-y-2 mb-6">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-100 to-cyan-400 tracking-tight drop-shadow-[0_4px_20px_rgba(6,182,212,0.4)]">
            CIRCUITOS ELÉTRICOS
          </h1>
          <h2 className="text-base sm:text-xl lg:text-2xl font-extrabold text-cyan-400 tracking-widest uppercase font-mono">
            MISSÃO: SALVAR A ESTAÇÃO ORBITAL
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto font-sans leading-relaxed pt-1">
            Explore 8 módulos da estação espacial, diagnostique falhas elétricas, calcule tensões, correntes e potências ao lado de Tigrão!
          </p>
        </div>

        {/* Mascot Center Showcase & Astronaut Name Config */}
        <div className="relative z-10 max-w-md mx-auto mb-6 space-y-4">
          {/* Astronaut Name Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-950/90 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <User className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono text-cyan-300 font-bold uppercase">Astronauta:</span>
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="bg-slate-900 border border-cyan-400 rounded-lg px-2.5 py-0.5 text-xs text-white font-bold font-mono outline-none max-w-[140px]"
                  placeholder="Seu nome"
                  autoFocus
                  maxLength={24}
                />
                <button
                  type="submit"
                  className="p-1 rounded-md bg-cyan-500 text-slate-950 hover:bg-cyan-400 cursor-pointer"
                  title="Salvar Nome"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white font-mono bg-cyan-950/80 px-2.5 py-0.5 rounded-lg border border-cyan-500/30">
                  {playerName}
                </span>
                <button
                  type="button"
                  onClick={() => { setTempName(playerName); setIsEditingName(true); }}
                  className="p-1 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  title="Alterar Nome do Astronauta"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <TigraoMascot
            mood="happy"
            speech={`E aí, Astronauta ${playerName}! Os circuitos da estação espacial estão em alerta crítico. Vista seu traje e venha comigo salvar a nossa missão orbital!`}
            size="lg"
          />
        </div>

        {/* Primary & Secondary Action Menu Buttons */}
        <div className="relative z-10 max-w-md mx-auto space-y-3">
          {/* Play Mission Button */}
          <button
            type="button"
            onClick={() => { sound.playClick(); onStartGame(); }}
            className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-base sm:text-lg font-mono tracking-wider uppercase transition-all shadow-[0_0_30px_rgba(6,182,212,0.5)] transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3"
          >
            <Play className="w-6 h-6 fill-slate-950" />
            <span>{completedSectorsCount > 0 ? 'CONTINUAR MISSÃO' : '▶ INICIAR MISSÃO'}</span>
          </button>

          {/* Secondary Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {onOpenLab && (
              <button
                type="button"
                onClick={() => { sound.playClick(); onOpenLab(); }}
                className="py-3 px-3 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-bold font-mono text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)]"
              >
                <span>🔬 LABORATÓRIO</span>
              </button>
            )}

            {onOpenCalculator && (
              <button
                type="button"
                onClick={() => { sound.playClick(); onOpenCalculator(); }}
                className="py-3 px-3 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 hover:border-purple-400 text-purple-300 font-bold font-mono text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.2)]"
              >
                <span>🧮 CALCULADORA</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => { sound.playClick(); onOpenTheory(); }}
              className="py-3 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 font-bold font-mono text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>🧠 FÓRMULAS</span>
            </button>

            <button
              type="button"
              onClick={() => { sound.playClick(); onOpenAchievements(); }}
              className="py-3 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-slate-200 hover:text-amber-300 font-bold font-mono text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>🏆 CONQUISTAS</span>
            </button>

            <button
              type="button"
              onClick={() => { sound.playClick(); onOpenHowToPlay(); }}
              className="py-3 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300 font-bold font-mono text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer col-span-2 sm:col-span-1"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>📖 COMO JOGAR</span>
            </button>
          </div>
        </div>

        {/* Progress Snapshot Footer */}
        {completedSectorsCount > 0 && (
          <div className="relative z-10 mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs font-mono text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Progresso da Missão: {completedSectorsCount} de 8 Setores Salvos ({Math.round((completedSectorsCount / 8) * 100)}%)</span>
          </div>
        )}

        {/* Dedication Credit */}
        <div className="relative z-10 pt-4 text-center">
          <p className="text-xs font-mono text-cyan-400/80 tracking-wide">
            feito com carinho pelo <span className="font-bold text-cyan-300">prof. Silas</span>
          </p>
        </div>
      </div>
    </div>
  );
};
