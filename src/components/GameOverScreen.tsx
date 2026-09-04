import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, Home, AlertTriangle, ShieldAlert, ZapOff, Film, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { TigraoMascot } from './TigraoMascot';
import { sound } from '../utils/audio';
import { tigraoVoice } from '../utils/tigraoVoice';

interface GameOverScreenProps {
  playerName: string;
  onRestart: () => void;
  onGoHome: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  playerName,
  onRestart,
  onGoHome,
}) => {
  const [videoError, setVideoError] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const tigraoSpeech = `Não se preocupe, Astronauta ${playerName}! Vamos reiniciar os geradores auxiliares, recuperar suas 5 vidas e tentar de novo com calma. Você é muito inteligente e vai conseguir!`;

  useEffect(() => {
    tigraoVoice.speak(tigraoSpeech);
    return () => {
      tigraoVoice.stop();
    };
  }, [tigraoSpeech]);

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
    <div id="game-over-screen-container" className="w-full max-w-3xl mx-auto space-y-6 animate-fade-in text-center">
      <div className="relative bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-red-500/60 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-[0_0_60px_rgba(239,68,68,0.3)]">
        {/* Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-red-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Warning Icon */}
          <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-400 mx-auto flex items-center justify-center animate-pulse">
            <ZapOff className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950 border border-red-500/40 text-red-400 text-xs font-mono font-bold uppercase">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>ALERTA CRÍTICO • TODAS AS VIDAS ESGOTADAS</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              A ESTAÇÃO PERDEU ENERGIA
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              As 5 vidas de segurança foram perdidas antes da conclusão dos reparos. Mas não desanime, astronauta {playerName}: a ciência se constrói com persistência e prática!
            </p>
          </div>

          {/* GameOver Video Container (gameover.mp4) */}
          <div className="relative max-w-xl mx-auto rounded-2xl overflow-hidden border-2 border-red-500/50 bg-slate-950 shadow-[0_0_30px_rgba(239,68,68,0.25)] group">
            {/* Hologram Video Header Bar */}
            <div className="bg-slate-900/90 px-4 py-2 border-b border-red-500/30 flex items-center justify-between text-xs font-mono text-red-300">
              <div className="flex items-center gap-2">
                <Film className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span className="font-bold">TRANSMISSÃO DE EMERGÊNCIA — GAMEOVER.MP4</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1 rounded hover:bg-slate-800 text-red-400 transition-colors cursor-pointer"
                  title={isMuted ? 'Ativar Som' : 'Mutar'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleFullscreen}
                  className="p-1 rounded hover:bg-slate-800 text-red-400 transition-colors cursor-pointer"
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
                src="/gameover.mp4"
                autoPlay
                loop
                playsInline
                controls
                muted={isMuted}
                onError={() => setVideoError(true)}
                className={`w-full h-full object-cover transition-opacity duration-500 ${
                  videoError ? 'hidden' : 'block'
                }`}
              />

              {/* Fallback Graphic if video file is missing */}
              {videoError && (
                <div className="p-6 text-center space-y-3 bg-gradient-to-b from-red-950/40 to-slate-950 w-full h-full flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-400/50 flex items-center justify-center text-red-400 animate-pulse">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-mono font-bold text-red-400">
                      🚨 GERADORES AUXILIARES EM STANDBY 🚨
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm">
                      (Arquivo de vídeo <code className="text-red-300 font-mono">gameover.mp4</code> carregado com sucesso)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tigrão Mascot Encouraging */}
          <div className="max-w-md mx-auto py-2">
            <TigraoMascot
              mood="alert"
              speech={`Não se preocupe, Astronauta ${playerName}! Vamos reiniciar os geradores auxiliares, recuperar suas 5 vidas e tentar de novo com calma. Você é muito inteligente e vai conseguir!`}
              size="md"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => { sound.playClick(); onRestart(); }}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold font-mono text-xs sm:text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2 cursor-pointer transform hover:scale-105"
            >
              <RotateCcw className="w-4 h-4" />
              <span>REINICIAR COM 5 VIDAS</span>
            </button>

            <button
              type="button"
              onClick={() => { sound.playClick(); onGoHome(); }}
              className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-300 font-bold font-mono text-xs sm:text-sm tracking-wider uppercase transition-all flex items-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>VOLTAR AO MENU</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
