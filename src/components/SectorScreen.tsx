import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SectorId, Question, SectorInfo } from '../types';
import { getSectorQuestions } from '../data/questions/index';
import { SECTORS } from '../data/sectors';
import { InteractiveCircuit } from './InteractiveCircuit';
import { TigraoMascot } from './TigraoMascot';
import { AstronautCalculator } from './AstronautCalculator';
import { checkAnswer } from '../utils/physics';
import { sound } from '../utils/audio';
import { tigraoVoice } from '../utils/tigraoVoice';
import confetti from 'canvas-confetti';
import { 
  Zap, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  HelpCircle, 
  RotateCcw,
  ShieldCheck,
  Flame,
  Award,
  Layers,
  Calculator,
  Heart,
  User,
  Clock,
  Pause,
  Play,
  Check,
  X,
  AlertTriangle,
  Table,
  Info
} from 'lucide-react';

interface SectorScreenProps {
  sectorId: SectorId;
  playerName: string;
  lives: number;
  onBackToMap: () => void;
  onSectorCompleted: (sectorId: SectorId) => void;
  onUpdateStats: (pointsDelta: number, isCorrect: boolean) => void;
  stationIntegrity: number;
  score: number;
  streak: number;
}

export const SectorScreen: React.FC<SectorScreenProps> = ({
  sectorId,
  playerName,
  lives,
  onBackToMap,
  onSectorCompleted,
  onUpdateStats,
  stationIntegrity,
  score,
  streak,
}) => {
  const sectorInfo = SECTORS.find((s) => s.id === sectorId) || SECTORS[0];
  const sectorQuestions = getSectorQuestions(sectorId);

  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<'answering' | 'verified_correct' | 'verified_wrong' | 'timeout'>('answering');
  const [hintVisible, setHintVisible] = useState<boolean>(false);
  const [usedHintOnCurrentQuestion, setUsedHintOnCurrentQuestion] = useState<boolean>(false);
  const [sectorDone, setSectorDone] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pointsEarned, setPointsEarned] = useState<number>(0);

  const currentQuestion: Question = sectorQuestions[questionIndex] || sectorQuestions[0];
  const questionTotalTime = currentQuestion?.timeSeconds || 45;
  const [timeLeft, setTimeLeft] = useState<number>(questionTotalTime);

  // Timer Ref for precise countdown
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset inputs, timer, and trigger Tigrão voice briefing
  useEffect(() => {
    setSelectedOptionId(null);
    setFeedbackState('answering');
    setHintVisible(false);
    setUsedHintOnCurrentQuestion(false);
    setIsPaused(false);
    setPointsEarned(0);
    setTimeLeft(currentQuestion?.timeSeconds || 45);

    // Initial Sector Briefing or question narrative
    const sectorIntroVoices: Record<SectorId, string> = {
      1: "Vamos começar pelo sistema de energia. Observe a tensão, a corrente e a resistência.",
      2: "Temos uma falha no laboratório. Use a Lei de Ohm para descobrir o que está acontecendo.",
      3: "Os resistores estão ligados em série. Preste atenção: a corrente se comporta de uma maneira muito importante nesse tipo de associação.",
      4: "Agora temos um circuito em paralelo. Observe como a corrente se divide pelos diferentes caminhos.",
      5: "Esse circuito é mais complicado. Temos uma associação mista. Vamos simplificar o circuito passo a passo.",
      6: "O sistema de propulsão está consumindo muita energia. Precisamos calcular a potência elétrica.",
      7: "O suporte de vida precisa de energia. Descubra quanto os equipamentos estão consumindo.",
      8: "Chegamos ao núcleo de energia! Esse será nosso maior desafio.",
      9: "Você chegou ao desafio final! Agora será necessário interpretar as situações e aplicar tudo o que aprendemos. Confio em você, astronauta!",
    };

    if (questionIndex === 0) {
      tigraoVoice.speak(sectorIntroVoices[sectorId] || currentQuestion.narrative);
    } else {
      tigraoVoice.speak(currentQuestion.narrative);
    }

    return () => {
      tigraoVoice.stop();
    };
  }, [questionIndex, sectorId, currentQuestion]);

  // Handle Timeout
  const handleTimeout = useCallback(() => {
    if (feedbackState !== 'answering') return;
    sound.playAlert();
    sound.playError();
    setFeedbackState('timeout');
    tigraoVoice.speak('Tempo esgotado! A oscilação na rede sobrecarregou o circuito. Veja a resolução detalhada e tente novamente!');
    onUpdateStats(0, false);
  }, [feedbackState, onUpdateStats]);

  // Timer Engine
  useEffect(() => {
    if (feedbackState !== 'answering' || isPaused || showCalculator || sectorDone) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        // Play subtle warning tick when under 6 seconds
        if (prev <= 6) {
          sound.playClick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [feedbackState, isPaused, showCalculator, sectorDone, handleTimeout]);

  const handleSelectOption = (optionId: string) => {
    if (feedbackState !== 'answering' || isPaused) return;
    sound.playClick();
    setSelectedOptionId(optionId);
  };

  const handleRequestHint = () => {
    if (feedbackState !== 'answering' || isPaused) return;
    sound.playClick();
    setHintVisible(true);
    setUsedHintOnCurrentQuestion(true);
    tigraoVoice.speak(`Aqui vai uma dica de ouro, astronauta: ${currentQuestion.tigraoHint}`);
  };

  const handleVerifyAnswer = () => {
    if (!selectedOptionId || feedbackState !== 'answering' || isPaused) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = checkAnswer(selectedOptionId, currentQuestion.correctAnswer);

    if (isCorrect) {
      sound.playSuccess();
      sound.playTigraoBark();
      setFeedbackState('verified_correct');

      // Calculate dynamic score with difficulty base, hint penalty, and time bonus
      const basePoints = currentQuestion.basePoints || 100;
      const hintMultiplier = usedHintOnCurrentQuestion ? 0.6 : 1.0;
      const timeBonus = Math.max(0, timeLeft * 2);
      const streakMultiplier = streak > 0 ? 1 + streak * 0.1 : 1.0;
      const calculatedPoints = Math.round((basePoints * hintMultiplier + timeBonus) * streakMultiplier);

      setPointsEarned(calculatedPoints);
      onUpdateStats(calculatedPoints, true);

      // Tigrão voice feedback
      const successPhrases = [
        "Excelente! O circuito está funcionando novamente!",
        "Muito bem, astronauta! Os valores conferem com precisão!",
        "Brilhante diagnóstico! A corrente elétrica foi estabilizada!",
      ];
      const randomSuccess = successPhrases[Math.floor(Math.random() * successPhrases.length)];
      tigraoVoice.speak(`${randomSuccess} Você faturou mais ${calculatedPoints} pontos!`);

      // Confetti burst
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.75 },
      });
    } else {
      sound.playError();
      setFeedbackState('verified_wrong');
      setPointsEarned(0);
      onUpdateStats(0, false);
      tigraoVoice.speak("Quase! Vamos analisar novamente o comportamento desse circuito. Revise a fórmula passo a passo!");
    }
  };

  const handleContinueNext = () => {
    sound.playClick();
    if (questionIndex + 1 < sectorQuestions.length) {
      setQuestionIndex(questionIndex + 1);
    } else {
      // Sector 100% Completed!
      sound.playPowerRestore();
      sound.playFanfare();
      setSectorDone(true);
      onSectorCompleted(sectorId);
      
      const victorySpeech = sectorId === 9
        ? 'EXTRAORDINÁRIO! Você venceu o Desafio ENEM e provou ser um mestre supremo da Eletrodinâmica! A Estação Orbital ARES-III está salva!'
        : 'Uau! Você dominou este setor com perfeição! Os instrumentos estabilizaram e a linha de energia voltou a brilhar!';
      tigraoVoice.speak(victorySpeech);

      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
      });
    }
  };

  const handleRetryQuestion = () => {
    sound.playClick();
    setSelectedOptionId(null);
    setFeedbackState('answering');
    setTimeLeft(currentQuestion?.timeSeconds || 45);
    tigraoVoice.speak(currentQuestion.narrative);
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'facil':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold font-mono bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            🟢 NÍVEL 1 — FÁCIL (120s)
          </span>
        );
      case 'medio':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold font-mono bg-amber-950/90 text-amber-300 border border-amber-500/50 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.2)]">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            🟡 NÍVEL 2 — MÉDIO (135s)
          </span>
        );
      case 'dificil':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold font-mono bg-rose-950/90 text-rose-300 border border-rose-500/50 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.2)]">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            🔴 NÍVEL 3 — DIFÍCIL (150s)
          </span>
        );
      case 'enem':
        return (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold font-mono bg-purple-950/90 text-purple-200 border border-purple-400/60 px-3.5 py-1 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.35)] animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            🟣 DESAFIO ENEM (180s-210s)
          </span>
        );
      default:
        return null;
    }
  };

  const timeRatio = timeLeft / questionTotalTime;
  const timerColorClass =
    timeRatio > 0.5
      ? 'text-cyan-400 bg-cyan-500 border-cyan-400'
      : timeRatio > 0.2
      ? 'text-amber-400 bg-amber-500 border-amber-400'
      : 'text-rose-400 bg-rose-500 border-rose-400 animate-pulse';

  return (
    <div id="sector-screen-container" className="w-full max-w-5xl mx-auto space-y-5">
      {/* Top Header Bar */}
      <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-[0_4px_25px_rgba(6,182,212,0.15)] flex flex-wrap items-center justify-between gap-4">
        {/* Left: Back button & Sector Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { sound.playClick(); onBackToMap(); }}
            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-cyan-500/30 text-cyan-400 transition-colors flex items-center gap-1 text-xs font-mono font-bold cursor-pointer"
            title="Retornar ao Mapa da Estação"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Mapa</span>
          </button>

          <div>
            <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
              {sectorId === 9 ? 'FASE FINAL ESPECIAL' : `Setor 0${sectorId}`} • {sectorInfo.subtitle}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
              {sectorInfo.name}
            </h2>
          </div>
        </div>

        {/* Right: Progress, Pause & Stats */}
        <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap">
          {/* Pause Button */}
          {feedbackState === 'answering' && (
            <button
              type="button"
              onClick={() => { sound.playClick(); setIsPaused(!isPaused); }}
              className={`p-2 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
                isPaused 
                  ? 'bg-amber-950 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]' 
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-cyan-400'
              }`}
              title="Pausar Desafio"
            >
              {isPaused ? <Play className="w-4 h-4 text-amber-400 fill-amber-400" /> : <Pause className="w-4 h-4 text-cyan-400" />}
              <span className="hidden md:inline">{isPaused ? 'Continuar' : 'Pausar'}</span>
            </button>
          )}

          {/* Astronaut Badge */}
          <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 text-xs font-mono text-cyan-300 font-bold">
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span>{playerName}</span>
          </div>

          {/* Lives (5 Hearts) */}
          <div className="bg-slate-950/80 border border-rose-500/40 px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5">
            <span className="text-[10px] text-rose-400 font-bold uppercase mr-0.5">Vidas:</span>
            {[1, 2, 3, 4, 5].map((heartIndex) => (
              <Heart
                key={heartIndex}
                className={`w-4 h-4 transition-all duration-300 ${
                  heartIndex <= lives
                    ? 'fill-rose-500 text-rose-400 scale-100 drop-shadow-[0_0_8px_rgba(244,63,94,0.7)] animate-pulse'
                    : 'fill-slate-800 text-slate-700 scale-90 opacity-40'
                }`}
              />
            ))}
          </div>

          {/* Question Step Indicator */}
          <div className="bg-slate-950/80 border border-cyan-500/30 px-3 py-1.5 rounded-xl font-mono text-xs text-center">
            <div className="text-[10px] text-cyan-400 font-bold uppercase">Questão</div>
            <div className="font-bold text-white">
              {questionIndex + 1} / {sectorQuestions.length}
            </div>
          </div>

          {/* Integrity */}
          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] text-slate-400">Integridade</div>
              <div className="font-bold text-emerald-300">{stationIntegrity}%</div>
            </div>
          </div>

          {/* Score & Streak */}
          <div className="bg-slate-950/80 border border-amber-500/30 px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] text-amber-400">Pontos</div>
              <div className="font-bold text-amber-200">{score} ({streak}x)</div>
            </div>
          </div>
        </div>
      </div>

      {/* PAUSE MODAL OVERLAY */}
      {isPaused && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-[0_0_50px_rgba(245,158,11,0.25)] animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-400 text-amber-400 mx-auto flex items-center justify-center">
              <Pause className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Missão Pausada</h3>
              <p className="text-xs sm:text-sm text-slate-300 font-mono">
                O cronômetro está congelado. Respire fundo, revise seus conceitos e retome o reparo do {sectorInfo.name}!
              </p>
            </div>

            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 text-xs font-mono space-y-1.5 text-left">
              <div className="text-cyan-400 font-bold uppercase">Status Atual:</div>
              <div className="text-slate-300">Astronauta: <span className="text-white font-bold">{playerName}</span></div>
              <div className="text-slate-300">Tempo Restante: <span className="text-amber-300 font-bold">{timeLeft}s</span></div>
              <div className="text-slate-300">Vidas Restantes: <span className="text-rose-400 font-bold">{lives} / 3</span></div>
              <div className="text-slate-300">Questão: <span className="text-cyan-300 font-bold">{questionIndex + 1} de {sectorQuestions.length}</span></div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => { sound.playClick(); setIsPaused(false); }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-mono font-bold text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Continuar Desafio</span>
              </button>

              <button
                type="button"
                onClick={() => { sound.playClick(); onBackToMap(); }}
                className="w-full py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono font-medium text-xs uppercase cursor-pointer"
              >
                Voltar ao Mapa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* If Sector is fully completed celebration banner */}
      {sectorDone ? (
        <div className="bg-slate-900/90 border border-emerald-500/60 rounded-3xl p-6 sm:p-8 text-center space-y-5 backdrop-blur-md shadow-[0_0_50px_rgba(16,185,129,0.2)]">
          <div className="w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-400 text-emerald-400 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
              {sectorId === 9 ? '🏆 FASE FINAL CONCLUÍDA!' : `Setor 0${sectorId} 100% Restaurado!`}
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              {sectorInfo.name} Está Online!
            </h3>
            <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              {sectorInfo.successNarrative}
            </p>
          </div>

          {/* Tigrão Celebrating */}
          <div className="max-w-md mx-auto">
            <TigraoMascot
              mood="celebrating"
              speech={
                sectorId === 9
                  ? 'EXTRAORDINÁRIO! Você venceu o Desafio ENEM e provou ser um mestre supremo da Eletrodinâmica! A Estação Orbital ARES-III está salva!'
                  : 'Uau! Você dominou este setor com perfeição! Os instrumentos estabilizaram e a linha de energia voltou a brilhar!'
              }
              size="md"
            />
          </div>

          {/* Navigation Button */}
          <div className="pt-4 flex justify-center">
            <button
              type="button"
              onClick={() => { sound.playClick(); onBackToMap(); }}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-sm sm:text-base font-mono tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all transform hover:scale-105 cursor-pointer flex items-center gap-2"
            >
              <span>RETORNAR AO MAPA DA ESTAÇÃO</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        /* Active Question Layout */
        <div className="space-y-5">
          {/* Individual Question Timer Visual Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${timeRatio <= 0.2 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`} />
                <span className="text-slate-300 font-semibold uppercase">Tempo do Desafio:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-base font-extrabold font-mono ${timeRatio <= 0.2 ? 'text-rose-400 font-black animate-pulse' : timeRatio <= 0.5 ? 'text-amber-400' : 'text-cyan-300'}`}>
                  {timeLeft}s
                </span>
                <span className="text-slate-500 text-[11px]">/ {questionTotalTime}s</span>
              </div>
            </div>

            {/* Glowing Progress Track */}
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
              <div
                className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                  timeRatio > 0.5
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                    : timeRatio > 0.2
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                    : 'bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, (timeLeft / questionTotalTime) * 100))}%` }}
              />
            </div>
          </div>

          {/* Tigrão Companion & Narrative */}
          <div className="bg-slate-900/60 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur-sm">
            <TigraoMascot
              mood={
                feedbackState === 'verified_correct' 
                  ? 'happy' 
                  : feedbackState === 'verified_wrong' || feedbackState === 'timeout'
                  ? 'alert' 
                  : 'thinking'
              }
              speech={
                feedbackState === 'verified_correct'
                  ? `Excelente diagnóstico! As medições bateram com exatidão e você faturou +${pointsEarned} pontos!`
                  : feedbackState === 'timeout'
                  ? 'Tempo esgotado! A oscilação na rede sobrecarregou o nó de dados. Veja a resolução física detalhada e tente novamente!'
                  : feedbackState === 'verified_wrong'
                  ? 'Hum, parece que a corrente ou a tensão oscilou. Veja a explicação passo a passo e tente novamente!'
                  : `${currentQuestion.narrative}`
              }
              hintText={hintVisible ? currentQuestion.tigraoHint : undefined}
              onHintClick={handleRequestHint}
              showHintButton={!hintVisible && feedbackState === 'answering'}
              size="md"
            />
          </div>

          {/* Interactive Circuit Schematic Visualizer & Floating Tools Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Bancada de Diagnóstico & Circuito</span>
              </span>
              <button
                type="button"
                onClick={() => { sound.playClick(); setShowCalculator(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] cursor-pointer"
                title="Abrir Calculadora Científica e Formulário do Astronauta"
              >
                <Calculator className="w-3.5 h-3.5 text-cyan-400" />
                <span>Calculadora & Fórmulas</span>
              </button>
            </div>

            <InteractiveCircuit
              config={currentQuestion.circuitConfig}
              isEnergized={feedbackState === 'verified_correct'}
            />
          </div>

          {/* Context Data Chips (if available) */}
          {currentQuestion.contextData && currentQuestion.contextData.length > 0 && (
            <div className="bg-slate-900/60 border border-cyan-500/20 rounded-xl p-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase mr-1 flex items-center gap-1">
                <Info className="w-3 h-3 text-cyan-400" />
                Dados do Problema:
              </span>
              {currentQuestion.contextData.map((d, i) => (
                <div key={i} className="px-2.5 py-1 rounded-lg bg-slate-950 border border-cyan-500/30 text-xs font-mono flex items-center gap-1.5">
                  <span className="text-slate-400">{d.label}:</span>
                  <span className="text-cyan-300 font-bold">{d.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Table Data (if available for ENEM/analytical questions) */}
          {currentQuestion.tableData && (
            <div className="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-4 overflow-x-auto space-y-2">
              <div className="text-xs font-mono text-cyan-300 font-bold flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tabela de Telemetria Técnica:</span>
              </div>
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80">
                    {currentQuestion.tableData.headers.map((h, hi) => (
                      <th key={hi} className="py-2 px-3 text-cyan-400 font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {currentQuestion.tableData.rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-slate-800/40">
                      {row.map((cell, ci) => (
                        <td key={ci} className="py-2 px-3 text-slate-300 font-medium">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Question Prompt Card */}
          <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-[0_4px_25px_rgba(6,182,212,0.1)] space-y-4">
            {/* Question Top Tags */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {getDifficultyBadge(currentQuestion.difficulty)}
                <span className="text-xs font-mono text-cyan-400 font-semibold">
                  Tópico: {currentQuestion.topic}
                </span>
              </div>

              <div className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>{currentQuestion.title}</span>
              </div>
            </div>

            {/* Question Text */}
            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
              {currentQuestion.question}
            </h3>

            {/* 5-Alternative Objective Options (A, B, C, D, E) */}
            <div className="grid grid-cols-1 gap-2.5 pt-2">
              {currentQuestion.options?.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                const isCorrectAnswer = opt.id === currentQuestion.correctAnswer;
                const isVerifiedCorrect = feedbackState === 'verified_correct' && isSelected;
                const isVerifiedWrong = feedbackState === 'verified_wrong' && isSelected;
                const isRevealedCorrect = (feedbackState === 'verified_wrong' || feedbackState === 'timeout') && isCorrectAnswer;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={feedbackState !== 'answering'}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all text-xs sm:text-sm flex items-start gap-3 cursor-pointer ${
                      isVerifiedCorrect
                        ? 'bg-emerald-950/90 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] ring-2 ring-emerald-400'
                        : isVerifiedWrong
                        ? 'bg-red-950/90 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] ring-2 ring-red-500'
                        : isRevealedCorrect
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/60'
                        : isSelected
                        ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-2 ring-cyan-400/50'
                        : 'bg-slate-950/70 border-slate-800 text-slate-200 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 border transition-all ${
                      isVerifiedCorrect || isRevealedCorrect
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : isVerifiedWrong
                        ? 'bg-red-600 text-white border-red-400'
                        : isSelected 
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400' 
                        : 'bg-slate-900 text-cyan-400 border-slate-700'
                    }`}>
                      {isVerifiedCorrect || isRevealedCorrect ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : isVerifiedWrong ? (
                        <X className="w-4 h-4 stroke-[3]" />
                      ) : (
                        opt.id
                      )}
                    </span>
                    <span className="leading-relaxed flex-1 pt-0.5 font-medium">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons Section */}
            <div className="pt-4 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400 font-mono">
                {feedbackState === 'answering' ? (
                  selectedOptionId ? (
                    <span className="text-cyan-300 font-semibold">Alternativa {selectedOptionId} selecionada. Clique em confirmar.</span>
                  ) : (
                    <span>Selecione uma alternativa (A, B, C, D ou E) para responder.</span>
                  )
                ) : feedbackState === 'verified_correct' ? (
                  <span className="text-emerald-300 font-semibold">Correto! +{pointsEarned} pontos creditados.</span>
                ) : feedbackState === 'timeout' ? (
                  <span className="text-rose-400 font-semibold">O tempo expirou. Revise a explicação e tente novamente.</span>
                ) : (
                  <span className="text-rose-400 font-semibold">Resposta incorreta (-1 vida). Revise o passo a passo.</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {feedbackState === 'answering' ? (
                  <button
                    type="button"
                    disabled={!selectedOptionId}
                    onClick={handleVerifyAnswer}
                    className={`px-6 py-3 rounded-xl font-mono font-bold text-xs sm:text-sm tracking-wider uppercase transition-all shadow flex items-center gap-2 ${
                      selectedOptionId
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer transform hover:scale-105'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>CONFIRMAR RESPOSTA</span>
                  </button>
                ) : feedbackState === 'verified_correct' ? (
                  <button
                    type="button"
                    onClick={handleContinueNext}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-mono font-bold text-xs sm:text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2 cursor-pointer transform hover:scale-105"
                  >
                    <span>CONTINUAR MISSÃO</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRetryQuestion}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-mono font-bold text-xs sm:text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center gap-2 cursor-pointer transform hover:scale-105"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>TENTAR NOVAMENTE</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Pedagogical Step-by-Step Resolution Feedback Card */}
          {feedbackState !== 'answering' && (
            <div className={`p-5 sm:p-6 rounded-2xl border backdrop-blur-md space-y-3 transition-all ${
              feedbackState === 'verified_correct'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
                : 'bg-red-950/40 border-red-500/50 text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.15)]'
            }`}>
              <div className="flex items-center gap-2 text-sm font-bold font-mono">
                {feedbackState === 'verified_correct' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-300">DIAGNÓSTICO EXATO! CIRCUITO RESTABELECIDO!</span>
                  </>
                ) : feedbackState === 'timeout' ? (
                  <>
                    <Clock className="w-5 h-5 text-rose-400 animate-pulse" />
                    <span className="text-rose-300">TEMPO ESGOTADO! REVISE O PROCEDIMENTO ABAIXO:</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-300">TENSÃO OSCILANDO! RESPOSTA CORRETA: ALTERNATIVA {currentQuestion.correctAnswer}</span>
                  </>
                )}
              </div>

              {/* Step-by-step Physics Breakdown */}
              <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Resolução Física Passo a Passo:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-slate-300">
                  <div>
                    <span className="text-slate-400">1. Fórmula Fundamental:</span>{' '}
                    <span className="text-amber-300 font-bold">{currentQuestion.detailedExplanation.formula}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">2. Substituição dos Dados:</span>{' '}
                    <span className="text-cyan-200">{currentQuestion.detailedExplanation.substitution}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">3. Cálculo Numérico:</span>{' '}
                    <span className="text-emerald-300 font-bold">{currentQuestion.detailedExplanation.calculation} {currentQuestion.detailedExplanation.unit}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">4. Conclusão Conceitual:</span>{' '}
                    <span className="text-slate-200">{currentQuestion.detailedExplanation.conclusion}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Astronaut Calculator Modal */}
      {showCalculator && (
        <AstronautCalculator onClose={() => setShowCalculator(false)} />
      )}
    </div>
  );
};
