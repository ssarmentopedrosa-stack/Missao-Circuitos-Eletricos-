import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Award, CheckCircle2, RotateCcw, Home, Sparkles, Clock, Target, Flame, Zap, Volume2, VolumeX, Play, Film, Maximize2, User } from 'lucide-react';
import { TigraoMascot } from './TigraoMascot';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';
import { tigraoVoice } from '../utils/tigraoVoice';

interface VictoryScreenProps {
  playerName: string;
  score: number;
  correctAnswersCount: number;
  wrongAnswersCount: number;
  startTime: number;
  onRestart: () => void;
  onGoHome: () => void;
  onOpenCertificate: () => void;
  onOpenLab: () => void;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({
  playerName,
  score,
  correctAnswersCount,
  wrongAnswersCount,
  startTime,
  onRestart,
  onGoHome,
  onOpenCertificate,
  onOpenLab,
}) => {
  const totalQuestions = correctAnswersCount + wrongAnswersCount;
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 100;
  const elapsedMinutes = Math.max(1, Math.round((Date.now() - startTime) / 60000));

  const [videoError, setVideoError] = useState<boolean>(false);
  const [videoLoaded, setVideoLoaded] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  let rankTitle = 'Aprendiz da Eletricidade';
  let rankTier = 'Bronze';
  let rankColor = 'text-amber-500';
  let rankBg = 'bg-amber-950/80 border-amber-500/40';

  if (accuracy >= 90) {
    rankTitle = 'Mestre dos Circuitos Elétricos';
    rankTier = 'Ouro Supremo';
    rankColor = 'text-yellow-300';
    rankBg = 'bg-yellow-950/80 border-yellow-400/50 shadow-[0_0_30px_rgba(234,179,8,0.25)]';
  } else if (accuracy >= 70) {
    rankTitle = 'Engenheiro da Estação Orbital';
    rankTier = 'Prata Especial';
    rankColor = 'text-cyan-300';
    rankBg = 'bg-cyan-950/80 border-cyan-400/50 shadow-[0_0_30px_rgba(6,182,212,0.25)]';
  }

  useEffect(() => {
    sound.playFanfare();
    sound.playPowerRestore();

    const victoryVoice = `AU-AU! Você foi sensacional, Astronauta ${playerName}! Conseguimos! Você salvou a estação orbital! Todos os sistemas estão 100% energizados! Parabéns!`;
    tigraoVoice.speak(victoryVoice);
    
    // Confetti shower
    const duration = 4 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 60,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 60,
        origin: { x: 1 },
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    return () => {
      tigraoVoice.stop();
    };
  }, [playerName]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div id="victory-screen-container" className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Cinematic Banner */}
      <div className="relative bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-cyan-500/60 rounded-3xl p-6 sm:p-8 text-center overflow-hidden shadow-[0_0_70px_rgba(6,182,212,0.35)]">
        {/* Atmospheric Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Top Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>MISSÃO CUMPRIDA • ESTAÇÃO ORBITAL SALVA</span>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-100 to-amber-300 tracking-tight">
              PARABÉNS, ASTRONAUTA {playerName.toUpperCase()}!
            </h1>
            <p className="text-sm sm:text-base text-cyan-200/90 max-w-xl mx-auto font-medium leading-relaxed">
              Você aplicou a Física com maestria e restabeleceu os 8 setores vitais da estação espacial!
            </p>
          </div>

          {/* Victory Video Container (victory.mp4) */}
          <div className="relative max-w-2xl mx-auto rounded-2xl overflow-hidden border-2 border-cyan-500/50 bg-slate-950 shadow-[0_0_40px_rgba(6,182,212,0.25)] group">
            {/* Hologram Video Header Bar */}
            <div className="bg-slate-900/90 px-4 py-2 border-b border-cyan-500/30 flex items-center justify-between text-xs font-mono text-cyan-300">
              <div className="flex items-center gap-2">
                <Film className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="font-bold">TRANSMISSÃO ORBITAL — VICTORY.MP4</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1 rounded hover:bg-slate-800 text-cyan-400 transition-colors cursor-pointer"
                  title={isMuted ? 'Ativar Som do Vídeo' : 'Mutar Vídeo'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleFullscreen}
                  className="p-1 rounded hover:bg-slate-800 text-cyan-400 transition-colors cursor-pointer"
                  title="Tela Cheia"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Video Element */}
            <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                src="/victory.mp4"
                autoPlay
                loop
                playsInline
                controls
                muted={isMuted}
                onLoadedData={() => setVideoLoaded(true)}
                onError={() => setVideoError(true)}
                className={`w-full h-full object-cover transition-opacity duration-500 ${
                  videoError ? 'hidden' : 'block'
                }`}
              />

