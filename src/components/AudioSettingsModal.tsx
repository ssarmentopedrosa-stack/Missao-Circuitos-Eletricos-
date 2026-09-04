import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  Music, 
  Sparkles, 
  X, 
  Check, 
  RotateCcw, 
  Play, 
  Radio, 
  Headphones, 
  Sliders, 
  Zap 
} from 'lucide-react';
import { AudioSettings } from '../types';
import { tigraoVoice } from '../utils/tigraoVoice';
import { sound } from '../utils/audio';

interface AudioSettingsModalProps {
  onClose: () => void;
  onSettingsChanged?: (settings: AudioSettings) => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  onClose,
  onSettingsChanged,
}) => {
  const [settings, setSettings] = useState<AudioSettings>({ ...tigraoVoice.settings });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    // Fetch available voices on load
    const voices = tigraoVoice.getAvailablePtVoices();
    setAvailableVoices(voices);
  }, []);

  const updateSetting = (key: keyof AudioSettings, value: unknown) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    tigraoVoice.saveSettings(updated);
    if (onSettingsChanged) {
      onSettingsChanged(updated);
    }
  };

  const handleTestVoice = () => {
    sound.playClick();
    tigraoVoice.speak(
      'Câmbio, astronauta! Conexão de áudio estabelecida com sucesso! Vamos consertar esses circuitos elétricos juntos!'
    );
  };

  const handleTestSfx = () => {
    sound.playClick();
    sound.playSuccess();
  };

  const handleResetDefaults = () => {
    sound.playClick();
    const defaults: AudioSettings = {
      voiceVolume: 0.95,
      musicVolume: 0.5,
      sfxVolume: 0.8,
      isMuted: false,
      voiceEnabled: true,
      musicEnabled: true,
      voiceFilter: 'space_helmet',
      voiceTone: 'energetic_young',
      selectedVoiceURI: undefined,
    };
    setSettings(defaults);
    tigraoVoice.saveSettings(defaults);
    if (onSettingsChanged) {
      onSettingsChanged(defaults);
    }
  };

  return (
    <div id="audio-settings-modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl my-auto bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-cyan-500/60 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(6,182,212,0.3)] space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/30 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black font-mono text-white tracking-wide">
                CENTRAL DE ÁUDIO & VOZ DO TIGRÃO
              </h3>
              <p className="text-xs text-cyan-400 font-mono">
                Personalize o tom jovem/animado, filtros de capacete espacial e volumes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { sound.playClick(); onClose(); }}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Fechar Configurações"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Master Mute & Voice Toggle Quick Toggles */}
        <div className="grid grid-cols-2 gap-3">
          {/* Mute Master */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              updateSetting('isMuted', !settings.isMuted);
            }}
            className={`p-3 rounded-2xl border flex items-center gap-2.5 sm:gap-3 transition-all cursor-pointer ${
              settings.isMuted
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                : 'bg-slate-950/80 border-cyan-500/30 text-slate-300 hover:border-cyan-400'
            }`}
          >
            {settings.isMuted ? (
              <VolumeX className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <Volume2 className="w-5 h-5 text-cyan-400 shrink-0" />
            )}
            <div className="text-left">
              <div className="text-xs font-mono font-bold uppercase">
                {settings.isMuted ? 'MUDO: ATIVADO' : 'ÁUDIO GERAL'}
              </div>
              <div className="text-[10px] text-slate-400">
                {settings.isMuted ? 'Silêncio total' : 'Sons do jogo ativos'}
              </div>
            </div>
          </button>

          {/* Tigrão Voice Toggle */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              updateSetting('voiceEnabled', !settings.voiceEnabled);
            }}
            className={`p-3 rounded-2xl border flex items-center gap-2.5 sm:gap-3 transition-all cursor-pointer ${
              settings.voiceEnabled && !settings.isMuted
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-slate-950/80 border-slate-800 text-slate-400'
            }`}
          >
            {settings.voiceEnabled && !settings.isMuted ? (
              <Mic className="w-5 h-5 text-cyan-400 shrink-0" />
            ) : (
              <MicOff className="w-5 h-5 text-slate-500 shrink-0" />
            )}
            <div className="text-left">
              <div className="text-xs font-mono font-bold uppercase">
                {settings.voiceEnabled ? 'VOZ: LIGADA' : 'VOZ: DESLIGADA'}
              </div>
              <div className="text-[10px] text-slate-400">
                {settings.voiceEnabled ? 'Narração do Tigrão ativa' : 'Somente texto na tela'}
              </div>
            </div>
          </button>
        </div>

        {/* Voice Personality & Tone Selection */}
        <div className="bg-slate-950/90 rounded-2xl p-4 border border-cyan-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              ESTILO & ENERGIA DA VOZ
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
              Personalidade
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {
                id: 'energetic_young',
                label: 'Jovem & Animado',
                desc: 'Companheiro enérgico (Padrão)',
                badge: '⚡ RECOMENDADO',
              },
              {
                id: 'cheerful_kid',
                label: 'Super Vibrante',
                desc: 'Tom mais agudo e rápido',
                badge: '🌟 ENTUSIASTA',
              },
              {
                id: 'heroic_cadet',
                label: 'Cadete Espacial',
                desc: 'Foco e determinação',
                badge: '🚀 CADETE',
              },
              {
                id: 'calm_mentor',
                label: 'Instrutor Calmo',
                desc: 'Tom pausado e seguro',
                badge: '🛡 MENTOR',
              },
            ].map((tone) => (
              <button
                key={tone.id}
                type="button"
                onClick={() => {
                  sound.playClick();
                  updateSetting('voiceTone', tone.id);
                }}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  settings.voiceTone === tone.id
                    ? 'bg-cyan-900/60 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className={`text-[11px] font-mono font-bold ${
                    settings.voiceTone === tone.id ? 'text-cyan-200' : 'text-slate-300'
                  }`}>
                    {tone.label}
                  </div>
                  <div className="text-[9px] text-slate-400 leading-tight mt-0.5">
                    {tone.desc}
                  </div>
                </div>
                <div className={`text-[8px] font-mono mt-2 self-start px-1.5 py-0.5 rounded ${
                  settings.voiceTone === tone.id
                    ? 'bg-cyan-400 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {tone.badge}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Audio Filter Selector: Capacete Espacial vs Estúdio Limpo */}
        <div className="bg-slate-950/90 rounded-2xl p-4 border border-cyan-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-cyan-400" />
              FILTRO SONORO DE AMBIENTAÇÃO
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
              Efeito do Comunicador
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              {
                id: 'space_helmet',
                label: 'Capacete Espacial',
                desc: 'Beep futurista de rádio + filtro comemorativo',
                icon: Radio,
              },
              {
                id: 'clean_studio',
                label: 'Estúdio Limpo',
                desc: 'Voz limpa e direta sem ruídos de rádio',
                icon: Headphones,
              },
              {
                id: 'vintage_radio',
                label: 'Rádio Orbital',
                desc: 'Efeito analógico de transmissão',
                icon: Sparkles,
              },
            ].map((filter) => {
              const IconComp = filter.icon;
              const isSelected = settings.voiceFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    updateSetting('voiceFilter', filter.id);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span className="text-[11px] font-mono font-bold leading-tight">
                      {filter.label}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-tight">
                    {filter.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Voice Selector (if browser has multiple pt-BR voices) */}
        {availableVoices.length > 1 && (
          <div className="bg-slate-950/90 rounded-2xl p-4 border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                TIMBRE DO SISTEMA (VOZ SINTETIZADA)
              </span>
              <span className="text-[10px] text-slate-400">
                {availableVoices.length} vozes detectadas
              </span>
            </div>
            <select
              value={settings.selectedVoiceURI || ''}
              onChange={(e) => updateSetting('selectedVoiceURI', e.target.value || undefined)}
              className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="">Automático (Melhor voz dinâmica recomendada)</option>
              {availableVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Volume Sliders Area */}
        <div className="space-y-3.5 bg-slate-950/80 rounded-2xl p-4 border border-cyan-500/30">
          {/* 1. Tigrao Voice Volume */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
                VOLUME DA VOZ DO TIGRÃO
              </span>
              <span className="text-cyan-400 font-extrabold">
                {Math.round(settings.voiceVolume * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.voiceVolume}
                disabled={settings.isMuted || !settings.voiceEnabled}
                onChange={(e) => updateSetting('voiceVolume', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer disabled:opacity-40"
              />
              <button
                type="button"
                onClick={handleTestVoice}
                disabled={settings.isMuted || !settings.voiceEnabled}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-slate-950 text-xs font-mono font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                title="Ouvir demonstração com as configurações atuais"
              >
                <Play className="w-3 h-3 fill-slate-950" />
                <span>Ouvir Voz</span>
              </button>
            </div>
          </div>

          {/* 2. SFX Volume */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                EFEITOS SONOROS (SFX)
              </span>
              <span className="text-emerald-400 font-extrabold">
                {Math.round(settings.sfxVolume * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                disabled={settings.isMuted}
                onChange={(e) => updateSetting('sfxVolume', parseFloat(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer disabled:opacity-40"
              />
              <button
                type="button"
                onClick={handleTestSfx}
                disabled={settings.isMuted}
                className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/40 hover:bg-emerald-900 disabled:opacity-40 text-emerald-200 text-[11px] font-mono font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                title="Testar Efeito Sonoro"
              >
                <Play className="w-3 h-3 fill-emerald-200" />
                <span>Testar SFX</span>
              </button>
            </div>
          </div>

          {/* 3. Music Volume */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-amber-300 font-bold flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-amber-400" />
                MÚSICA DE AMBIENTAÇÃO ESPACIAL
              </span>
              <span className="text-amber-400 font-extrabold">
                {Math.round(settings.musicVolume * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                disabled={settings.isMuted}
                onChange={(e) => updateSetting('musicVolume', parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrões</span>
          </button>

          <button
            type="button"
            onClick={() => { sound.playClick(); onClose(); }}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-mono font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center gap-2 cursor-pointer transition-all"
          >
            <Check className="w-4 h-4" />
            <span>SALVAR & APLICAR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
