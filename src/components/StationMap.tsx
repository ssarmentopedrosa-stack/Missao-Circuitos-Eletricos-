import React from 'react';
import { SectorId, SectorInfo } from '../types';
import { SECTORS } from '../data/sectors';
import { 
  Zap, 
  FlaskConical, 
  Lightbulb, 
  Radio, 
  Cpu, 
  Rocket, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  Lock, 
  AlertTriangle, 
  Play, 
  Sparkles, 
  Trophy, 
  Flame, 
  ShieldCheck, 
  ChevronRight,
  Calculator,
  Award,
  BookOpen,
  HelpCircle,
  Heart,
  User,
  Crown,
  Volume2
} from 'lucide-react';
import { TigraoMascot } from './TigraoMascot';
import { sound } from '../utils/audio';

interface StationMapProps {
  playerName: string;
  lives: number;
  completedSectors: SectorId[];
  currentSectorId: SectorId | null;
  onSelectSector: (id: SectorId) => void;
  stationIntegrity: number;
  score: number;
  streak: number;
  onOpenTheory: () => void;
  onOpenAchievements: () => void;
  onOpenHowToPlay: () => void;
  onOpenLab: () => void;
  onOpenCalculator: () => void;
  onOpenCertificate: () => void;
  onOpenAudioSettings?: () => void;
  onOpenTimeTrial?: () => void;
}

