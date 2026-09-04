import React, { useState } from 'react';
import { 
  Zap, 
  FlaskConical, 
  ArrowLeft, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Flame, 
  Eye, 
  EyeOff, 
  Gauge, 
  Info,
  Lightbulb,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { formatNumber } from '../utils/physics';
import { sound } from '../utils/audio';

interface FreeLaboratoryProps {
  onBack: () => void;
}

interface LabResistor {
  id: string;
  name: string;
  rValue: number; // in Ohms
  type: 'fixed' | 'bulb' | 'motor';
  current?: number;
  voltage?: number;
  power?: number;
}

export const FreeLaboratory: React.FC<FreeLaboratoryProps> = ({ onBack }) => {
  const [circuitType, setCircuitType] = useState<'series' | 'parallel'>('series');
  const [voltage, setVoltage] = useState<number>(24); // Volts
  const [switchClosed, setSwitchClosed] = useState<boolean>(true);
  const [thermalVision, setThermalVision] = useState<boolean>(false);
  const [fuseMaxCurrent, setFuseMaxCurrent] = useState<number>(5.0); // Amperes
  const [fuseBlown, setFuseBlown] = useState<boolean>(false);
  
  // Dynamic components
  const [resistors, setResistors] = useState<LabResistor[]>([
    { id: 'R1', name: 'Resistor R1', rValue: 12, type: 'fixed' },
    { id: 'L1', name: 'Lâmpada LED', rValue: 24, type: 'bulb' },
  ]);

  // Multimeter probe state
  const [probeMode, setProbeMode] = useState<'none' | 'voltage' | 'current' | 'resistance'>('none');
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  // Physics Calculations
  let req = 0;
  if (circuitType === 'series') {
    req = resistors.reduce((sum, r) => sum + r.rValue, 0);
  } else {
    // Parallel
    if (resistors.length > 0 && resistors.every(r => r.rValue > 0)) {
      const sumInv = resistors.reduce((sum, r) => sum + (1 / r.rValue), 0);
      req = sumInv > 0 ? 1 / sumInv : 0;
    }
  }

  const totalCurrent = switchClosed && !fuseBlown && req > 0 ? voltage / req : 0;
  const isOvercurrent = totalCurrent > fuseMaxCurrent && switchClosed;

  // Trigger fuse blow if overcurrent
  React.useEffect(() => {
    if (isOvercurrent && !fuseBlown) {
      setFuseBlown(true);
      sound.playError();
    }
  }, [isOvercurrent, fuseBlown]);

  const toggleSwitch = () => {
    sound.playClick();
    setSwitchClosed(!switchClosed);
  };

  const handleResetFuse = () => {
    sound.playSuccess();
    setFuseBlown(false);
  };

  const handleAddResistor = (type: 'fixed' | 'bulb' | 'motor') => {
    sound.playClick();
    if (resistors.length >= 4) return;
    const newId = `${type === 'bulb' ? 'L' : type === 'motor' ? 'M' : 'R'}${resistors.length + 1}`;
    setResistors([
      ...resistors,
      {
        id: newId,
        name: type === 'bulb' ? `Lâmpada ${newId}` : type === 'motor' ? `Motor ${newId}` : `Resistor ${newId}`,
        rValue: type === 'bulb' ? 20 : 15,
        type,
      },
    ]);
  };

  const handleRemoveResistor = (id: string) => {
    sound.playClick();
    if (resistors.length <= 1) return;
    setResistors(resistors.filter(r => r.id !== id));
    if (selectedComponentId === id) setSelectedComponentId(null);
  };

  const handleUpdateRValue = (id: string, newVal: number) => {
    if (newVal <= 0) return;
    setResistors(resistors.map(r => r.id === id ? { ...r, rValue: newVal } : r));
  };

  // Component specific values
  const getComponentMetrics = (r: LabResistor) => {
    if (!switchClosed || fuseBlown || req === 0) {
      return { u: 0, i: 0, p: 0, tempC: 25 };
    }

    let u = 0;
    let i = 0;
    if (circuitType === 'series') {
      i = totalCurrent;
      u = i * r.rValue;
    } else {
      u = voltage;
      i = r.rValue > 0 ? u / r.rValue : 0;
    }
    const p = u * i;
    // Estimated thermal equilibrium temperature in Celsius: 25 + P * 1.5
    const tempC = 25 + p * 1.4;
    return { u, i, p, tempC };
  };

  const selectedMetrics = selectedComponentId 
    ? resistors.find(r => r.id === selectedComponentId) 
      ? getComponentMetrics(resistors.find(r => r.id === selectedComponentId)!)
      : null
    : null;

  return (
    <div id="free-laboratory-sandbox" className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 flex flex-col">
      {/* Top Bar Navigation */}
      <div className="max-w-7xl w-full mx-auto flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-cyan-500/30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { sound.playClick(); onBack(); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar à Estação</span>
          </button>

          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-cyan-400" />
              <span>Laboratório de Eletrodinâmica & Bancada Livre</span>
            </h1>
            <p className="text-xs text-slate-400">
              Ambiente de simulação em tempo real para testes de Leis de Ohm, associação de resistores e efeito Joule.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Thermal Vision Toggle */}
          <button
            type="button"
            onClick={() => { sound.playClick(); setThermalVision(!thermalVision); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
              thermalVision 
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]' 
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className={`w-4 h-4 ${thermalVision ? 'text-rose-400 animate-pulse' : ''}`} />
            <span>Termovisão Joule: {thermalVision ? 'LIGADA' : 'DESLIGADA'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Control Panel + Circuit Canvas + Telemetry */}
      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        
        {/* Left Side: Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Circuit Topology & Source Card */}
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 space-y-4 backdrop-blur-md">
            <h3 className="font-bold text-xs uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Configuração da Fonte & Topologia</span>
            </h3>

            {/* Topology Select */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => { sound.playClick(); setCircuitType('series'); }}
                className={`py-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                  circuitType === 'series'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Associação em Série
              </button>
              <button
                type="button"
                onClick={() => { sound.playClick(); setCircuitType('parallel'); }}
                className={`py-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                  circuitType === 'parallel'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Associação em Paralelo
              </button>
            </div>

            {/* Voltage Presets */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-slate-300">
                <span>Tensão do Gerador (U):</span>
                <span className="font-bold text-cyan-300">{voltage} V</span>
              </div>
              <input
                type="range"
                min="0"
                max="240"
                step="2"
                value={voltage}
                onChange={(e) => setVoltage(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between gap-1 text-[10px] font-mono">
                {[12, 24, 110, 220].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { sound.playClick(); setVoltage(v); }}
                    className={`px-2 py-0.5 rounded border ${voltage === v ? 'bg-cyan-950 border-cyan-400 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                  >
                    {v}V
                  </button>
                ))}
              </div>
            </div>

            {/* Switch and Fuse */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={toggleSwitch}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer ${
                  switchClosed
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                {switchClosed ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-amber-400" />}
                <span>Chave: {switchClosed ? 'FECHADA' : 'ABERTA'}</span>
              </button>

              <div className={`p-2 rounded-xl border flex flex-col justify-center text-center font-mono text-[11px] ${
                fuseBlown 
                  ? 'bg-rose-950/80 border-rose-500 text-rose-300' 
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}>
                {fuseBlown ? (
                  <div className="space-y-1">
                    <span className="font-bold text-rose-400 flex items-center justify-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> FUSÍVEL QUEIMOU!
                    </span>
                    <button
                      type="button"
                      onClick={handleResetFuse}
                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer"
                    >
                      Trocar Fusível
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1 text-cyan-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Fusível: {fuseMaxCurrent}A Máx</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Component Inventory & Modifiers */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 font-mono">
                Componentes no Circuito ({resistors.length}/4)
              </h3>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleAddResistor('fixed')}
                  disabled={resistors.length >= 4}
                  className="px-2 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  title="Adicionar Resistor Ôhmico"
                >
                  <Plus className="w-3 h-3" /> Resistor
                </button>
                <button
                  type="button"
                  onClick={() => handleAddResistor('bulb')}
                  disabled={resistors.length >= 4}
                  className="px-2 py-1 rounded-lg bg-amber-950 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-[10px] font-mono flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  title="Adicionar Lâmpada Incandescente"
                >
                  <Plus className="w-3 h-3" /> Lâmpada
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {resistors.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedComponentId(r.id)}
                  className={`p-2.5 rounded-xl border font-mono text-xs transition-all cursor-pointer ${
                    selectedComponentId === r.id
                      ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      {r.type === 'bulb' ? <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> : <Zap className="w-3.5 h-3.5 text-cyan-400" />}
                      {r.name}
                    </span>
                    {resistors.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveResistor(r.id); }}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">R:</span>
                    <input
                      type="range"
                      min="2"
                      max="100"
                      step="1"
                      value={r.rValue}
                      onChange={(e) => handleUpdateRValue(r.id, parseFloat(e.target.value))}
                      className="flex-1 accent-cyan-400 cursor-pointer"
                    />
                    <span className="font-bold text-cyan-300 w-12 text-right">{r.rValue} Ω</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center & Right: Visual Circuit Simulation Stage + Telemetry (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Main Visual SVG Simulation Canvas */}
          <div className="bg-slate-950 border border-cyan-500/30 rounded-3xl p-5 relative overflow-hidden shadow-[inset_0_0_40px_rgba(6,182,212,0.1)]">
            
            {/* Grid Pattern */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#06b6d4 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* Canvas Header */}
            <div className="relative z-10 flex items-center justify-between pb-3 mb-2 border-b border-cyan-500/20 text-xs font-mono">
              <div className="flex items-center gap-2 text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-bold">Bancada Virtual: {circuitType === 'series' ? 'Circuito em Série' : 'Circuito em Paralelo'}</span>
              </div>
              <div className="text-slate-400">
                {switchClosed && !fuseBlown ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Corrente Ativa: {formatNumber(totalCurrent, 3)} A
                  </span>
                ) : fuseBlown ? (
                  <span className="text-rose-400 font-bold">Circuito Interrompido (Fusível)</span>
                ) : (
                  <span className="text-amber-400">Circuito Aberto</span>
                )}
              </div>
            </div>

            {/* SVG Interactive Visualizer */}
            <div className="relative z-10 w-full h-[260px] sm:h-[300px] flex items-center justify-center">
              <svg viewBox="0 0 700 320" className="w-full h-full select-none">
                <defs>
                  {/* Current flow marker */}
                  <marker id="labFlowArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#06b6d4" />
                  </marker>
                  
                  {/* Glow Filters */}
                  <filter id="bulbGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Circuit Wiring Base */}
                {circuitType === 'series' ? (
                  /* SERIES CIRCUIT SVG */
                  <g>
                    {/* Main Loop Path */}
                    <path
                      d="M 80 160 L 80 60 L 620 60 L 620 260 L 80 260 Z"
                      fill="none"
                      stroke={switchClosed && !fuseBlown ? (thermalVision ? '#f43f5e' : '#06b6d4') : '#334155'}
                      strokeWidth={thermalVision ? '5' : '3'}
                      strokeDasharray={switchClosed && !fuseBlown ? '8 4' : 'none'}
                      className={switchClosed && !fuseBlown ? 'animate-flow' : ''}
                    />

                    {/* DC Voltage Source (Left) */}
                    <g transform="translate(80, 160)">
                      <circle cx="0" cy="0" r="28" fill="#090d16" stroke="#0ea5e9" strokeWidth="2.5" />
                      <text x="0" y="-4" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="monospace">FONTE</text>
                      <text x="0" y="12" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="extrabold" fontFamily="monospace">{voltage}V</text>
                      <text x="-16" y="-20" fill="#22c55e" fontSize="12" fontWeight="bold">+</text>
                      <text x="-16" y="32" fill="#ef4444" fontSize="14" fontWeight="bold">-</text>
                    </g>

                    {/* Key / Switch (Bottom) */}
                    <g transform="translate(350, 260)" onClick={toggleSwitch} className="cursor-pointer">
                      <rect x="-35" y="-14" width="70" height="28" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                      <line x1="-25" y1="0" x2="-8" y2="0" stroke="#0ea5e9" strokeWidth="3" />
                      <line x1="8" y1="0" x2="25" y2="0" stroke="#0ea5e9" strokeWidth="3" />
                      {switchClosed ? (
                        <line x1="-8" y1="0" x2="8" y2="0" stroke="#22c55e" strokeWidth="3" />
                      ) : (
                        <line x1="-8" y1="0" x2="6" y2="-12" stroke="#f59e0b" strokeWidth="3" />
                      )}
                      <text x="0" y="22" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">CHAVE</text>
                    </g>

                    {/* Resistors Distributed on Top Bar */}
                    {resistors.map((r, idx) => {
                      const spacing = 500 / (resistors.length + 1);
                      const posX = 100 + spacing * (idx + 1);
                      const metrics = getComponentMetrics(r);
                      const isSelected = selectedComponentId === r.id;

                      return (
                        <g 
                          key={r.id} 
                          transform={`translate(${posX}, 60)`} 
                          onClick={() => setSelectedComponentId(r.id)} 
                          className="cursor-pointer group"
                        >
                          {/* Selection Highlight */}
                          {isSelected && (
                            <circle cx="0" cy="0" r="38" fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="4 2" />
                          )}

                          {r.type === 'bulb' ? (
                            /* Lamp Icon with Dynamic Glow */
                            <g>
                              {metrics.p > 0 && (
                                <circle 
                                  cx="0" 
                                  cy="0" 
                                  r={Math.min(36, 14 + metrics.p * 0.8)} 
                                  fill="#fbbf24" 
                                  opacity={Math.min(0.8, 0.2 + metrics.p * 0.03)} 
                                  filter="url(#bulbGlow)" 
                                />
                              )}
                              <circle cx="0" cy="0" r="20" fill="#090d16" stroke={isSelected ? '#38bdf8' : '#eab308'} strokeWidth="2" />
                              <line x1="-12" y1="-12" x2="12" y2="12" stroke="#fef08a" strokeWidth="2" />
                              <line x1="-12" y1="12" x2="12" y2="-12" stroke="#fef08a" strokeWidth="2" />
                            </g>
                          ) : (
                            /* Standard Resistor Zigzag / Box */
                            <g>
                              <rect 
                                x="-32" 
                                y="-18" 
                                width="64" 
                                height="36" 
                                rx="8" 
                                fill={thermalVision ? (metrics.tempC > 60 ? '#991b1b' : metrics.tempC > 40 ? '#b45309' : '#0f172a') : '#090d16'} 
                                stroke={isSelected ? '#22d3ee' : thermalVision ? '#f43f5e' : '#0ea5e9'} 
                                strokeWidth="2" 
                              />
                              <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="monospace">
                                {r.rValue} Ω
                              </text>
                            </g>
                          )}

                          {/* Labels */}
                          <text x="0" y="-26" textAnchor="middle" fill={isSelected ? '#22d3ee' : '#94a3b8'} fontSize="11" fontWeight="bold" fontFamily="monospace">
                            {r.name}
                          </text>
                          <text x="0" y="32" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="monospace">
                            {thermalVision ? `${formatNumber(metrics.tempC, 0)}°C` : `${formatNumber(metrics.u, 1)}V | ${formatNumber(metrics.i, 2)}A`}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                ) : (
                  /* PARALLEL CIRCUIT SVG */
                  <g>
                    {/* Left & Right Rails */}
                    <line x1="120" y1="60" x2="120" y2="260" stroke="#0ea5e9" strokeWidth="4" />
                    <line x1="580" y1="60" x2="580" y2="260" stroke="#0ea5e9" strokeWidth="4" />

                    {/* Bottom Return with DC Source */}
                    <path
                      d="M 120 260 L 580 260"
                      fill="none"
                      stroke={switchClosed && !fuseBlown ? '#06b6d4' : '#334155'}
                      strokeWidth="3"
                    />

                    {/* DC Source */}
                    <g transform="translate(350, 260)">
                      <circle cx="0" cy="0" r="24" fill="#090d16" stroke="#0ea5e9" strokeWidth="2.5" />
                      <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="extrabold" fontFamily="monospace">{voltage}V</text>
                    </g>

                    {/* Parallel Branches */}
                    {resistors.map((r, idx) => {
                      const spacing = 180 / (resistors.length + 1);
                      const posY = 70 + spacing * (idx + 1);
                      const metrics = getComponentMetrics(r);
                      const isSelected = selectedComponentId === r.id;

                      return (
                        <g key={r.id} transform={`translate(0, ${posY})`}>
                          {/* Branch Wire */}
                          <line
                            x1="120"
                            y1="0"
                            x2="580"
                            y2="0"
                            stroke={switchClosed && !fuseBlown ? (thermalVision ? '#f43f5e' : '#06b6d4') : '#334155'}
                            strokeWidth={thermalVision ? '4' : '2.5'}
                            strokeDasharray={switchClosed && !fuseBlown ? '6 3' : 'none'}
                            className={switchClosed && !fuseBlown ? 'animate-flow' : ''}
                          />

                          {/* Node dots */}
                          <circle cx="120" cy="0" r="4" fill="#38bdf8" />
                          <circle cx="580" cy="0" r="4" fill="#38bdf8" />

                          {/* Component Center */}
                          <g 
                            transform="translate(350, 0)" 
                            onClick={() => setSelectedComponentId(r.id)} 
                            className="cursor-pointer group"
                          >
                            {isSelected && (
                              <circle cx="0" cy="0" r="34" fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="4 2" />
                            )}

                            {r.type === 'bulb' ? (
                              <g>
                                {metrics.p > 0 && (
                                  <circle cx="0" cy="0" r="30" fill="#fbbf24" opacity={Math.min(0.8, 0.2 + metrics.p * 0.04)} filter="url(#bulbGlow)" />
                                )}
                                <circle cx="0" cy="0" r="18" fill="#090d16" stroke={isSelected ? '#38bdf8' : '#eab308'} strokeWidth="2" />
                                <line x1="-10" y1="-10" x2="10" y2="10" stroke="#fef08a" strokeWidth="2" />
                                <line x1="-10" y1="10" x2="10" y2="-10" stroke="#fef08a" strokeWidth="2" />
                              </g>
                            ) : (
                              <rect 
                                x="-30" 
                                y="-16" 
                                width="60" 
                                height="32" 
                                rx="6" 
                                fill={thermalVision ? (metrics.tempC > 60 ? '#991b1b' : metrics.tempC > 40 ? '#b45309' : '#0f172a') : '#090d16'} 
                                stroke={isSelected ? '#22d3ee' : thermalVision ? '#f43f5e' : '#0ea5e9'} 
                                strokeWidth="2" 
                              />
                            )}

                            <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="monospace">
                              {r.rValue} Ω
                            </text>

                            {/* Telemetry info above and below */}
                            <text x="-60" y="4" textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                              {r.name}
                            </text>
                            <text x="60" y="4" textAnchor="start" fill="#38bdf8" fontSize="10" fontFamily="monospace">
                              {formatNumber(metrics.i, 2)} A | {formatNumber(metrics.p, 1)} W
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </g>
                )}
              </svg>
            </div>
          </div>

          {/* Real-Time Live Telemetry & Inspector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Req */}
            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl font-mono">
              <span className="text-[11px] text-slate-400 block mb-1">Resistência Equivalente (Req):</span>
              <div className="text-xl font-black text-cyan-300 flex items-center justify-between">
                <span>{formatNumber(req, 2)} Ω</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-400">
                  {circuitType === 'series' ? 'Série' : 'Paralelo'}
                </span>
              </div>
            </div>

            {/* Total Current */}
            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl font-mono">
              <span className="text-[11px] text-slate-400 block mb-1">Corrente Total do Gerador (I):</span>
              <div className="text-xl font-black text-emerald-400 flex items-center justify-between">
                <span>{formatNumber(totalCurrent, 3)} A</span>
                <span className="text-xs text-slate-500">U = {voltage}V</span>
              </div>
            </div>

            {/* Total Power */}
            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl font-mono">
              <span className="text-[11px] text-slate-400 block mb-1">Potência Total Dissipada (P):</span>
              <div className="text-xl font-black text-purple-300 flex items-center justify-between">
                <span>{formatNumber(voltage * totalCurrent, 2)} W</span>
                <span className="text-xs text-slate-500">P = U · I</span>
              </div>
            </div>
          </div>

          {/* Detailed Component Inspector when clicked */}
          {selectedComponentId && selectedMetrics && (
            <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs animate-fadeIn">
              <div>
                <span className="text-cyan-400 font-bold block text-sm">
                  Inspetor do Componente: {resistors.find(r => r.id === selectedComponentId)?.name}
                </span>
                <span className="text-slate-400 text-[11px]">
                  Valor Nominal: {resistors.find(r => r.id === selectedComponentId)?.rValue} Ω
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block">DDP nos Terminais (U)</span>
                  <span className="font-bold text-cyan-300 text-sm">{formatNumber(selectedMetrics.u, 2)} V</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block">Corrente no Ramo (I)</span>
                  <span className="font-bold text-emerald-300 text-sm">{formatNumber(selectedMetrics.i, 3)} A</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block">Potência Dissipada (P)</span>
                  <span className="font-bold text-purple-300 text-sm">{formatNumber(selectedMetrics.p, 2)} W</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block">Temperatura Joule</span>
                  <span className="font-bold text-rose-400 text-sm">{formatNumber(selectedMetrics.tempC, 0)} °C</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
