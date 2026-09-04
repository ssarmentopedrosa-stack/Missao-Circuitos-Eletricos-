import React, { useState, useEffect } from 'react';
import { Sparkles, HelpCircle, Lightbulb, Volume2, VolumeX, FastForward, Play, Radio } from 'lucide-react';
import { sound } from '../utils/audio';
import { tigraoVoice, useTigraoVoice } from '../utils/tigraoVoice';

export interface TigraoProps {
  mood?: 'idle' | 'happy' | 'thinking' | 'alert' | 'celebrating';
  speech?: string;
  audioSrc?: string;
  autoSpeak?: boolean;
  hintText?: string;
  hintsTiered?: {
    conceptual: string;
    formula: string;
    calculationGuide: string;
  };
  onHintClick?: () => void;
  showHintButton?: boolean;
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean;
  onSpeechEnd?: () => void;
}

export const TigraoMascot: React.FC<TigraoProps> = ({
  mood = 'idle',
  speech,
  audioSrc,
  autoSpeak = false,
  hintText,
  hintsTiered,
  onHintClick,
  showHintButton = false,
  size = 'md',
  compact = false,
  onSpeechEnd,
}) => {
  const [activeHintLevel, setActiveHintLevel] = useState<1 | 2 | 3>(1);
  const [imgSrcIndex, setImgSrcIndex] = useState<number>(0);
  const [imageFailed, setImageFailed] = useState<boolean>(false);
  const voiceState = useTigraoVoice();

  const isCurrentSpeaking = voiceState.isSpeaking && (!speech || voiceState.currentText === speech || voiceState.currentText.length > 0);

  // Candidate image paths for the mascot
  const candidateSources = [
    '/tigrao.png',
    '/Tigrão.png',
    '/Tigrao.png',
    '/assets/tigrao.png',
  ];

  const handleImageError = () => {
    if (imgSrcIndex < candidateSources.length - 1) {
      setImgSrcIndex((prev) => prev + 1);
    } else {
      setImageFailed(true);
    }
  };

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24 sm:w-28 sm:h-28',
    lg: 'w-32 h-32 sm:w-40 sm:h-40',
  };

  // Auto-speak effect if requested
  useEffect(() => {
    if (autoSpeak && speech && speech.trim().length > 0) {
      tigraoVoice.speak(speech, {
        audioSrc,
        onEnd: onSpeechEnd,
      });
    }
  }, [speech, autoSpeak, audioSrc, onSpeechEnd]);

  const handleMascotClick = () => {
    sound.playTigraoBark();
    if (speech && !voiceState.isSpeaking) {
      tigraoVoice.speak(speech, { audioSrc, onEnd: onSpeechEnd });
    }
  };

  const handleSpeakSpeech = () => {
    if (speech) {
      sound.playClick();
      tigraoVoice.speak(speech, { audioSrc, onEnd: onSpeechEnd });
    }
  };

  const handleSkipSpeech = () => {
    sound.playClick();
    tigraoVoice.skip();
    if (onSpeechEnd) {
      onSpeechEnd();
    }
  };

  return (
    <div id="tigrao-mascot-container" className="flex items-start gap-3 sm:gap-4 select-none">
      {/* Mascot Graphic Avatar */}
      <div 
        onClick={handleMascotClick}
        className={`relative ${sizeClasses[size]} shrink-0 cursor-pointer group transition-all duration-300 ${
          isCurrentSpeaking ? 'scale-105 animate-bounce-slight' : 'hover:scale-105'
        }`}
        title="Tigrão — Mascote Astronauta ECIT BAYEUX (Clique para falar)"
      >
        {/* Animated Glow Aura when Speaking */}
        <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
          isCurrentSpeaking
            ? 'bg-cyan-400/40 blur-xl animate-pulse ring-4 ring-cyan-400/60'
            : 'bg-cyan-500/20 blur-xl group-hover:bg-cyan-400/35'
        }`} />

        {/* Realistic Astronaut Dog Image or Stylized Vector Fallback */}
        <div className={`relative w-full h-full rounded-full overflow-hidden border-2 transition-colors duration-300 bg-slate-900 shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center ${
          isCurrentSpeaking ? 'border-cyan-300 ring-2 ring-cyan-400' : 'border-cyan-400/70'
        }`}>
          {!imageFailed ? (
            <img
              src={candidateSources[imgSrcIndex]}
              alt="Tigrão Mascote Astronauta ECIT BAYEUX"
              referrerPolicy="no-referrer"
              onError={handleImageError}
              className={`w-full h-full object-cover object-top transition-transform duration-300 ${
                isCurrentSpeaking ? 'scale-110' : 'group-hover:scale-105'
              } ${mood === 'alert' ? 'brightness-110 saturate-125' : ''} ${
                mood === 'celebrating' ? 'scale-105' : ''
              }`}
            />
          ) : (
            /* High-fidelity Realistic Vector Avatar Fallback */
            <svg
              viewBox="0 0 160 160"
              className={`w-full h-full drop-shadow-[0_8px_16px_rgba(6,182,212,0.3)] ${
                isCurrentSpeaking ? 'animate-pulse' : ''
              }`}
            >
              <defs>
                <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f8fafc" />
                  <stop offset="60%" stopColor="#cbd5e1" />
                  <stop offset="100%" stopColor="#94a3b8" />
                </linearGradient>
                <linearGradient id="suitAccent" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
                <linearGradient id="furGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#b45309" />
                  <stop offset="40%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#fef3c7" />
                </linearGradient>
                <linearGradient id="helmetGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="40%" stopColor="#0284c7" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#0369a1" stopOpacity="0.5" />
                </linearGradient>
                <radialGradient id="visorReflect" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
                  <stop offset="40%" stopColor="#ffffff" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Space Background in helmet */}
              <circle cx="80" cy="80" r="78" fill="#090d16" />

              {/* Spacesuit Body */}
              <path
                d="M 30 145 C 30 110 50 95 80 95 C 110 95 130 110 130 145 Z"
                fill="url(#suitGrad)"
                stroke="#64748b"
                strokeWidth="2"
              />
              <path d="M 45 105 C 65 100 95 100 115 105" stroke="url(#suitAccent)" strokeWidth="4" strokeLinecap="round" fill="none" />
              
              {/* ECIT BAYEUX Chest Text */}
              <rect x="52" y="118" width="56" height="18" rx="4" fill="#0f172a" stroke="#0284c7" strokeWidth="1" />
              <text x="80" y="126" fill="#38bdf8" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">ECIT</text>
              <text x="80" y="133" fill="#ffffff" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">BAYEUX</text>

              {/* Dog Ears */}
              <path
                d="M 44 42 C 28 35 24 62 40 68 C 46 70 50 58 48 48 Z"
                fill="url(#furGrad)"
                stroke="#78350f"
                strokeWidth="1.5"
              />
              <path
                d="M 116 42 C 132 35 136 62 120 68 C 114 70 110 58 112 48 Z"
                fill="url(#furGrad)"
                stroke="#78350f"
                strokeWidth="1.5"
              />

              {/* Realistic Dog Head */}
              <circle cx="80" cy="54" r="32" fill="url(#furGrad)" stroke="#78350f" strokeWidth="1.5" />

              {/* Realistic Muzzle & Nose */}
              <ellipse cx="80" cy="62" rx="14" ry="11" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />
              <path d="M 75 56 C 77 53 83 53 85 56 C 87 59 84 63 80 63 C 76 63 73 59 75 56 Z" fill="#1e293b" />
              
              {/* Dog Eyes */}
              <ellipse cx="69" cy="49" rx="5" ry="6" fill="#0f172a" />
              <ellipse cx="91" cy="49" rx="5" ry="6" fill="#0f172a" />
              <circle cx="71" cy="47" r="2" fill="#ffffff" />
              <circle cx="93" cy="47" r="2" fill="#ffffff" />

              {/* Dynamic Animated Mouth / Speaking */}
              {isCurrentSpeaking ? (
                <ellipse cx="80" cy="66" rx="6" ry="5" fill="#f43f5e" stroke="#0f172a" strokeWidth="1.5" className="animate-pulse" />
              ) : (
                <path d="M 74 65 Q 80 73 86 65" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" fill="#f43f5e" />
              )}

              {/* Helmet Glass Visor Ring */}
              <ellipse cx="80" cy="78" rx="38" ry="8" fill="#1e293b" stroke="#0284c7" strokeWidth="2.5" />
              <circle cx="80" cy="54" r="38" fill="url(#helmetGlass)" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.85" />
              <path d="M 52 34 A 36 36 0 0 1 108 34" fill="none" stroke="url(#visorReflect)" strokeWidth="4" strokeLinecap="round" />
            </svg>
          )}
        </div>

        {/* Small floating badge with ECIT branding & Audio State */}
        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-black font-mono px-2 py-0.5 rounded-full border shadow-[0_0_10px_rgba(6,182,212,0.4)] whitespace-nowrap tracking-wider transition-all ${
          isCurrentSpeaking 
            ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-extrabold animate-pulse'
            : 'bg-slate-950/95 text-cyan-300 border-cyan-500/60'
        }`}>
          {isCurrentSpeaking ? '🎙 FALANDO...' : 'TIGRÃO • ECIT'}
        </div>
      </div>

      {/* Speech / Dialog Bubble */}
      {!compact && (speech || hintText || showHintButton) && (
        <div className="flex-1 min-w-0">
          <div className={`relative bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 border rounded-2xl p-3.5 sm:p-4 text-slate-200 shadow-[0_4px_20px_rgba(6,182,212,0.15)] backdrop-blur-md transition-all ${
            isCurrentSpeaking ? 'border-cyan-400 ring-1 ring-cyan-400/50' : 'border-cyan-500/40'
          }`}>
            {/* Little speech arrow point */}
            <div className="absolute -left-2 top-5 w-4 h-4 bg-slate-900 border-l border-b border-cyan-500/40 rotate-45" />

            <div className="relative z-10 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs tracking-wider uppercase font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Tigrão • ECIT Bayeux</span>

                  {/* Animated Voice Sound Wave Indicator */}
                  {isCurrentSpeaking && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-400/60 text-cyan-300 text-[10px] font-mono animate-pulse">
                      <Radio className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} />
                      <span>Voz Ativa</span>
                      <div className="flex items-end gap-0.5 h-2.5 ml-1">
                        <span className="w-0.5 h-1.5 bg-cyan-400 rounded animate-pulse" />
                        <span className="w-0.5 h-2.5 bg-cyan-300 rounded animate-pulse" style={{ animationDelay: '150ms' }} />
                        <span className="w-0.5 h-2 bg-cyan-400 rounded animate-pulse" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Top Action Buttons: Listen / Skip / Hint */}
                <div className="flex items-center gap-1.5">
                  {isCurrentSpeaking ? (
                    <button
                      type="button"
                      onClick={handleSkipSpeech}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 text-xs font-mono font-bold transition-all cursor-pointer"
                      title="Pular Áudio da Fala"
                    >
                      <FastForward className="w-3 h-3" />
                      <span>Pular Voz</span>
                    </button>
                  ) : speech ? (
                    <button
                      type="button"
                      onClick={handleSpeakSpeech}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/80 hover:bg-cyan-950 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono transition-colors cursor-pointer"
                      title="Ouvir Voz do Tigrão"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Ouvir</span>
                    </button>
                  ) : null}

                  {showHintButton && onHintClick && (
                    <button
                      type="button"
                      onClick={onHintClick}
                      className="inline-flex items-center gap-1 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-mono font-bold"
                    >
                      <Lightbulb className="w-3 h-3 text-amber-400" />
                      <span>Pedir Dica</span>
                    </button>
                  )}
                </div>
              </div>

              {speech && (
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                  {speech}
                </p>
              )}

              {/* Tiered Hints (if provided) */}
              {hintsTiered ? (
                <div className="mt-2.5 pt-2.5 border-t border-amber-500/30 bg-amber-950/40 -mx-2 -mb-2 p-3 rounded-b-xl space-y-2">
                  <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
                    <span className="text-amber-300 font-bold flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                      Dicas Pedagógicas por Etapas:
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => { sound.playClick(); setActiveHintLevel(1); }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          activeHintLevel === 1 ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-900 text-amber-300/80 hover:text-white'
                        }`}
                      >
                        1. Conceito
                      </button>
                      <button
                        type="button"
                        onClick={() => { sound.playClick(); setActiveHintLevel(2); }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          activeHintLevel === 2 ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-900 text-amber-300/80 hover:text-white'
                        }`}
                      >
                        2. Fórmula
                      </button>
                      <button
                        type="button"
                        onClick={() => { sound.playClick(); setActiveHintLevel(3); }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          activeHintLevel === 3 ? 'bg-amber-500 text-slate-950 shadow' : 'bg-slate-900 text-amber-300/80 hover:text-white'
                        }`}
                      >
                        3. Montagem
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-amber-100 bg-slate-900/80 p-2.5 rounded-xl border border-amber-500/20 leading-relaxed font-sans">
                    {activeHintLevel === 1 && (
                      <div>
                        <strong className="text-amber-300 font-mono">💡 Passo 1 (Conceitual):</strong> {hintsTiered.conceptual}
                      </div>
                    )}
                    {activeHintLevel === 2 && (
                      <div>
                        <strong className="text-amber-300 font-mono">📐 Passo 2 (Equação & Relação):</strong> {hintsTiered.formula}
                      </div>
                    )}
                    {activeHintLevel === 3 && (
                      <div>
                        <strong className="text-amber-300 font-mono">🔢 Passo 3 (Guia de Cálculo):</strong> {hintsTiered.calculationGuide}
                      </div>
                    )}
                  </div>
                </div>
              ) : hintText ? (
                <div className="mt-2 pt-2 border-t border-amber-500/30 bg-amber-950/30 -mx-2 -mb-2 p-2.5 rounded-b-xl flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 text-xs text-amber-200">
                    <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-300 font-mono">Dica de Tigrão:</span>{' '}
                      {hintText}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      tigraoVoice.speak(`Aqui vai uma dica de ouro, astronauta: ${hintText}`);
                    }}
                    className="p-1 rounded bg-amber-950 border border-amber-500/40 text-amber-300 hover:text-white text-[10px] font-mono shrink-0 cursor-pointer"
                    title="Ouvir Dica do Tigrão"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