export const StationMap: React.FC<StationMapProps> = ({
  playerName,
  lives,
  completedSectors,
  currentSectorId,
  onSelectSector,
  stationIntegrity,
  score,
  streak,
  onOpenTheory,
  onOpenAchievements,
  onOpenHowToPlay,
  onOpenLab,
  onOpenCalculator,
  onOpenCertificate,
  onOpenAudioSettings,
  onOpenTimeTrial,
}) => {
  const standardSectors = SECTORS.filter((s) => s.id <= 8);
  const enemSector = SECTORS.find((s) => s.id === 9) || SECTORS[8];

  const getSectorIcon = (name: string, isCompleted: boolean) => {
    const props = { className: `w-5 h-5 ${isCompleted ? 'text-emerald-400' : 'text-cyan-400'}` };
    switch (name) {
      case 'Zap': return <Zap {...props} />;
      case 'FlaskConical': return <FlaskConical {...props} />;
      case 'Lightbulb': return <Lightbulb {...props} />;
      case 'Radio': return <Radio {...props} />;
      case 'Cpu': return <Cpu {...props} />;
      case 'Rocket': return <Rocket {...props} />;
      case 'Activity': return <Activity {...props} />;
      case 'ShieldAlert': return <ShieldAlert {...props} />;
      case 'Trophy': return <Trophy className={`w-5 h-5 ${isCompleted ? 'text-amber-400' : 'text-purple-400'}`} />;
      default: return <Zap {...props} />;
    }
  };

  const standardDoneCount = completedSectors.filter((id) => id <= 8).length;
  const progressPercent = Math.round((standardDoneCount / 8) * 100);
  const allStandardDone = standardDoneCount === 8;
  const isEnemDone = completedSectors.includes(9);

  const isSectorUnlocked = (id: SectorId) => {
    if (id === 1) return true;
    if (id === 9) return allStandardDone;
    return completedSectors.includes((id - 1) as SectorId) || completedSectors.includes(id);
  };

  const handleSectorClick = (sector: SectorInfo) => {
    if (!isSectorUnlocked(sector.id)) {
      sound.playError();
      return;
    }
    sound.playClick();
    onSelectSector(sector.id);
  };

  return (
    <div id="station-map-container" className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Station HUD Status Bar */}
      <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-[0_4px_25px_rgba(6,182,212,0.15)] flex flex-wrap items-center justify-between gap-4">
        {/* Left: Station Identity & Astronaut Badge */}
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Estação Orbital ARES-III • Mapa Tático dos Módulos</span>
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
              Status da Rede Elétrica
            </h2>
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-300">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Astronauta: {playerName}</span>
            </div>
          </div>
        </div>

        {/* Middle: Gauges */}
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          {/* Lives (5 Hearts) */}
          <div className="bg-slate-950/80 border border-rose-500/30 px-3 py-1.5 rounded-xl font-mono text-center flex items-center gap-2">
            <div className="text-[10px] text-rose-400 font-bold uppercase">Vidas:</div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((heartIndex) => (
                <Heart
                  key={heartIndex}
                  className={`w-4 h-4 transition-all duration-300 ${
                    heartIndex <= lives
                      ? 'fill-rose-500 text-rose-400 scale-100 drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]'
                      : 'fill-slate-800 text-slate-700 scale-90 opacity-40'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Integrity Bar */}
          <div className="min-w-[150px] sm:min-w-[180px]">
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-slate-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Integridade
              </span>
              <span className={`font-bold ${stationIntegrity > 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {stationIntegrity}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  stationIntegrity > 60 
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' 
                    : stationIntegrity > 30 
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400' 
                    : 'bg-gradient-to-r from-red-600 to-rose-400'
                }`}
                style={{ width: `${stationIntegrity}%` }}
              />
            </div>
          </div>

          {/* Restoration Grid */}
          <div className="min-w-[150px] sm:min-w-[180px]">
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Setores Salvos
              </span>
              <span className="font-bold text-cyan-400">
                {standardDoneCount} / 8 ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Score & Streak Chips */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-950/80 border border-cyan-500/30 px-3 py-1.5 rounded-xl font-mono text-center">
              <div className="text-[10px] text-cyan-400 font-bold uppercase">Pontos</div>
              <div className="text-base font-extrabold text-cyan-200">{score}</div>
            </div>
            <div className="bg-slate-950/80 border border-amber-500/30 px-3 py-1.5 rounded-xl font-mono text-center flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[10px] text-amber-400 font-bold uppercase">Combo</div>
                <div className="text-base font-extrabold text-amber-200">{streak}x</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Blueprint Visual Schematic Diagram */}
      <div className="relative bg-slate-950/90 border border-cyan-500/30 rounded-3xl p-5 overflow-hidden shadow-[inset_0_0_30px_rgba(6,182,212,0.1)]">
        {/* Background Grid */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none" 
          style={{
            backgroundImage: 'radial-gradient(#06b6d4 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-cyan-500/20 text-xs font-mono">
          <span className="text-cyan-300 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            DIAGRAMA TÁTICO DOS CONDUÍTES DE ENERGIA (ESTAÇÃO ARES-III)
          </span>
          <span className="text-slate-400">
            {allStandardDone ? 'Status: ESTAÇÃO 100% OPERACIONAL • DESAFIO ENEM DESBLOQUEADO' : 'Status: FALHA DE DISTRIBUIÇÃO EM CASCATA'}
          </span>
        </div>

        {/* SVG Interconnected Blueprint Conduits */}
        <div className="relative z-10 w-full h-[140px] sm:h-[160px] flex items-center justify-center">
          <svg viewBox="0 0 800 160" className="w-full h-full select-none">
            {/* Main Spine Bus */}
            <path
              d="M 60 80 L 740 80"
              stroke={completedSectors.length > 0 ? '#0ea5e9' : '#334155'}
              strokeWidth="4"
              strokeDasharray={completedSectors.length > 0 ? '8 4' : 'none'}
            />

            {/* 8 Sector Junctions */}
            {standardSectors.map((s, idx) => {
              const xPos = 60 + idx * (680 / 7);
              const isDone = completedSectors.includes(s.id);
              const isNext = isSectorUnlocked(s.id) && !isDone;

              return (
                <g 
                  key={s.id} 
                  transform={`translate(${xPos}, 80)`}
                  onClick={() => handleSectorClick(s)}
                  className="cursor-pointer group"
                >
                  {/* Vertical Spur to Bus */}
                  <line 
                    x1="0" 
                    y1={idx % 2 === 0 ? '-35' : '35'} 
                    x2="0" 
                    y2="0" 
                    stroke={isDone ? '#10b981' : isNext ? '#06b6d4' : '#334155'} 
                    strokeWidth="3" 
                  />

                  {/* Junction Node */}
                  <circle 
                    cx="0" 
                    cy="0" 
                    r={isNext ? '8' : '6'} 
                    fill={isDone ? '#10b981' : isNext ? '#06b6d4' : '#1e293b'} 
                    stroke={isDone ? '#34d399' : isNext ? '#38bdf8' : '#475569'} 
                    strokeWidth="2" 
                    className={isNext ? 'animate-ping' : ''}
                  />
                  <circle 
                    cx="0" 
                    cy="0" 
                    r="5" 
                    fill={isDone ? '#10b981' : isNext ? '#06b6d4' : '#1e293b'} 
                  />

                  {/* Sector Bubble Icon Node */}
                  <g transform={`translate(0, ${idx % 2 === 0 ? '-42' : '42'})`}>
                    <rect 
                      x="-38" 
                      y="-14" 
                      width="76" 
                      height="28" 
                      rx="8" 
                      fill={isDone ? '#064e3b' : isNext ? '#083344' : '#0f172a'} 
                      stroke={isDone ? '#10b981' : isNext ? '#06b6d4' : '#334155'} 
                      strokeWidth="1.5" 
                    />
                    <text 
                      x="0" 
                      y="4" 
                      textAnchor="middle" 
                      fill={isDone ? '#6ee7b7' : isNext ? '#67e8f9' : '#94a3b8'} 
                      fontSize="9" 
                      fontWeight="bold" 
                      fontFamily="monospace"
                    >
                      S0{s.id}: {isDone ? '100%' : isNext ? 'ALERTA' : 'OFF'}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Tigrão Companion Card on Station Map */}
      <div className="bg-slate-900/60 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur-sm">
        <TigraoMascot
          mood={isEnemDone ? 'celebrating' : allStandardDone ? 'celebrating' : completedSectors.length > 0 ? 'happy' : 'idle'}
          speech={
            isEnemDone
              ? `MISSÃO LENDÁRIA, Astronauta ${playerName}! Você concluiu todos os setores e o grande Desafio ENEM! O seu Certificado de Honra ao Mérito está pronto!`
              : allStandardDone
              ? `PARABÉNS, Astronauta ${playerName}! Você restaurou todos os 8 setores da estação! O DESAFIO ENEM acaba de ser desbloqueado para coroar seu domínio!`
              : completedSectors.length === 0
              ? `Olá, Astronauta ${playerName}! A estação sofreu uma falha em cascata. Você tem ${lives} vidas de proteção para restaurar os módulos, começando pelo Setor 1!`
              : `Ótimo progresso, Astronauta ${playerName}! Já recuperamos ${standardDoneCount} de 8 setores. Selecione o próximo módulo em alerta para continuar o reparo!`
          }
          showHintButton={false}
          size="md"
        />
      </div>

      {/* Navigation Quick Toolbar (Sandbox Lab, Calculator, Theory, Achievements, Rules, Certificate) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-mono uppercase tracking-wider text-cyan-300 font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>Selecione um Setor para Diagnosticar:</span>
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Trial Emergency Missions Button */}
          {onOpenTimeTrial && (
            <button
              type="button"
              onClick={onOpenTimeTrial}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-950/90 to-orange-950/90 hover:from-amber-900 hover:to-orange-900 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:border-amber-400 cursor-pointer animate-pulse"
              title="Abrir Missões de Emergência Contrarrelógio"
            >
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Contrarrelógio (Emergências)</span>
            </button>
          )}

          {/* Free Laboratory Sandbox Button */}
          <button
            type="button"
            onClick={onOpenLab}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:border-cyan-400 cursor-pointer"
            title="Abrir Simulador de Bancada Livre de Eletrodinâmica"
          >
            <FlaskConical className="w-4 h-4 text-cyan-400" />
            <span>Laboratório Livre (Sandbox)</span>
          </button>

          {/* Calculator Button */}
          <button
            type="button"
            onClick={onOpenCalculator}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold transition-all hover:border-purple-400 cursor-pointer"
            title="Abrir Calculadora do Astronauta & Fórmulas"
          >
            <Calculator className="w-4 h-4 text-purple-400" />
            <span>Calculadora</span>
          </button>

          {/* Theory */}
          <button
            type="button"
            onClick={onOpenTheory}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all hover:border-cyan-400 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Guia de Fórmulas</span>
          </button>

          {/* Achievements */}
          <button
            type="button"
            onClick={onOpenAchievements}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 text-xs font-medium transition-all hover:border-amber-400 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Conquistas</span>
          </button>

          {/* Certificate Preview */}
          {completedSectors.length > 0 && (
            <button
              type="button"
              onClick={onOpenCertificate}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold transition-all hover:border-emerald-400 cursor-pointer"
              title="Visualizar Certificado Oficial de Engenharia"
            >
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Certificado</span>
            </button>
          )}

          {/* Rules */}
          <button
            type="button"
            onClick={onOpenHowToPlay}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-all hover:border-slate-500 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Regras</span>
          </button>

          {/* Audio & Voice Settings */}
          {onOpenAudioSettings && (
            <button
              type="button"
              onClick={onOpenAudioSettings}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-cyan-950 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition-all hover:border-cyan-400 cursor-pointer"
              title="Configurações de Áudio e Voz do Tigrão"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Voz & Áudio</span>
            </button>
          )}
        </div>
      </div>

      {/* 8 Sectors Interactive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {standardSectors.map((sector) => {
          const isCompleted = completedSectors.includes(sector.id);
          const isUnlocked = isSectorUnlocked(sector.id);
          const isNext = isUnlocked && !isCompleted;

          return (
            <div
              key={sector.id}
              onClick={() => handleSectorClick(sector)}
              className={`relative rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 select-none ${
                isCompleted
                  ? 'bg-slate-900/80 border-emerald-500/50 hover:border-emerald-400 shadow-[0_4px_15px_rgba(16,185,129,0.15)] cursor-pointer'
                  : isNext
                  ? 'bg-slate-900/90 border-cyan-500/70 hover:border-cyan-400 shadow-[0_4px_20px_rgba(6,182,212,0.25)] hover:scale-[1.02] cursor-pointer ring-2 ring-cyan-500/30'
                  : 'bg-slate-950/60 border-slate-800/80 opacity-60 cursor-not-allowed'
              }`}
            >
              {/* Card Corner Sector Number Badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl border ${
                    isCompleted 
                      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400' 
                      : isNext 
                      ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300' 
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    {getSectorIcon(sector.icon, isCompleted)}
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">
                      SETOR 0{sector.id}
                    </div>
                    <h4 className="text-sm font-bold text-white leading-tight">
                      {sector.name}
                    </h4>
                  </div>
                </div>

                {/* Status Pill */}
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    ONLINE
                  </span>
                ) : isNext ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-cyan-400" />
                    ALERTA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono bg-slate-900 text-slate-500 border border-slate-800 px-2 py-0.5 rounded-full">
                    <Lock className="w-3 h-3" />
                    BLOQUEADO
                  </span>
                )}
              </div>

              {/* Subtitle & Topic */}
              <div className="space-y-1.5 mb-4">
                <div className="text-xs font-semibold text-cyan-300">
                  {sector.subtitle}
                </div>
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {sector.theme}
                </p>
              </div>

              {/* Action Button Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-slate-400">
                  {sector.requiredQuestionsCount} Desafios Objetivos
                </span>

                {isCompleted ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                    Revisar <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                ) : isNext ? (
                  <span className="text-cyan-300 font-bold flex items-center gap-1 font-mono group-hover:translate-x-0.5 transition-transform">
                    <Play className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" /> Iniciar
                  </span>
                ) : (
                  <span className="text-slate-500 font-mono flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Bloqueado
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* GRAND FINALE CARD: SETOR 09 - DESAFIO ENEM */}
      <div 
        onClick={() => handleSectorClick(enemSector)}
        className={`relative rounded-3xl border-2 p-6 sm:p-7 overflow-hidden transition-all duration-300 select-none ${
          isEnemDone
            ? 'bg-gradient-to-r from-purple-950/90 via-slate-900/90 to-emerald-950/90 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.3)] cursor-pointer'
            : allStandardDone
            ? 'bg-gradient-to-r from-purple-950/90 via-indigo-950/90 to-slate-900/90 border-purple-400 shadow-[0_0_40px_rgba(168,85,247,0.4)] hover:scale-[1.01] cursor-pointer ring-2 ring-purple-400/50 animate-pulse'
            : 'bg-slate-950/70 border-purple-900/40 opacity-60 cursor-not-allowed'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
              isEnemDone
                ? 'bg-emerald-950 border-emerald-400 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                : allStandardDone
                ? 'bg-purple-950 border-purple-400 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.6)]'
                : 'bg-slate-900 border-slate-800 text-purple-400/40'
            }`}>
              <Crown className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-900/70 text-purple-300 border border-purple-500/40">
                  FASE FINAL ESPECIAL • 15 QUESTÕES
                </span>
                {isEnemDone ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-400 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> CAMPEÃO ENEM
                  </span>
                ) : allStandardDone ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono bg-purple-950 text-purple-200 border border-purple-400 px-2 py-0.5 rounded-full animate-bounce">
                    <Sparkles className="w-3 h-3 text-purple-300" /> DESBLOQUEADO!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono bg-slate-900 text-slate-500 border border-slate-800 px-2 py-0.5 rounded-full">
                    <Lock className="w-3 h-3" /> Conclua os 8 Setores
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                {enemSector.name}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                {enemSector.theme}
              </p>
            </div>
          </div>

          <div className="shrink-0 pt-2 sm:pt-0">
            {isEnemDone ? (
              <span className="px-6 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-mono font-extrabold text-xs sm:text-sm uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                <span>Revisar Desafio</span>
                <ChevronRight className="w-4 h-4" />
              </span>
            ) : allStandardDone ? (
              <span className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-slate-950 font-mono font-extrabold text-xs sm:text-sm uppercase flex items-center gap-2 shadow-[0_0_25px_rgba(168,85,247,0.5)]">
                <Play className="w-4 h-4 fill-slate-950" />
                <span>INICIAR DESAFIO ENEM</span>
              </span>
            ) : (
              <span className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 font-mono text-xs flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                <span>{8 - standardDoneCount} Setores Restantes</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