              {/* Fallback Graphic if video file is missing or still loading */}
              {videoError && (
                <div className="p-6 text-center space-y-3 bg-gradient-to-b from-cyan-950/40 to-slate-950 w-full h-full flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 animate-pulse">
                    <Trophy className="w-8 h-8 text-amber-300" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-mono font-bold text-cyan-300">
                      ⚡ NÚCLEO DE FUSÃO 100% ENERGIZADO ⚡
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm">
                      (Arquivo de transmissão <code className="text-cyan-300 font-mono">victory.mp4</code> carregado com sucesso)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tigrão Hero Cutscene Mascot */}
          <div className="max-w-md mx-auto py-2">
            <TigraoMascot
              mood="celebrating"
              speech={`AU-AU! Você foi sensacional, Astronauta ${playerName}! Olhe pela cúpula: a Terra está iluminada e a nossa estação está 100% energizada!`}
              size="lg"
            />
          </div>

          {/* Honorary Rank Card */}
          <div className={`p-4 sm:p-5 rounded-2xl border max-w-lg mx-auto ${rankBg}`}>
            <div className="flex items-center justify-center gap-3">
              <Award className={`w-8 h-8 ${rankColor}`} />
              <div className="text-left">
                <div className="text-[10px] font-mono uppercase font-bold text-slate-400">
                  Classificação Oficial da Agência Espacial • {rankTier}
                </div>
                <div className={`text-lg sm:text-xl font-extrabold ${rankColor}`}>
                  {rankTitle}
                </div>
              </div>
            </div>
          </div>

          {/* Mission Statistics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
            <div className="bg-slate-950/80 border border-cyan-500/30 p-3 rounded-2xl font-mono text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-cyan-400 font-bold uppercase mb-0.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Pontuação</span>
              </div>
              <div className="text-xl font-extrabold text-white">{score}</div>
            </div>

            <div className="bg-slate-950/80 border border-emerald-500/30 p-3 rounded-2xl font-mono text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-400 font-bold uppercase mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Acertos</span>
              </div>
              <div className="text-xl font-extrabold text-emerald-300">{correctAnswersCount}</div>
            </div>

            <div className="bg-slate-950/80 border border-purple-500/30 p-3 rounded-2xl font-mono text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-purple-400 font-bold uppercase mb-0.5">
                <Target className="w-3.5 h-3.5" />
                <span>Precisão</span>
              </div>
              <div className="text-xl font-extrabold text-purple-300">{accuracy}%</div>
            </div>

            <div className="bg-slate-950/80 border border-amber-500/30 p-3 rounded-2xl font-mono text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-amber-400 font-bold uppercase mb-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Tempo</span>
              </div>
              <div className="text-xl font-extrabold text-amber-300">{elapsedMinutes} min</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => { sound.playClick(); onOpenCertificate(); }}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black font-mono text-xs sm:text-sm tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(16,185,129,0.5)] flex items-center gap-2 cursor-pointer transform hover:scale-105"
            >
              <Award className="w-5 h-5" />
              <span>EMITIR CERTIFICADO OFICIAL</span>
            </button>

            <button
              type="button"
              onClick={() => { sound.playClick(); onOpenLab(); }}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold font-mono text-xs sm:text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>LABORATÓRIO LIVRE</span>
            </button>

            <button
              type="button"
              onClick={() => { sound.playClick(); onRestart(); }}
              className="px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-200 font-bold font-mono text-xs sm:text-sm tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>JOGAR NOVAMENTE</span>
            </button>

            <button
              type="button"
              onClick={() => { sound.playClick(); onGoHome(); }}
              className="px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-200 font-bold font-mono text-xs sm:text-sm tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>MENU</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
