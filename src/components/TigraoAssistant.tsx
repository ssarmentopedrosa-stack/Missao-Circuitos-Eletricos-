import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, FastForward, Lightbulb, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { tigraoVoice, useTigraoVoice } from '../utils/tigraoVoice';
import { sound } from '../utils/audio';
import { TIGRAO_POSE_LIBRARY, TigraoPose } from '../data/tigraoAssets';

export interface TigraoAssistantProps {
  pose?: TigraoPose;
  mood?: 'idle' | 'happy' | 'thinking' | 'alert' | 'celebrating' | 'concerned';
  speech?: string;
  speechAudioSrc?: string;
  autoSpeak?: boolean;
  hintsTiered?: {
    concept: string;
    formula: string;
    calculation: string;
  };
  singleHint?: string;
  onHintSelected?: (level: 1 | 2 | 3) => void;
  showHints?: boolean;
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean;
  onSpeechEnd?: () => void;
}

export const TigraoAssistant: React.FC<TigraoAssistantProps> = ({
  pose = 'master',
  mood = 'idle',
  speech,
  speechAudioSrc,
  autoSpeak = false,
  hintsTiered,
  singleHint,
  onHintSelected,
  showHints = false,
  size = 'md',
  compact = false,
  onSpeechEnd,
}) => {
  const [activeHintTier, setActiveHintTier] = useState<1 | 2 | 3>(1);
  const [isHintTrayOpen, setIsHintTrayOpen] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const voiceState = useTigraoVoice();

  const slot = TIGRAO_POSE_LIBRARY[pose] || TIGRAO_POSE_LIBRARY.master;

  // Auto-speak on speech change if autoSpeak enabled
  useEffect(() => {
    if (autoSpeak && speech && speech.trim().length > 0) {
      tigraoVoice.speak(speech, {
        audioSrc: speechAudioSrc,
        onEnd: onSpeechEnd,
      });
    }
  }, [speech, autoSpeak, speechAudioSrc, onSpeechEnd]);

  const isSpeaking = voiceState.isSpeaking;

  const handleMascotClick = () => {
    sound.playTigraoBark();
    if (speech && !isSpeaking) {
      tigraoVoice.speak(speech, { audioSrc: speechAudioSrc, onEnd: onSpeechEnd });
    }
  };

  const handleRepeatSpeech = () => {
    if (speech) {
      sound.playClick();
      tigraoVoice.speak(speech, { audioSrc: speechAudioSrc, onEnd: onSpeechEnd });
    }
  };

  const handleSkipSpeech = () => {
    sound.playClick();
    tigraoVoice.skip();
    if (onSpeechEnd) onSpeechEnd();
  };

  const handleSelectHintTier = (level: 1 | 2 | 3) => {
    sound.playClick();
    setActiveHintTier(level);
    setIsHintTrayOpen(true);
    if (onHintSelected) onHintSelected(level);

    let textToSpeak = '';
    if (hintsTiered) {
      if (level === 1) textToSpeak = `Dica conceitual: ${hintsTiered.concept}`;
      if (level === 2) textToSpeak = `Relação física fundamental: ${hintsTiered.formula}`;
      if (level === 3) textToSpeak = `Procedimento de cálculo: ${hintsTiered.calculation}`;
    } else if (singleHint) {
      textToSpeak = `Aqui está uma pista importante: ${singleHint}`;
    }

    if (textToSpeak) {
      tigraoVoice.speak(textToSpeak);
    }
  };

  const sizeDimensions = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24 sm:w-28 sm:h-28',
    lg: 'w-32 h-32 sm:w-36 sm:h-36',
  };

  return (
    <div id="tigrao-assistant-wrapper" className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 select-none">
      {/* Visual Avatar Container */}
      <div
        onClick={handleMascotClick}
        className={`relative ${sizeDimensions[size]} shrink-0 cursor-pointer group transition-all duration-300 ${
          isSpeaking ? 'scale-105 animate-bounce-slight' : 'hover:scale-105'
        }`}
        title="Tigrão — Engenheiro Espacial da Estação ARES-III (ECIT BAYEUX)"
      >
        {/* Luminous Helmet Aura */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-300 ${
            isSpeaking
              ? 'bg-cyan-400/40 blur-xl animate-pulse ring-4 ring-cyan-400/60'
              : mood === 'alert'
              ? 'bg-amber-500/30 blur-xl animate-pulse'
              : mood === 'concerned'
              ? 'bg-rose-500/25 blur-lg'
              : 'bg-cyan-500/20 blur-lg group-hover:bg-cyan-400/35'
          }`}
        />

        {/* Mascot Face & Helmet Rendering */}
        <div
          className={`relative w-full h-full rounded-full overflow-hidden border-2 transition-colors duration-300 bg-slate-900 shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center ${
            isSpeaking
              ? 'border-cyan-300 ring-2 ring-cyan-400'
              : mood === 'alert'
              ? 'border-amber-400'
              : mood === 'concerned'
              ? 'border-rose-400'
              : 'border-cyan-400/70'
          }`}
        >
          {!imageError ? (
            <img
              src={slot.sourceUrl}
              alt="Tigrão Astronauta ECIT BAYEUX"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover object-top transition-transform duration-300"
            />
          ) : (
            /* High-Fidelity Vector Canonical Astronaut Dog with ECIT BAYEUX Insignia */
            <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_8px_16px_rgba(6,182,212,0.3)]">
              <defs>
                <linearGradient id="suitGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f8fafc" />
                  <stop offset="60%" stopColor="#e2e8f0" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <linearGradient id="visorGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                  <stop offset="40%" stopColor="#0284c7" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.75" />
                </linearGradient>
                <linearGradient id="furBrown2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#b45309" />
                  <stop offset="70%" stopColor="#92400e" />
                  <stop offset="100%" stopColor="#78350f" />
                </linearGradient>
              </defs>

              {/* White & Navy Spacesuit Torso */}
              <path d="M 25 160 C 25 125, 45 110, 80 110 C 115 110, 135 125, 135 160 Z" fill="url(#suitGrad2)" />
              
              {/* Blue Suit Accents */}
              <path d="M 50 115 L 110 115 L 105 130 L 55 130 Z" fill="#0369a1" />
              
              {/* ECIT BAYEUX Insignia Text */}
              <rect x="52" y="132" width="56" height="12" rx="3" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="0.7" />
              <text x="80" y="141" textAnchor="middle" fill="#f0f9ff" fontSize="6.5" fontWeight="900" fontFamily="monospace">
                ECIT BAYEUX
              </text>

              {/* Helmet Glass Sphere */}
              <circle cx="80" cy="72" r="52" fill="url(#visorGrad2)" stroke="#38bdf8" strokeWidth="2.5" />
              
              {/* LED Lights on Helmet */}
              <circle cx="34" cy="72" r="3.5" fill="#38bdf8" className="animate-pulse" />
              <circle cx="126" cy="72" r="3.5" fill="#38bdf8" className="animate-pulse" />

              {/* Dog Ears (Alert) */}
              <path d="M 46 48 C 42 28, 55 20, 64 36 Z" fill="url(#furBrown2)" stroke="#78350f" strokeWidth="1" />
              <path d="M 114 48 C 118 28, 105 20, 96 36 Z" fill="url(#furBrown2)" stroke="#78350f" strokeWidth="1" />

              {/* Dog Head */}
              <ellipse cx="80" cy="72" rx="32" ry="30" fill="#f8fafc" />
              {/* Eye patches */}
              <ellipse cx="68" cy="67" rx="14" ry="12" fill="url(#furBrown2)" transform="rotate(-10 68 67)" />
              <ellipse cx="92" cy="67" rx="14" ry="12" fill="url(#furBrown2)" transform="rotate(10 92 67)" />
              {/* White forehead blaze */}
              <polygon points="80,50 74,74 86,74" fill="#ffffff" />

              {/* Expressive Brown Eyes */}
              <circle cx="70" cy="66" r="4.5" fill="#451a03" />
              <circle cx="90" cy="66" r="4.5" fill="#451a03" />
              <circle cx="71.5" cy="64.5" r="1.5" fill="#ffffff" />
              <circle cx="91.5" cy="64.5" r="1.5" fill="#ffffff" />

              {/* Muzzle & Wet Nose */}
              <ellipse cx="80" cy="80" rx="13" ry="10" fill="#ffffff" />
              <path d="M 76 77 C 78 75, 82 75, 84 77 C 83 80, 77 80, 76 77 Z" fill="#0f172a" />

              {/* Mouth & Expression */}
              {mood === 'happy' || mood === 'celebrating' ? (
                <path d="M 74 84 Q 80 91 86 84" fill="none" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
              ) : mood === 'concerned' ? (
                <path d="M 75 87 Q 80 82 85 87" fill="none" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
              ) : (
                <path d="M 75 84 Q 80 87 85 84" fill="none" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
              )}
            </svg>
          )}

          {/* Voice active indicator badge */}
          {isSpeaking && (
            <div className="absolute bottom-1 right-1 bg-cyan-500 text-slate-950 p-1 rounded-full shadow-lg animate-bounce">
              <Volume2 className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>

      {/* Speech Dialogue & Scaffolding Hints Box */}
      <div className="flex-1 w-full space-y-2">
        {/* Dialogue Bubble */}
        <div className="relative bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 shadow-[0_0_25px_rgba(6,182,212,0.15)] backdrop-blur-md">
          {/* Header Bar: Name, Status & Controls */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                Tigrão • Engenheiro Chefe ECIT BAYEUX
              </span>
              {isSpeaking && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 animate-pulse">
                  Transmitindo áudio...
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {speech && (
                <>
                  <button
                    type="button"
                    onClick={handleRepeatSpeech}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition-colors"
                    title="Repetir fala do Tigrão"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  {isSpeaking && (
                    <button
                      type="button"
                      onClick={handleSkipSpeech}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition-colors"
                      title="Pular áudio"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Speech Text Content */}
          <p className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed">
            {speech || 'Pronto para diagnosticar o circuito, astronauta? Analise os medidores e formule sua hipótese!'}
          </p>

          {/* Tiered Hints Button Bar */}
          {showHints && (
            <div className="pt-3 mt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  Andaimes Cognitivos (Dicas do Tigrão):
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectHintTier(1)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold uppercase transition-all ${
                      isHintTrayOpen && activeHintTier === 1
                        ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    1. Conceito
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectHintTier(2)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold uppercase transition-all ${
                      isHintTrayOpen && activeHintTier === 2
                        ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                        : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    2. Fórmula
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectHintTier(3)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold uppercase transition-all ${
                      isHintTrayOpen && activeHintTier === 3
                        ? 'bg-purple-500 text-slate-950 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                        : 'bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30'
                    }`}
                  >
                    3. Cálculo
                  </button>
                </div>
              </div>

              {/* Active Hint Expansion Box */}
              {isHintTrayOpen && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-950/90 border border-amber-500/40 text-xs font-mono text-amber-200 animate-in fade-in duration-200">
                  <div className="font-bold text-[10px] text-amber-400 uppercase mb-1">
                    {activeHintTier === 1 && '💡 NÍVEL 1: PRINCÍPIO CONCEITUAL'}
                    {activeHintTier === 2 && '⚡ NÍVEL 2: RELAÇÃO FÍSICA / EQUAÇÃO'}
                    {activeHintTier === 3 && '📐 NÍVEL 3: GUIA DE CÁLCULO E UNIDADES'}
                  </div>
                  <p className="text-slate-200 leading-relaxed font-sans">
                    {hintsTiered
                      ? activeHintTier === 1
                        ? hintsTiered.concept
                        : activeHintTier === 2
                        ? hintsTiered.formula
                        : hintsTiered.calculation
                      : singleHint || 'Observe o comportamento do voltímetro e amperímetro antes de decidir.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
