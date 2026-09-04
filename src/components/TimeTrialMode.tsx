import React, { useState, useEffect, useRef } from 'react';
import { 
  EmergencyMission, 
  EmergencyDifficulty 
} from '../types';
import { EMERGENCY_MISSIONS } from '../data/emergencyMissions';
import { 
  calculateMissionScore, 
  ScoreCalculationResult, 
  getTimeTrialProgress, 
  saveTimeTrialProgress 
} from '../services/gamificationService';
import { diagnoseErrorType } from '../utils/circuitCalculations';
import { MissionTimer } from './MissionTimer';
import { ComboDisplay } from './ComboDisplay';
import { InteractiveCircuitDiagram } from './InteractiveCircuitDiagram';
import { StepByStepSolution } from './StepByStepSolution';
import { TigraoMascot } from './TigraoMascot';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { gameClient, EmergencySubmissionResult } from '../utils/gameClient';
import { 
  AlertTriangle, 
  ArrowLeft, 
  Zap, 
  ShieldAlert, 
  CheckCircle2, 
  Flame, 
  Trophy, 
  Clock, 
  Sparkles, 
  RotateCcw, 
  Play, 
  Lock, 
  Award,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

interface TimeTrialModeProps {
  playerName: string;
  lives: number;
  onBackToMap: () => void;
  onUpdateStats?: (
    pointsDelta: number,
    isCorrect: boolean,
    authoritativeLives?: number,
    authoritativeTotalScore?: number
  ) => void;
}

export const TimeTrialMode: React.FC<TimeTrialModeProps> = ({
  playerName,
  lives: globalLives,
  onBackToMap,
  onUpdateStats,
}) => {
  // Screen sub-state: 'list' | 'briefing' | 'active' | 'success' | 'failed'
  const [viewState, setViewState] = useState<'list' | 'briefing' | 'active' | 'success' | 'failed'>('list');
  const [selectedMission, setSelectedMission] = useState<EmergencyMission>(EMERGENCY_MISSIONS[0]);
  const [timeRemaining, setTimeRemaining] = useState<number>(90);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [combo, setCombo] = useState<number>(0);
  const [scoreResult, setScoreResult] = useState<ScoreCalculationResult | null>(null);
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [revealedHintIndex, setRevealedHintIndex] = useState<number>(-1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [completedMissions, setCompletedMissions] = useState<string[]>(() => getTimeTrialProgress().completedMissionIds);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);

  // Timer loop when in active mission
  useEffect(() => {
    if (viewState !== 'active' || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [viewState, isPaused]);

  // Launch a mission
  const handleSelectMission = (mission: EmergencyMission) => {
    sound.playClick();
    setSelectedMission(mission);
    setTimeRemaining(mission.timeLimit);
    setSelectedOptionId(null);
    setShowSolution(false);
    setRevealedHintIndex(-1);
    setCurrentAttemptId(null);
    setViewState('briefing');
  };

  const handleStartMission = async () => {
    sound.playMissionStart();
    setTimeRemaining(selectedMission.timeLimit);
    setSelectedOptionId(null);
    setShowSolution(false);
    setRevealedHintIndex(-1);
    setViewState('active');

    try {
      const att = await gameClient.startEmergencyMission(selectedMission.id, playerName);
      setCurrentAttemptId(att.attemptId);
    } catch {
      // Local fallback handled internally by gameClient
    }
  };

  // Timeout handler
  const handleTimeout = async () => {
    sound.playAlert();
    setCombo(0);
    setShowSolution(true);
    setViewState('failed');

    if (currentAttemptId) {
      try {
        const result = await gameClient.submitEmergencyMission({
          attemptId: currentAttemptId,
          selectedOptionId: 'TIMEOUT',
          uid: playerName,
          comboCount: 0,
        });
        if (onUpdateStats) {
          onUpdateStats(0, false, result.livesRemaining, result.totalScore);
        }
        return;
      } catch {
        // Fallback below
      }
    }
    if (onUpdateStats) onUpdateStats(0, false);
  };

  // Submit student option (Authoritative verification)
  const handleSubmitAnswer = async () => {
    if (!selectedOptionId || viewState !== 'active' || isSubmitting) return;

    const chosenOption = selectedMission.options.find((o) => o.id === selectedOptionId);
    if (!chosenOption) return;

    setIsSubmitting(true);
    try {
      let result: EmergencySubmissionResult;
      if (currentAttemptId) {
        result = await gameClient.submitEmergencyMission({
          attemptId: currentAttemptId,
          selectedOptionId,
          uid: playerName,
          comboCount: combo,
          clientTimeLeft: timeRemaining,
        });
      } else {
        const att = await gameClient.startEmergencyMission(selectedMission.id, playerName);
        result = await gameClient.submitEmergencyMission({
          attemptId: att.attemptId,
          selectedOptionId,
          uid: playerName,
          comboCount: combo,
          clientTimeLeft: timeRemaining,
        });
      }

      if (result.isCorrect && result.scoreResult) {
        const nextCombo = combo + 1;
        setCombo(nextCombo);
        setScoreResult(result.scoreResult);

        sound.playSuccess();
        if (result.scoreResult.speedBonus.tier === 'supersonic' || result.scoreResult.speedBonus.tier === 'fast') {
          setTimeout(() => sound.playSpeedBonus(), 300);
        }
        if (nextCombo >= 2) {
          setTimeout(() => sound.playCombo(nextCombo), 600);
        }

        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#06b6d4', '#38bdf8', '#fbbf24', '#34d399'],
          });
        } catch {
          // ignore
        }

        saveTimeTrialProgress(selectedMission.id, result.scoreResult.totalXP, timeRemaining, nextCombo);
        setCompletedMissions((prev) => Array.from(new Set([...prev, selectedMission.id])));

        if (onUpdateStats) {
          onUpdateStats(result.scoreResult.totalXP, true, result.livesRemaining, result.totalScore);
        }

        setViewState('success');
      } else {
        sound.playError();
        setCombo(0);
        if (onUpdateStats) {
          onUpdateStats(0, false, result.livesRemaining, result.totalScore);
        }
        setShowSolution(true);
        setViewState('failed');
      }
    } catch {
      sound.playError();
      setCombo(0);
      if (onUpdateStats) onUpdateStats(0, false);
      setShowSolution(true);
      setViewState('failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reveal hint
  const handleRevealHint = () => {
    sound.playClick();
    if (revealedHintIndex < (selectedMission.hints?.length || 0) - 1) {
      setRevealedHintIndex((prev) => prev + 1);
    }
  };

  // Advance to next mission
  const handleNextMission = () => {
    const currentIndex = EMERGENCY_MISSIONS.findIndex((m) => m.id === selectedMission.id);
    const nextMission = EMERGENCY_MISSIONS[(currentIndex + 1) % EMERGENCY_MISSIONS.length];
    handleSelectMission(nextMission);
  };

  // Get difficulty badge styles
  const getDifficultyBadge = (diff: EmergencyDifficulty) => {
    switch (diff) {
      case 'recruta':
        return 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300';
      case 'engenheiro':
        return 'bg-sky-950/80 border-sky-500/50 text-sky-300';
      case 'especialista':
        return 'bg-purple-950/80 border-purple-500/50 text-purple-300';
      case 'comandante':
        return 'bg-rose-950/80 border-rose-500/50 text-rose-300';
      case 'enem':
        return 'bg-amber-950/80 border-amber-500/50 text-amber-300';
      default:
        return 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300';
    }
  };

  // Diagnostic error helper for step-by-step resolution
  const chosenOption = selectedMission.options.find((o) => o.id === selectedOptionId);
  const errorDiagnosis = chosenOption
    ? diagnoseErrorType(chosenOption.value, selectedMission.objective.expectedValue, {
        voltage: selectedMission.voltage,
        resistors: selectedMission.circuit.resistors,
        config: selectedMission.circuit.configuration,
        targetType: selectedMission.objective.type === 'calculate_current' ? 'current' : selectedMission.objective.type === 'calculate_voltage' ? 'voltage' : selectedMission.objective.type === 'calculate_resistance' ? 'resistance' : 'power',
      })
    : { type: 'interpretation' as const, explanation: 'Tempo limite esgotado antes da resposta.' };

  return (
    <div
      id="time-trial-container"
      className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in text-slate-100"
    >
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { sound.playClick(); onBackToMap(); }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Mapa</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
            <div>
              <h1 className="text-base sm:text-lg font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
                DESAFIO CONTRARRELÓGIO
              </h1>
              <span className="text-[11px] font-mono text-slate-400">
                Missões de Emergência na Estação Espacial ARES-III
              </span>
            </div>
          </div>
        </div>

        {/* Global Progress & Combo Status */}
        <div className="flex items-center gap-3">
          <ComboDisplay combo={combo} />
          <div className="px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>{completedMissions.length} / {EMERGENCY_MISSIONS.length} Concluídas</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. MISSION SELECTION GRID (VIEW STATE: 'list') */}
      {/* ============================================================ */}
      {viewState === 'list' && (
        <div className="space-y-5">
          <div className="bg-slate-900/60 border border-cyan-500/30 rounded-3xl p-6 backdrop-blur-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold font-mono text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-cyan-400" />
                  <span>Painel de Emergências da Estação</span>
                </h2>
                <p className="text-xs text-slate-300 max-w-xl pt-1">
                  Responda com agilidade para estabilizar as falhas e garantir bônus hipersônico de XP! Erros acionam o protocolo pedagógico de resolução passo a passo com Tigrão.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 bg-slate-950/80 px-3 py-2 rounded-xl border border-cyan-500/20">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Bônus de Velocidade: até +200 XP</span>
              </div>
            </div>

            {/* Mission Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
              {EMERGENCY_MISSIONS.map((m, idx) => {
                const isCompleted = completedMissions.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMission(m)}
                    className={`relative p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between gap-3 ${
                      isCompleted
                        ? 'bg-slate-900/70 border-emerald-500/40 hover:border-emerald-400 hover:bg-slate-900/90'
                        : 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-2">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${getDifficultyBadge(
                            m.difficulty
                          )}`}
                        >
                          {m.difficultyLabel}
                        </span>

                        <div className="flex items-center gap-1 text-xs font-mono text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{m.timeLimit}s</span>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold font-mono text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                        {isCompleted && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        <span>{m.title}</span>
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 pt-1">
                        {m.narrative}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-mono">
                      <span className="text-cyan-400">
                        {m.subsystem}
                      </span>
                      <span className="text-amber-300 font-bold flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        +{m.reward.xp} XP
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. MISSION BRIEFING (VIEW STATE: 'briefing') */}
      {/* ============================================================ */}
      {viewState === 'briefing' && (
        <div className="bg-slate-900/90 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-6 shadow-[0_0_40px_rgba(6,182,212,0.2)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono font-bold uppercase px-3 py-1 rounded-full border ${getDifficultyBadge(
                  selectedMission.difficulty
                )}`}
              >
                {selectedMission.difficultyLabel}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Tempo Limite: <strong className="text-cyan-300">{selectedMission.timeLimit} segundos</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => { sound.playClick(); setViewState('list'); }}
              className="text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              ← Selecionar Outra Missão
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-mono text-xs uppercase font-bold tracking-wider">
              <AlertTriangle className="w-4 h-4 animate-bounce" />
              <span>SUBSISTEMA EM ALERTA CRÍTICO: {selectedMission.subsystem}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-mono text-white">
              {selectedMission.title}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              {selectedMission.narrative}
            </p>
          </div>

          {/* Interactive Circuit Preview */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase font-bold text-cyan-400 block">
              DIAGRAMA PRELIMINAR DE ENGENHARIA:
            </span>
            <InteractiveCircuitDiagram circuit={selectedMission.circuit} interactive={false} />
          </div>

          {/* Tigrao Briefing Voice */}
          <TigraoMascot
            mood="thinking"
            speech={`Atenção, Astronauta ${playerName}! Temos apenas ${selectedMission.timeLimit} segundos antes do desligamento térmico. Respire fundo, verifique o diagrama e calcule a grandeza com precisão!`}
            size="md"
          />

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => { sound.playClick(); setViewState('list'); }}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleStartMission}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black font-mono text-sm uppercase tracking-wider transition-all shadow-[0_0_30px_rgba(245,158,11,0.5)] cursor-pointer flex items-center justify-center gap-2 transform hover:scale-[1.02]"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>INICIAR DESAFIO CONTRARRELÓGIO</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. ACTIVE MISSION WORKSPACE (VIEW STATE: 'active') */}
      {/* ============================================================ */}
      {viewState === 'active' && (
        <div className="space-y-5">
          {/* Top Live Mission HUD */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Subsistema Ativo:</span>
                <span className="text-xs font-mono font-bold text-cyan-300 line-clamp-1">{selectedMission.subsystem}</span>
              </div>
            </div>

            <div className="flex justify-center">
              <MissionTimer
                timeRemaining={timeRemaining}
                totalTime={selectedMission.timeLimit}
                isPaused={isPaused}
              />
            </div>

            <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-3.5 flex items-center justify-between sm:justify-end gap-3">
              <ComboDisplay combo={combo} />
              <div className="text-right font-mono">
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Recompensa Base:</span>
                <span className="text-xs font-bold text-amber-300">+{selectedMission.reward.xp} XP</span>
              </div>
            </div>
          </div>

          {/* Main 2-Column Split Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Interactive Diagram & Narrative (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <InteractiveCircuitDiagram circuit={selectedMission.circuit} interactive={true} />

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold tracking-wider block">
                  RELATÓRIO DO SENSOR:
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {selectedMission.narrative}
                </p>
              </div>

              {/* Hints Drawer */}
              {selectedMission.hints && selectedMission.hints.length > 0 && (
                <div className="bg-slate-950 border border-cyan-500/20 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Dicas do Mascote Tigrão ({revealedHintIndex + 1}/{selectedMission.hints.length})</span>
                    </span>
                    {revealedHintIndex < selectedMission.hints.length - 1 && (
                      <button
                        type="button"
                        onClick={handleRevealHint}
                        className="px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 cursor-pointer"
                      >
                        + Revelar Dica
                      </button>
                    )}
                  </div>
                  {revealedHintIndex >= 0 && (
                    <div className="text-xs font-mono text-cyan-200 bg-cyan-950/40 p-2.5 rounded-xl border border-cyan-500/30 animate-fade-in">
                      💡 {selectedMission.hints[revealedHintIndex]}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Problem Objective & Options (5 cols) */}
            <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
              <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-5 space-y-4 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
                {/* Objective Command Box */}
                <div className="space-y-2 border-b border-slate-800 pb-3">
                  <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>OBJETIVO DA OPERAÇÃO:</span>
                  </span>
                  <div className="text-sm font-bold font-mono text-white leading-relaxed">
                    {selectedMission.objective.promptText}
                  </div>
                </div>

                {/* Multiple-Choice Options */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    SELECIONE O DIAGNÓSTICO CORRETO:
                  </span>

                  {selectedMission.options.map((opt) => {
                    const isSelected = selectedOptionId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setSelectedOptionId(opt.id);
                        }}
                        className={`w-full p-3.5 rounded-xl border text-left font-mono transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-cyan-950 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-[1.01]'
                            : 'bg-slate-950/80 hover:bg-slate-850 border-slate-800 text-slate-200 hover:border-cyan-500/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                              isSelected
                                ? 'bg-cyan-400 text-slate-950'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {opt.id}
                          </span>
                          <span className="text-xs sm:text-sm font-bold">{opt.label}</span>
                        </div>

                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-cyan-400 bg-cyan-400/20' : 'border-slate-700'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Submit Action */}
                <button
                  type="button"
                  onClick={handleSubmitAnswer}
                  disabled={!selectedOptionId}
                  className={`w-full py-4 rounded-2xl font-black font-mono text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    selectedOptionId
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.5)] cursor-pointer transform hover:scale-[1.01]'
                      : 'bg-slate-850 border border-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>CONFIRMAR E RECALIBRAR CIRCUITO</span>
                </button>
              </div>

              {/* Mascot Live Encouragement */}
              <TigraoMascot
                mood="happy"
                speech="Verifique os nós e ramos no diagrama ao lado. Você tem tudo o que precisa para acertar!"
                size="sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. SUCCESS SCREEN (VIEW STATE: 'success') */}
      {/* ============================================================ */}
      {viewState === 'success' && scoreResult && (
        <div className="bg-slate-900/90 border border-emerald-500/50 rounded-3xl p-6 sm:p-10 backdrop-blur-md space-y-6 shadow-[0_0_50px_rgba(16,185,129,0.3)] text-center max-w-2xl mx-auto animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.5)]">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-bounce" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
              ⚡ CIRCUITO ESTABILIZADO COM SUCESSO!
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-mono text-white">
              {selectedMission.subsystem} ONLINE!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-sans max-w-md mx-auto">
              A corrente elétrica e a d.d.p. foram recalculadas com perfeição. O subsistema voltou à integridade máxima de 100%!
            </p>
          </div>

          {/* Station Repair Bar Animation */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-300 font-bold">
              <span>STATUS DO BARRAMENTO:</span>
              <span>100% OPERACIONAL</span>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-emerald-500/40">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-pulse w-full" />
            </div>
          </div>

          {/* Score & Bonus Breakdown */}
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">XP Base:</span>
              <span className="text-sm font-bold text-white">+{scoreResult.baseXP}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Bônus Velocidade:</span>
              <span className="text-sm font-bold text-cyan-300">+{scoreResult.speedBonus.bonusXP}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Multiplicador:</span>
              <span className="text-sm font-bold text-amber-300">{scoreResult.comboMultiplier}x</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Total Conquistado:</span>
              <span className="text-base font-black text-emerald-300">+{scoreResult.totalXP} XP</span>
            </div>
          </div>

          <TigraoMascot
            mood="happy"
            speech={`Incrível, Astronauta ${playerName}! Você calculou tudo antes do tempo limite. Nosso gerador está 100% verde!`}
            size="md"
          />

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => { sound.playClick(); setViewState('list'); }}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold cursor-pointer"
            >
              Lista de Emergências
            </button>
            <button
              type="button"
              onClick={handleNextMission}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black font-mono text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2"
            >
              <span>Próxima Emergência</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. FAILED / TIMEOUT SCREEN (VIEW STATE: 'failed') */}
      {/* ============================================================ */}
      {viewState === 'failed' && (
        <div className="space-y-6">
          {showSolution ? (
            <StepByStepSolution
              studentAnswer={chosenOption?.label || 'Nenhuma (Tempo esgotado)'}
              correctAnswer={`${selectedMission.objective.expectedValue} ${selectedMission.objective.unit}`}
              explanation={selectedMission.solutionSteps}
              circuit={selectedMission.circuit}
              errorType={errorDiagnosis.type}
              errorExplanation={chosenOption?.distractorReason || errorDiagnosis.explanation}
              onContinue={() => {
                setShowSolution(false);
                setViewState('briefing');
              }}
            />
          ) : (
            <div className="bg-slate-900/90 border border-rose-500/50 rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-6 text-center max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-full bg-rose-950 border border-rose-500/50 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-rose-400 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black font-mono text-rose-300">
                  FALHA NO DIAGNÓSTICO DO CIRCUITO
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-sans">
                  A resposta fornecida não estabilizou os componentes elétricos da estação a tempo. Mas não desanime: cada erro é uma oportunidade de aprender Física!
                </p>
              </div>

              <TigraoMascot
                mood="worried"
                speech="Não se preocupe, Astronauta! Vamos abrir a resolução comentada passo a passo para você ver exatamente onde esteve o detalhe do cálculo."
                size="md"
              />

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSolution(true)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black font-mono text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                >
                  VER RESOLUÇÃO PASSO A PASSO
                </button>
                <button
                  type="button"
                  onClick={() => { sound.playClick(); setViewState('briefing'); }}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tentar Novamente</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
