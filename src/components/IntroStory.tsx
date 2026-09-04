import React, { useState, useEffect } from 'react';
import { TigraoMascot } from './TigraoMascot';
import { AlertTriangle, Sparkles, ArrowRight, ShieldAlert, FastForward, Play, Volume2, RotateCcw } from 'lucide-react';
import { sound } from '../utils/audio';
import { tigraoVoice, useTigraoVoice } from '../utils/tigraoVoice';

interface IntroStoryProps {
  playerName: string;
  onStartMission: () => void;
}

export const IntroStory: React.FC<IntroStoryProps> = ({ playerName, onStartMission }) => {
  const [dialogueIndex, setDialogueIndex] = useState<number>(0);
  const voiceState = useTigraoVoice();

  const dialogues = [
    {
      mood: 'happy' as const,
      text: `Olá, Astronauta ${playerName}! Eu sou o Tigrão, seu companheiro de missão espacial da ECIT Bayeux!`,
    },
    {
      mood: 'alert' as const,
      text: 'A Estação Orbital ARES-III está enfrentando sérios problemas elétricos após uma tempestade geomagnética de radiação solar!',
    },
    {
      mood: 'thinking' as const,
      text: 'Precisamos restaurar os 8 setores vitais calculando tensões, correntes e potências antes que a energia de reserva se esgote!',
    },
    {
      mood: 'celebrating' as const,
      text: `Você está preparado para a missão, Astronauta ${playerName}? Vista seu traje e vamos salvar a estação!`,
    },
  ];

  const currentDialogue = dialogues[dialogueIndex];

  // Auto-speak current dialogue line on change
  useEffect(() => {
    tigraoVoice.speak(currentDialogue.text);
    return () => {
      tigraoVoice.stop();
    };
  }, [dialogueIndex, currentDialogue.text]);

  const handleNext = () => {
    sound.playClick();
    if (dialogueIndex < dialogues.length - 1) {
      setDialogueIndex((prev) => prev + 1);
    } else {
      tigraoVoice.stop();
      onStartMission();
    }
  };

  const handleSkipAll = () => {
    sound.playClick();
    tigraoVoice.stop();
    onStartMission();
  };

  const handleReplay = () => {
    sound.playClick();
    tigraoVoice.speak(currentDialogue.text);
  };

  return (
    <div id="intro-story-container" className="w-full max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="relative bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-cyan-500/50 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-6">
        {/* Emergency Alert Tag */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/30 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
              TRANSMISSÃO DE EMERGÊNCIA • ORBITAL ARES-III
            </span>
          </div>

          {/* Dialogue Steps Indicator */}
          <div className="flex items-center gap-1.5 font-mono text-xs text-cyan-400">
            {dialogues.map((_, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === dialogueIndex
                    ? 'bg-cyan-400 scale-125 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                    : i < dialogueIndex
                    ? 'bg-cyan-700'
                    : 'bg-slate-800'
                }`}
              />
            ))}
            <span className="ml-2 text-slate-400">
              Etapa {dialogueIndex + 1} de {dialogues.length}
            </span>
          </div>
        </div>

        {/* Narrative Context Alert */}
        <div className="bg-slate-950/70 rounded-2xl p-4 border border-cyan-500/20 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans space-y-1">
          <div className="text-cyan-300 font-mono font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span>RELATÓRIO DO CONTROLE DE VOO:</span>
          </div>
          <p>
            Uma tempestade de radiação solar sobrecarregou os barramentos elétricos principais. Os subsistemas de suporte de vida, propulsão e telemetria dependem da restauração imediata dos circuitos!
          </p>
        </div>

        {/* Tigrão Speaking Mascot Box */}
        <div className="bg-slate-950/90 rounded-2xl p-5 border-2 border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          <TigraoMascot
            mood={currentDialogue.mood}
            speech={currentDialogue.text}
            size="lg"
          />
        </div>

        {/* Navigation Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReplay}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-slate-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Ouvir Novamente esta fala"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Repetir Voz</span>
            </button>

            <button
              type="button"
              onClick={handleSkipAll}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Pular toda a introdução e ir direto ao mapa"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Pular Introdução</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs sm:text-sm font-mono tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center gap-2 cursor-pointer transform hover:scale-105"
          >
            <span>{dialogueIndex < dialogues.length - 1 ? 'PRÓXIMO DIÁLOGO' : 'ABRIR MAPA DA ESTAÇÃO'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
