import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SectorId, Question, QuestionOption, DetailedExplanation } from '../types';
import { getSectorQuestions } from '../data/questions/index';
import { SECTORS } from '../data/sectors';
import { InteractiveCircuit } from './InteractiveCircuit';
import { TigraoAssistant } from './TigraoAssistant';
import { AstronautCalculator } from './AstronautCalculator';
import { sound } from '../utils/audio';
import { tigraoVoice } from '../utils/tigraoVoice';
import { gameClient } from '../utils/gameClient';
import { telemetry } from '../utils/telemetry';
import { randomizeQuestionOptions } from '../utils/circuitCalculations';
import { QUESTION_TIERED_HINTS, getTieredHintsForQuestion } from '../data/hintsData';
import { StepByStepSolution } from './StepByStepSolution';
import confetti from 'canvas-confetti';
import { 
  Zap, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  RotateCcw,
  ShieldCheck,
  Flame,
  Calculator,
  Heart,
  User,
  Clock,
  Pause,
  Play,
  Check,
  X,
  Eye,
  Table,
  HelpCircle,
  BookOpen
} from 'lucide-react';

interface DisplayOption {
  visualLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  originalOptionId: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
}

interface SectorScreenProps {
  sectorId: SectorId;
  playerName: string;
  lives: number;
  onBackToMap: () => void;
  onSectorCompleted: (sectorId: SectorId) => void;
  onUpdateStats: (
    pointsDelta: number,
    isCorrect: boolean,
    authoritativeLives?: number,
    authoritativeTotalScore?: number
  ) => void;
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
  const [showDetailedSolution, setShowDetailedSolution] = useState<boolean>(false);
  const [usedHintLevel, setUsedHintLevel] = useState<0 | 1 | 2 | 3>(0);
  const [sectorDone, setSectorDone] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pauseDurationSeconds, setPauseDurationSeconds] = useState<number>(0);
  const [pointsEarned, setPointsEarned] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Authoritative attempt state
  const [currentAttemptId, setCurrentAttemptId] = useState<string>('');
  const [authoritativeDeadline, setAuthoritativeDeadline] = useState<number>(0);
  const [serverExplanation, setServerExplanation] = useState<DetailedExplanation | null>(null);
  const [serverFeedbackMessage, setServerFeedbackMessage] = useState<string>('');

  const currentQuestion: Question = sectorQuestions[questionIndex] || sectorQuestions[0];
  const questionTotalTime = currentQuestion?.timeSeconds || 120;
  const [timeLeft, setTimeLeft] = useState<number>(questionTotalTime);

  // Randomized options for current attempt (Fisher-Yates)
  const [displayOptions, setDisplayOptions] = useState<DisplayOption[]>([]);

  // Timer Ref for countdown
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Tiered hints for current question
  const currentTieredHints = useMemo(() => {
    return (
      QUESTION_TIERED_HINTS[currentQuestion.id] ||
      getTieredHintsForQuestion(currentQuestion.topic, currentQuestion.tigraoHint)
    );
  }, [currentQuestion.id, currentQuestion.topic, currentQuestion.tigraoHint]);

  // Start question attempt on server and randomize options
  const initializeQuestionAttempt = useCallback(async () => {
    try {
      const { attempt, questionPublic } = await gameClient.startQuestion(
        currentQuestion.id,
        sectorId,
        playerName
      );
      setCurrentAttemptId(attempt.attemptId);
      setAuthoritativeDeadline(attempt.deadlineAt);

      // Randomize options visually with Fisher-Yates
      const shuffled = randomizeQuestionOptions(questionPublic.options);
      const letters: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
      const mapped: DisplayOption[] = shuffled.map((opt, idx) => ({
        visualLetter: letters[idx],
        originalOptionId: opt.id as 'A' | 'B' | 'C' | 'D' | 'E',
        text: opt.text,
      }));
      setDisplayOptions(mapped);

      telemetry.logEvent('question_started', {
        attemptId: attempt.attemptId,
        questionId: currentQuestion.id,
        sectorId,
      });
    } catch {
      // Fallback display mapping
      const letters: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
      setDisplayOptions(
        currentQuestion.options.map((opt, idx) => ({
          visualLetter: letters[idx],
          originalOptionId: opt.id,
          text: opt.text,
        }))
      );
    }
  }, [currentQuestion, sectorId, playerName]);

  // Reset inputs and start attempt on question change
  useEffect(() => {
    setSelectedOptionId(null);
    setFeedbackState('answering');
    setShowDetailedSolution(false);
    setUsedHintLevel(0);
    setIsPaused(false);
    setPauseDurationSeconds(0);
    setPointsEarned(0);
    setIsSubmitting(false);
    setServerExplanation(null);
    setServerFeedbackMessage('');
    setTimeLeft(currentQuestion?.timeSeconds || 120);

    initializeQuestionAttempt();

    // Initial Sector Briefing or question narrative
    const sectorIntroVoices: Record<SectorId, string> = {
      1: 'Vamos começar pelo sistema de energia. Observe a tensão, a corrente e a resistência.',
      2: 'Temos uma falha no gerador orbital. Use as relações de potencial para recalcular os parâmetros.',
      3: 'Os resistores estão ligados em série. Preste atenção: a corrente é a mesma em todo o ramo.',
      4: 'Agora temos um circuito em paralelo. Observe como a corrente se divide pelos diferentes caminhos.',
      5: 'Circuito misto detectado! Vamos simplificar os blocos paralelos e em série passo a passo.',
      6: 'O sistema de propulsão está sobrecarregado. Precisamos calcular a potência elétrica dissipada.',
      7: 'O suporte de vida consome energia contínua. Calcule a energia total consumida pelos módulos.',
      8: 'Chegamos ao núcleo de distribuição principal da ARES-III! Máxima atenção nos cálculos.',
      9: 'Desafio ENEM Final! Interprete o diagrama prático da rede e salve a estação espacial!',
    };

    if (questionIndex === 0) {
      tigraoVoice.speak(sectorIntroVoices[sectorId] || currentQuestion.narrative);
    } else {
      tigraoVoice.speak(currentQuestion.narrative);
    }

    return () => {
      tigraoVoice.stop();
    };
  }, [questionIndex, sectorId, currentQuestion, initializeQuestionAttempt]);

  // Handle authoritative timeout
  const handleTimeout = useCallback(async () => {
    if (feedbackState !== 'answering' || isSubmitting) return;
    setIsSubmitting(true);
    sound.playAlert();
    sound.playError();
    setFeedbackState('timeout');

    try {
      const result = await gameClient.submitAnswer({
        attemptId: currentAttemptId,
        selectedOptionId: 'TIMEOUT',
        usedHintLevel,
        uid: playerName,
        clientTimeLeft: 0,
      });

      setServerExplanation(result.detailedExplanation);
      setServerFeedbackMessage(result.feedbackMessage);
      onUpdateStats(0, false, result.livesRemaining, result.totalScore);
      telemetry.logEvent('question_timeout', {
        attemptId: currentAttemptId,
        questionId: currentQuestion.id,
      });
    } catch {
      onUpdateStats(0, false);
    } finally {
      setIsSubmitting(false);
    }

    tigraoVoice.speak('O tempo do protocolo esgotou-se antes da estabilização da corrente. Revise os conceitos físicos e reinicie o diagnóstico.');
  }, [feedbackState, isSubmitting, currentAttemptId, usedHintLevel, playerName, currentQuestion.id, onUpdateStats]);

  // Authoritative countdown timer engine
  useEffect(() => {
    if (feedbackState !== 'answering' || isPaused || showCalculator || sectorDone) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      if (authoritativeDeadline > 0) {
        const remaining = Math.max(0, Math.ceil((authoritativeDeadline - Date.now()) / 1000));
        setTimeLeft(remaining);

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
        } else if (remaining <= 6) {
          sound.playClick();
        }
      } else {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleTimeout();
            return 0;
          }
          if (prev <= 6) sound.playClick();
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [feedbackState, isPaused, showCalculator, sectorDone, authoritativeDeadline, handleTimeout]);

  // Pause duration tracker (Anti-cheat: prevents infinite freezing)
  useEffect(() => {
    if (!isPaused) {
      if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
      return;
    }

    pauseTimerRef.current = setInterval(() => {
      setPauseDurationSeconds((prev) => {
        // Auto-unpause after 180 seconds to prevent perpetual pause exploit
        if (prev >= 180) {
          setIsPaused(false);
          tigraoVoice.speak('Pausa máxima de 3 minutos atingida. Retomando o circuito da missão!');
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
    };
  }, [isPaused]);

  const handleSelectOption = (originalOptionId: string) => {
    if (feedbackState !== 'answering' || isPaused || isSubmitting) return;
    sound.playClick();
    setSelectedOptionId(originalOptionId);
  };

  const handleHintTierSelected = (level: 1 | 2 | 3) => {
    if (feedbackState !== 'answering' || isPaused) return;
    setUsedHintLevel((prev) => Math.max(prev, level) as 1 | 2 | 3);
    telemetry.logEvent('hint_used', {
      attemptId: currentAttemptId,
      questionId: currentQuestion.id,
      hintLevel: level,
    });
  };

  // Authoritative Answer Submission with Idempotency Protection
  const handleVerifyAnswer = async () => {
    if (!selectedOptionId || feedbackState !== 'answering' || isPaused || isSubmitting) return;

    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const result = await gameClient.submitAnswer({
        attemptId: currentAttemptId,
        selectedOptionId,
        usedHintLevel,
        uid: playerName,
        clientTimeLeft: timeLeft,
      });

      setServerExplanation(result.detailedExplanation);
      setServerFeedbackMessage(result.feedbackMessage);

      if (result.isCorrect) {
        sound.playSuccess();
        sound.playTigraoBark();
        setFeedbackState('verified_correct');
        setPointsEarned(result.scoreAwarded);
        onUpdateStats(result.scoreAwarded, true, result.livesRemaining, result.totalScore);

        tigraoVoice.speak(
          `Excelente diagnóstico! As medições elétricas bateram com precisão. Você creditou +${result.scoreAwarded} pontos na estação!`
        );

        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.75 },
        });

        telemetry.logEvent('question_answered', {
          attemptId: currentAttemptId,
          questionId: currentQuestion.id,
          isCorrect: true,
          score: result.scoreAwarded,
        });
      } else {
        sound.playError();
        setFeedbackState('verified_wrong');
        setPointsEarned(0);
        onUpdateStats(0, false, result.livesRemaining, result.totalScore);

        tigraoVoice.speak(
          'Atenção, astronauta! Os valores medidos não estabilizaram o circuito. Analise o princípio físico e tente novamente!'
        );

        telemetry.logEvent('question_answered', {
          attemptId: currentAttemptId,
          questionId: currentQuestion.id,
          isCorrect: false,
        });
      }
    } catch {
      // Fallback if network fails completely
      sound.playError();
      setFeedbackState('verified_wrong');
      onUpdateStats(0, false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueNext = () => {
    if (isSubmitting) return;
    sound.playClick();
    if (questionIndex + 1 < sectorQuestions.length) {
      setQuestionIndex(questionIndex + 1);
    } else {
      // Sector 100% Completed!
      sound.playPowerRestore();
      sound.playFanfare();
      setSectorDone(true);
      onSectorCompleted(sectorId);
      telemetry.logEvent('sector_completed', { sectorId });

      const victorySpeech =
        sectorId === 9
          ? 'EXTRAORDINÁRIO! Você superou o Desafio ENEM e salvou todos os sistemas de energia da Estação Orbital ARES-III!'
          : 'Uau! Você estabilizou este setor com perfeição! O barramento de energia voltou a brilhar!';
      tigraoVoice.speak(victorySpeech);

      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
      });
    }
  };

  const handleRetryQuestion = () => {
    if (isSubmitting) return;
    sound.playClick();
    setSelectedOptionId(null);
    setFeedbackState('answering');
    setShowDetailedSolution(false);
    setTimeLeft(currentQuestion?.timeSeconds || 120);
    initializeQuestionAttempt();
    tigraoVoice.speak('Circuito reiniciado. Avalie a Lei de Ohm e as grandezas antes de confirmar.');
  };

  // ==========================================
  // KEYBOARD SHORTCUTS ENGINE (A-E, 1-5, Enter, Space, Esc)
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input/textarea
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      const key = e.key.toUpperCase();

      // Escape toggles pause
      if (e.key === 'Escape') {
        if (feedbackState === 'answering') {
          sound.playClick();
          setIsPaused((prev) => !prev);
        }
        return;
      }

      // Enter key actions
      if (e.key === 'Enter') {
        if (feedbackState === 'answering' && selectedOptionId && !isSubmitting) {
          e.preventDefault();
          handleVerifyAnswer();
        } else if (feedbackState === 'verified_correct' && !isSubmitting) {
          e.preventDefault();
          handleContinueNext();
        } else if ((feedbackState === 'verified_wrong' || feedbackState === 'timeout') && !isSubmitting) {
          e.preventDefault();
          handleRetryQuestion();
        }
        return;
      }

      // Space bar advances when correct
      if (e.key === ' ' && feedbackState === 'verified_correct' && !isSubmitting) {
        e.preventDefault();
        handleContinueNext();
        return;
      }

      // Number keys 1-5 or Letter keys A-E for options
      if (feedbackState === 'answering' && !isPaused && !isSubmitting) {
        let selectedIndex = -1;
        if (['1', '2', '3', '4', '5'].includes(key)) {
          selectedIndex = parseInt(key, 10) - 1;
        } else if (['A', 'B', 'C', 'D', 'E'].includes(key)) {
          selectedIndex = ['A', 'B', 'C', 'D', 'E'].indexOf(key as 'A' | 'B' | 'C' | 'D' | 'E');
        }

        if (selectedIndex >= 0 && selectedIndex < displayOptions.length) {
          e.preventDefault();
          handleSelectOption(displayOptions[selectedIndex].originalOptionId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [feedbackState, selectedOptionId, isPaused, isSubmitting, displayOptions]);

  const timeRatio = timeLeft / questionTotalTime;

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
              title="Pausar Desafio (Esc)"
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

          {/* Lives (5 Hearts official MAX_LIVES) */}
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

      {/* PAUSE MODAL OVERLAY (Anti-cheat: Obscures circuit & prompt) */}
      {isPaused && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-[0_0_60px_rgba(245,158,11,0.3)] animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-950/80 border border-amber-400 text-amber-400 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <Pause className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Missão Pausada</h3>
              <p className="text-xs sm:text-sm text-slate-300 font-mono leading-relaxed">
                O cronômetro está congelado e o diagrama protegido contra interferência. Respire fundo e retome quando estiver pronto!
              </p>
            </div>

            <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 text-xs font-mono space-y-1.5 text-left">
              <div className="text-cyan-400 font-bold uppercase">Status da Sessão:</div>
              <div className="text-slate-300">Astronauta: <span className="text-white font-bold">{playerName}</span></div>
              <div className="text-slate-300">Tempo Restante: <span className="text-amber-300 font-bold">{timeLeft}s</span></div>
              <div className="text-slate-300">Vidas Restantes: <span className="text-rose-400 font-bold">{lives} / 5</span></div>
              <div className="text-slate-300">Duração da Pausa: <span className="text-cyan-300 font-bold">{pauseDurationSeconds}s / 180s máx</span></div>
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
            <TigraoAssistant
              pose="celebrating"
              mood="celebrating"
              speech={
                sectorId === 9
                  ? 'EXTRAORDINÁRIO! Você superou o Desafio ENEM e provou ser um engenheiro mestre supremo da Eletrodinâmica! A Estação ARES-III está salva!'
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
        /* Active Question Layout with Anti-Cheat Blur on Pause */
        <div className={`space-y-5 transition-all duration-300 ${isPaused ? 'filter blur-2xl opacity-10 pointer-events-none select-none' : ''}`}>
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

          {/* Tigrão Companion & Narrative with Tiered Scaffolding Hints */}
          <div className="bg-slate-900/60 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur-sm">
            <TigraoAssistant
              pose={
                feedbackState === 'verified_correct'
                  ? 'celebrating'
                  : feedbackState === 'verified_wrong' || feedbackState === 'timeout'
                  ? 'concerned'
                  : timeLeft <= 25
                  ? 'alert'
                  : lives === 1
                  ? 'concerned'
                  : 'master'
              }
              mood={
                feedbackState === 'verified_correct'
                  ? 'celebrating'
                  : feedbackState === 'verified_wrong' || feedbackState === 'timeout'
                  ? 'concerned'
                  : timeLeft <= 25
                  ? 'alert'
                  : 'idle'
              }
              speech={
                feedbackState === 'verified_correct'
                  ? `Excelente diagnóstico! As medições bateram com exatidão e você faturou +${pointsEarned} pontos!`
                  : feedbackState === 'timeout'
                  ? 'Tempo esgotado! A oscilação na rede sobrecarregou o nó de dados. Analise a fundamentação física e reinicie o circuito.'
                  : feedbackState === 'verified_wrong'
                  ? 'Atenção, astronauta! Os valores medidos não estabilizaram o circuito. Analise o princípio físico e tente novamente!'
                  : currentQuestion.narrative
              }
              hintsTiered={currentTieredHints}
              singleHint={currentQuestion.tigraoHint}
              onHintSelected={handleHintTierSelected}
              showHints={feedbackState === 'answering'}
              size="md"
            />
          </div>

          {/* Interactive Circuit Schematic Visualizer & Floating Tools Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5 font-bold uppercase text-cyan-400">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                Bancada de Diagnóstico do Circuito
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCalculator(!showCalculator)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-all flex items-center gap-1 cursor-pointer ${
                    showCalculator 
                      ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Calculadora</span>
                </button>
              </div>
            </div>

            {/* Circuit Component */}
            {currentQuestion.circuitConfig && (
              <InteractiveCircuit
                config={currentQuestion.circuitConfig}
                title={currentQuestion.title}
                topic={currentQuestion.topic}
              />
            )}

            {/* Scientific Calculator Floating Drawer */}
            {showCalculator && (
              <div className="p-4 bg-slate-950/95 border border-cyan-500/40 rounded-2xl animate-in fade-in duration-200">
                <AstronautCalculator />
              </div>
            )}
          </div>

          {/* Question Prompt Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wide">
                {currentQuestion.topic}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Pontos Base: <strong className="text-amber-300 font-bold">{currentQuestion.basePoints} pts</strong>
              </span>
            </div>

            {/* Context Data Cards */}
            {currentQuestion.contextData && currentQuestion.contextData.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {currentQuestion.contextData.map((item, idx) => (
                  <div key={idx} className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-center font-mono">
                    <div className="text-[10px] text-slate-400 uppercase tracking-tight">{item.label}</div>
                    <div className="text-xs sm:text-sm font-bold text-cyan-300 mt-0.5">{item.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Data Table if applicable */}
            {currentQuestion.tableData && (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-xs font-mono">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-cyan-400">
                      {currentQuestion.tableData.headers.map((h, i) => (
                        <th key={i} className="p-2 font-bold uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentQuestion.tableData.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-slate-900/60 hover:bg-slate-900/40">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-2 text-slate-300">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Question Text */}
            <div className="text-sm sm:text-base text-slate-100 font-sans leading-relaxed pt-1">
              {currentQuestion.question}
            </div>

            {/* Keyboard Shortcuts Hint */}
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1">
              <span>Selecione a alternativa via clique ou teclas <strong>1–5 / A–E</strong>:</span>
              <span className="hidden sm:inline text-slate-500">Enter = Confirmar | Esc = Pausa</span>
            </div>

            {/* Options List (Randomized Order Fisher-Yates with Logical Mapping) */}
            <div className="space-y-2.5 pt-2">
              {displayOptions.map((opt) => {
                const isSelected = selectedOptionId === opt.originalOptionId;
                const isVerifiedCorrect = feedbackState === 'verified_correct' && isSelected;
                const isVerifiedWrong = feedbackState === 'verified_wrong' && isSelected;

                return (
                  <button
                    key={opt.visualLetter}
                    type="button"
                    disabled={feedbackState !== 'answering' || isSubmitting}
                    onClick={() => handleSelectOption(opt.originalOptionId)}
                    className={`w-full text-left p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm font-sans transition-all flex items-start gap-3 cursor-pointer ${
                      isVerifiedCorrect
                        ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                        : isVerifiedWrong
                        ? 'bg-red-950/60 border-red-400 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                        : isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-900/60'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 border transition-all ${
                      isVerifiedCorrect
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : isVerifiedWrong
                        ? 'bg-red-600 text-white border-red-400'
                        : isSelected 
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400' 
                        : 'bg-slate-900 text-cyan-400 border-slate-700'
                    }`}>
                      {isVerifiedCorrect ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : isVerifiedWrong ? (
                        <X className="w-4 h-4 stroke-[3]" />
                      ) : (
                        opt.visualLetter
                      )}
                    </span>
                    <span className="leading-relaxed flex-1 pt-0.5 font-medium">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons Section with Double-Click Protection */}
            <div className="pt-4 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400 font-mono">
                {feedbackState === 'answering' ? (
                  selectedOptionId ? (
                    <span className="text-cyan-300 font-semibold">Alternativa selecionada. Pressione Enter ou clique em confirmar.</span>
                  ) : (
                    <span>Escolha uma alternativa para prosseguir com o reparo.</span>
                  )
                ) : feedbackState === 'verified_correct' ? (
                  <span className="text-emerald-300 font-semibold">Diagnóstico exato! +{pointsEarned} pontos creditados.</span>
                ) : feedbackState === 'timeout' ? (
                  <span className="text-rose-400 font-semibold">Tempo de tolerância esgotado (-1 vida). Analise o circuito e tente novamente.</span>
                ) : (
                  <span className="text-rose-400 font-semibold">Resposta incorreta (-1 vida). Reflita sobre a relação física e tente novamente.</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {feedbackState === 'answering' ? (
                  <button
                    type="button"
                    disabled={!selectedOptionId || isSubmitting}
                    onClick={handleVerifyAnswer}
                    className={`px-6 py-3 rounded-xl font-mono font-bold text-xs sm:text-sm tracking-wider uppercase transition-all shadow flex items-center gap-2 ${
                      selectedOptionId && !isSubmitting
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer transform hover:scale-105'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>{isSubmitting ? 'VALIDANDO...' : 'CONFIRMAR RESPOSTA'}</span>
                  </button>
                ) : feedbackState === 'verified_correct' ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleContinueNext}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-mono font-bold text-xs sm:text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-2 cursor-pointer transform hover:scale-105"
                  >
                    <span>CONTINUAR MISSÃO</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleRetryQuestion}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-mono font-bold text-xs sm:text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center gap-2 cursor-pointer transform hover:scale-105"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>TENTAR NOVAMENTE</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pedagogical Metacognition & Step-by-Step Resolution Card */}
          {feedbackState !== 'answering' && (
            <div className={`p-5 sm:p-6 rounded-2xl border backdrop-blur-md space-y-4 transition-all ${
              feedbackState === 'verified_correct'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
                : 'bg-red-950/40 border-red-500/50 text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.15)]'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm font-bold font-mono">
                  {feedbackState === 'verified_correct' ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="text-emerald-300">DIAGNÓSTICO EXATO! CIRCUITO RESTABELECIDO!</span>
                    </>
                  ) : feedbackState === 'timeout' ? (
                    <>
                      <Clock className="w-5 h-5 text-rose-400 animate-pulse" />
                      <span className="text-rose-300">TEMPO ESGOTADO! O NÓ DE DADOS PRECISA DE REINÍCIO</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span className="text-red-300">OSCILAÇÃO DE CORRENTE DETECTADA!</span>
                    </>
                  )}
                </div>

                {/* Toggle Button for Detailed Step-by-Step Resolution */}
                <button
                  type="button"
                  onClick={() => setShowDetailedSolution(!showDetailedSolution)}
                  className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700"
                >
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{showDetailedSolution ? 'Ocultar Resolução' : 'Ver Demonstração Passo a Passo'}</span>
                </button>
              </div>

              {/* Feedback Narrative */}
              <p className="text-xs sm:text-sm leading-relaxed font-sans">
                {serverFeedbackMessage || (
                  feedbackState === 'verified_correct'
                    ? 'Parabéns! Você aplicou com maestria os princípios da eletrodinâmica e restabeleceu a estabilidade operacional.'
                    : 'Não desanime, astronauta! Os erros em circuitos nos ensinam onde a energia está sendo dissipada ou onde o nó elétrico foi interpretado de forma equivocada. Analise a fundamentação e refaça a medição.'
                )}
              </p>

              {/* Detailed Mathematical & Physical Proof */}
              {showDetailedSolution && (
                <div className="pt-3 border-t border-slate-800/80 space-y-4 animate-in fade-in duration-200">
                  <StepByStepSolution
                    question={currentQuestion}
                    studentAnswer={
                      displayOptions.find((o) => o.originalOptionId === selectedOptionId)?.visualLetter ||
                      selectedOptionId ||
                      'Não respondida'
                    }
                    correctAnswer={currentQuestion.correctAnswer}
                    errorType={feedbackState === 'timeout' ? 'interpretation' : 'conceptual'}
                    errorExplanation={serverFeedbackMessage || 'Observe com atenção a relação entre corrente, resistência e ddp neste setor.'}
                    onContinue={() => setShowDetailedSolution(false)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
