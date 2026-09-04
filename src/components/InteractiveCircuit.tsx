import React, { useState } from 'react';
import { CircuitConfig } from '../types';
import { Zap, Activity, Info, ToggleLeft, ToggleRight, Sparkles, Gauge } from 'lucide-react';
import { sound } from '../utils/audio';

interface InteractiveCircuitProps {
  config?: CircuitConfig;
  isEnergized?: boolean;
  onComponentClick?: (id: string) => void;
  selectedComponentId?: string | null;
  interactiveMode?: boolean;
}

export const InteractiveCircuit: React.FC<InteractiveCircuitProps> = ({
  config,
  isEnergized = false,
  onComponentClick,
  selectedComponentId,
  interactiveMode = true,
}) => {
  const [switchClosed, setSwitchClosed] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'diagram' | 'telemetry'>('diagram');
  const [groupedBlocks, setGroupedBlocks] = useState<Record<string, boolean>>({});

  const effectiveConfig: CircuitConfig = config || {
    type: 'single',
    voltage: 120,
    resistors: [
      { id: 'R1', label: 'Carga Ôhmica Principal (R1)', value: 20, unit: 'Ω', state: 'normal' }
    ],
    description: 'Circuito de bancada da Estação Orbital ARES-III com fonte e barramento de teste.'
  };

  const toggleSwitch = () => {
    sound.playClick();
    setSwitchClosed(!switchClosed);
  };

  const handleGroupToggle = (blockId: string) => {
    sound.playClick();
    setGroupedBlocks(prev => ({
      ...prev,
      [blockId]: !prev[blockId]
    }));
  };

  const activeCurrent = switchClosed && isEnergized;

  return (
    <div id="interactive-circuit-board" className="relative bg-slate-950/80 border border-cyan-500/30 rounded-2xl p-4 overflow-hidden backdrop-blur-md shadow-[inset_0_0_30px_rgba(6,182,212,0.1)]">
      {/* Background Tech Grid */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(#06b6d4 1px, transparent 1px), radial-gradient(#06b6d4 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px'
        }}
      />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b border-cyan-500/20 text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${activeCurrent ? 'bg-emerald-400 animate-ping' : isEnergized ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="font-mono uppercase font-bold tracking-wider text-cyan-300">
            {effectiveConfig.type === 'series' && 'Esquema Elétrico — Associação em Série'}
            {effectiveConfig.type === 'parallel' && 'Esquema Elétrico — Associação em Paralelo'}
            {effectiveConfig.type === 'mixed' && 'Esquema Elétrico — Circuito Misto (Nós e Ramos)'}
            {effectiveConfig.type === 'single' && 'Esquema Elétrico — Barramento com Carga Ôhmica'}
            {effectiveConfig.type === 'meter_test' && 'Esquema Elétrico — Bancada de Instrumentos (A e V)'}
            {effectiveConfig.type === 'joule_cable' && 'Esquema Elétrico — Circuito Térmico (Efeito Joule)'}
            {effectiveConfig.type === 'power_grid' && 'Esquema Elétrico — Rede de Suporte de Vida'}
            {effectiveConfig.type === 'final_core' && 'Esquema Elétrico — Matriz do Núcleo da Estação'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch toggle control */}
          <button
            type="button"
            onClick={toggleSwitch}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono transition-colors cursor-pointer ${
              switchClosed 
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300' 
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
            title="Abrir ou fechar a chave geral do circuito"
          >
            {switchClosed ? (
              <>
                <ToggleRight className="w-4 h-4 text-emerald-400" />
                <span>Chave: FECHADA</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-amber-400" />
                <span>Chave: ABERTA</span>
              </>
            )}
          </button>

          {/* Telemetry Tab Switcher */}
          <div className="flex bg-slate-900/90 rounded-lg p-0.5 border border-cyan-500/20">
            <button
              type="button"
              onClick={() => setActiveTab('diagram')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                activeTab === 'diagram' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Diagrama
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('telemetry')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                activeTab === 'telemetry' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Telemetria
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'diagram' ? (
        /* Circuit SVG Visualizer Canvas */
        <div className="relative w-full aspect-[16/9] max-h-[320px] bg-slate-900/60 rounded-xl border border-cyan-500/20 flex items-center justify-center p-2">
          <svg viewBox="0 0 600 320" className="w-full h-full select-none">
            <defs>
              {/* Wire Gradient */}
              <linearGradient id="wireGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>

              {/* Animated Current Dash Pattern */}
              <style>
                {`
                  @keyframes dashFlow {
                    to {
                      stroke-dashoffset: -40;
                    }
                  }
                  .flow-active {
                    animation: dashFlow 1.2s linear infinite;
                  }
                  .glow-bulb {
                    filter: drop-shadow(0 0 12px #facc15);
                  }
                  .glow-heat {
                    filter: drop-shadow(0 0 15px #f97316);
                  }
                `}
              </style>
            </defs>

            {/* CIRCUIT: SERIES LAYOUT */}
            {effectiveConfig.type === 'series' && (
              <g>
                {/* Main Circuit Loop Wires */}
                {/* Top Wire */}
                <path d="M 100 80 L 500 80" stroke="#334155" strokeWidth="4" fill="none" />
                {/* Right Wire */}
                <path d="M 500 80 L 500 240" stroke="#334155" strokeWidth="4" fill="none" />
                {/* Bottom Wire */}
                <path d="M 500 240 L 100 240" stroke="#334155" strokeWidth="4" fill="none" />
                {/* Left Wire */}
                <path d="M 100 240 L 100 80" stroke="#334155" strokeWidth="4" fill="none" />

                {/* Animated Current Overlay if Closed */}
                {switchClosed && (
                  <>
                    <path
                      d="M 100 240 L 100 80 L 500 80 L 500 240 L 100 240"
                      stroke="#22d3ee"
                      strokeWidth="3"
                      strokeDasharray="8, 12"
                      fill="none"
                      className="flow-active"
                      opacity="0.85"
                    />
                  </>
                )}

                {/* Battery (Left branch) */}
                <g transform="translate(100, 160)">
                  <circle cx="0" cy="0" r="22" fill="#0f172a" stroke="#06b6d4" strokeWidth="2" />
                  <line x1="-12" y1="-8" x2="12" y2="-8" stroke="#ef4444" strokeWidth="3" />
                  <line x1="-6" y1="8" x2="6" y2="8" stroke="#3b82f6" strokeWidth="3" />
                  <text x="-38" y="-5" fill="#f87171" fontSize="11" fontWeight="bold" fontFamily="monospace">+</text>
                  <text x="-38" y="15" fill="#60a5fa" fontSize="11" fontWeight="bold" fontFamily="monospace">-</text>
                  <text x="-65" y="4" fill="#38bdf8" fontSize="12" fontWeight="bold" fontFamily="monospace">
                    U = {effectiveConfig.voltage || 120} V
                  </text>
                </g>

                {/* Switch (Bottom branch) */}
                <g transform="translate(300, 240)">
                  <circle cx="-25" cy="0" r="4" fill="#06b6d4" />
                  <circle cx="25" cy="0" r="4" fill="#06b6d4" />
                  {switchClosed ? (
                    <line x1="-25" y1="0" x2="25" y2="0" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
                  ) : (
                    <line x1="-25" y1="0" x2="15" y2="-18" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                  )}
                  <text x="0" y="22" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                    Chave Ch1
                  </text>
                </g>

                {/* 3 Resistors on Top Line (Series) */}
                {(effectiveConfig.resistors || [
                  { id: 'R1', label: 'R1', value: 10, unit: 'Ω' },
                  { id: 'R2', label: 'R2', value: 20, unit: 'Ω' },
                  { id: 'R3', label: 'R3', value: 30, unit: 'Ω' },
                ]).map((res, index) => {
                  const xPos = 180 + index * 120;
                  return (
                    <g 
                      key={res.id} 
                      transform={`translate(${xPos}, 80)`}
                      onClick={() => onComponentClick && onComponentClick(res.id)}
                      className="cursor-pointer group"
                    >
                      {/* Component Box */}
                      <rect
                        x="-30"
                        y="-16"
                        width="60"
                        height="32"
                        rx="6"
                        fill="#1e293b"
                        stroke={selectedComponentId === res.id ? '#facc15' : '#38bdf8'}
                        strokeWidth={selectedComponentId === res.id ? '2.5' : '1.5'}
                        className="group-hover:stroke-cyan-300 transition-all"
                      />
                      {/* Zig-zag resistance symbol inside */}
                      <path
                        d="M -22 0 L -15 -8 L -7 8 L 0 -8 L 7 8 L 15 -8 L 22 0"
                        stroke="#06b6d4"
                        strokeWidth="2"
                        fill="none"
                      />
                      {/* Label & Value */}
                      <text x="0" y="-22" textAnchor="middle" fill="#f1f5f9" fontSize="12" fontWeight="bold" fontFamily="monospace">
                        {res.label}
                      </text>
                      <text x="0" y="30" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="monospace">
                        {res.value} {res.unit}
                      </text>
                    </g>
                  );
                })}

                {/* Series Current Indicator */}
                <g transform="translate(525, 160)">
                  <rect x="-20" y="-18" width="40" height="36" rx="4" fill="#0f172a" stroke="#06b6d4" strokeWidth="1" />
                  <text x="0" y="-4" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">AMP</text>
                  <text x="0" y="10" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="bold" fontFamily="monospace">
                    {switchClosed ? 'I_total' : '0 A'}
                  </text>
                </g>
              </g>
            )}

            {/* CIRCUIT: PARALLEL LAYOUT */}
            {effectiveConfig.type === 'parallel' && (
              <g>
                {/* Main Rails */}
                {/* Left supply node */}
                <path d="M 120 160 L 220 160" stroke="#334155" strokeWidth="4" fill="none" />
                {/* Top & Bottom distribution bars */}
                <path d="M 220 70 L 220 250" stroke="#334155" strokeWidth="4" fill="none" />
                <path d="M 440 70 L 440 250" stroke="#334155" strokeWidth="4" fill="none" />
                {/* Return wire */}
                <path d="M 440 160 L 520 160" stroke="#334155" strokeWidth="4" fill="none" />

                {/* Branches */}
                {(effectiveConfig.resistors || [
                  { id: 'R1', label: 'R1', value: 6, unit: 'Ω', current: 2 },
                  { id: 'R2', label: 'R2', value: 3, unit: 'Ω', current: 4 },
                ]).map((res, index) => {
                  const yPos = 80 + index * 80;
                  return (
                    <g key={res.id}>
                      {/* Branch Wire */}
                      <path d={`M 220 ${yPos} L 440 ${yPos}`} stroke="#334155" strokeWidth="3" fill="none" />
                      
                      {/* Branch Flow */}
                      {switchClosed && (
                        <path
                          d={`M 220 ${yPos} L 440 ${yPos}`}
                          stroke="#22d3ee"
                          strokeWidth="2.5"
                          strokeDasharray="6, 8"
                          fill="none"
                          className="flow-active"
                          opacity="0.85"
                        />
                      )}

                      {/* Resistor Component */}
                      <g 
                        transform={`translate(330, ${yPos})`}
                        onClick={() => onComponentClick && onComponentClick(res.id)}
                        className="cursor-pointer group"
                      >
                        <rect
                          x="-35"
                          y="-16"
                          width="70"
                          height="32"
                          rx="6"
                          fill="#1e293b"
                          stroke={selectedComponentId === res.id ? '#facc15' : '#06b6d4'}
                          strokeWidth="1.5"
                        />
                        <path
                          d="M -25 0 L -17 -7 L -8 7 L 0 -7 L 8 7 L 17 -7 L 25 0"
                          stroke="#38bdf8"
                          strokeWidth="2"
                          fill="none"
                        />
                        <text x="0" y="-20" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold" fontFamily="monospace">
                          {res.label} ({res.value} {res.unit})
                        </text>
                        {res.current && switchClosed && (
                          <text x="0" y="28" textAnchor="middle" fill="#4ade80" fontSize="10" fontFamily="monospace">
                            I_{index + 1} = {res.current} A
                          </text>
                        )}
                      </g>

                      {/* Node dots */}
                      <circle cx="220" cy={yPos} r="5" fill="#06b6d4" />
                      <circle cx="440" cy={yPos} r="5" fill="#06b6d4" />
                    </g>
                  );
                })}

                {/* Battery Left */}
                <g transform="translate(80, 160)">
                  <circle cx="0" cy="0" r="22" fill="#0f172a" stroke="#06b6d4" strokeWidth="2" />
                  <line x1="-10" y1="-8" x2="10" y2="-8" stroke="#ef4444" strokeWidth="3" />
                  <line x1="-5" y1="8" x2="5" y2="8" stroke="#3b82f6" strokeWidth="3" />
                  <text x="0" y="34" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="monospace">
                    U = {effectiveConfig.voltage || 12} V
                  </text>
                </g>

                {/* Switch Right */}
                <g transform="translate(510, 160)">
                  <circle cx="-15" cy="0" r="4" fill="#06b6d4" />
                  <circle cx="15" cy="0" r="4" fill="#06b6d4" />
                  {switchClosed ? (
                    <line x1="-15" y1="0" x2="15" y2="0" stroke="#10b981" strokeWidth="3" />
                  ) : (
                    <line x1="-15" y1="0" x2="10" y2="-15" stroke="#f59e0b" strokeWidth="3" />
                  )}
                </g>
              </g>
            )}

            {/* CIRCUIT: MIXED (SERIES + PARALLEL) */}
            {effectiveConfig.type === 'mixed' && (
              <g>
                {/* Circuit Loop */}
                {/* Battery left */}
                <path d="M 80 160 L 160 160" stroke="#334155" strokeWidth="4" fill="none" />
                
                {/* Resistor R1 in Series */}
                <g 
                  transform="translate(160, 160)" 
                  onClick={() => onComponentClick && onComponentClick('R1')}
                  className="cursor-pointer group"
                >
                  <rect x="-25" y="-16" width="50" height="32" rx="5" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.5" />
                  <path d="M -18 0 L -12 -7 L -6 7 L 0 -7 L 6 7 L 12 -7 L 18 0" stroke="#38bdf8" strokeWidth="2" fill="none" />
                  <text x="0" y="-22" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold" fontFamily="monospace">R1 (Série)</text>
                  <text x="0" y="28" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="monospace">4 Ω</text>
                </g>

                {/* Wire to Parallel Node A */}
                <path d="M 185 160 L 260 160" stroke="#334155" strokeWidth="4" fill="none" />
                <circle cx="260" cy="160" r="5" fill="#facc15" />
                <text x="260" y="145" textAnchor="middle" fill="#facc15" fontSize="10" fontWeight="bold" fontFamily="monospace">Nó A</text>

                {/* Parallel Branch Rails */}
                <path d="M 260 160 L 260 100 L 420 100 L 420 160" stroke="#334155" strokeWidth="3" fill="none" />
                <path d="M 260 160 L 260 220 L 420 220 L 420 160" stroke="#334155" strokeWidth="3" fill="none" />
                
                {/* Node B */}
                <circle cx="420" cy="160" r="5" fill="#facc15" />
                <text x="420" y="145" textAnchor="middle" fill="#facc15" fontSize="10" fontWeight="bold" fontFamily="monospace">Nó B</text>

                {/* Top Parallel Branch R2 */}
                <g 
                  transform="translate(340, 100)" 
                  onClick={() => onComponentClick && onComponentClick('R2')}
                  className="cursor-pointer group"
                >
                  <rect x="-25" y="-15" width="50" height="30" rx="5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                  <path d="M -16 0 L -10 -6 L -5 6 L 0 -6 L 5 6 L 10 -6 L 16 0" stroke="#06b6d4" strokeWidth="2" fill="none" />
                  <text x="0" y="-20" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="monospace">R2 (6 Ω)</text>
                </g>

                {/* Bottom Parallel Branch R3 */}
                <g 
                  transform="translate(340, 220)" 
                  onClick={() => onComponentClick && onComponentClick('R3')}
                  className="cursor-pointer group"
                >
                  <rect x="-25" y="-15" width="50" height="30" rx="5" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                  <path d="M -16 0 L -10 -6 L -5 6 L 0 -6 L 5 6 L 10 -6 L 16 0" stroke="#06b6d4" strokeWidth="2" fill="none" />
                  <text x="0" y="28" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="monospace">R3 (3 Ω)</text>
                </g>

                {/* Return wire to battery */}
                <path d="M 420 160 L 520 160 L 520 280 L 50 280 L 50 160 L 80 160" stroke="#334155" strokeWidth="4" fill="none" />

                {/* Animated Currents */}
                {switchClosed && (
                  <>
                    <path
                      d="M 50 160 L 160 160 L 260 160"
                      stroke="#22d3ee"
                      strokeWidth="3"
                      strokeDasharray="8, 10"
                      fill="none"
                      className="flow-active"
                    />
                    <path
                      d="M 260 160 L 260 100 L 420 100 L 420 160"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      strokeDasharray="6, 8"
                      fill="none"
                      className="flow-active"
                    />
                    <path
                      d="M 260 160 L 260 220 L 420 220 L 420 160"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeDasharray="6, 8"
                      fill="none"
                      className="flow-active"
                    />
                    <path
                      d="M 420 160 L 520 160 L 520 280 L 50 280 L 50 160"
                      stroke="#22d3ee"
                      strokeWidth="3"
                      strokeDasharray="8, 10"
                      fill="none"
                      className="flow-active"
                    />
                  </>
                )}

                {/* Battery */}
                <g transform="translate(50, 220)">
                  <circle cx="0" cy="0" r="18" fill="#0f172a" stroke="#06b6d4" strokeWidth="2" />
                  <text x="-30" y="5" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">18V</text>
                </g>

                {/* Interactive Simplify Box */}
                <g 
                  transform="translate(340, 160)" 
                  onClick={() => handleGroupToggle('parallel_block')}
                  className="cursor-pointer"
                >
                  <rect
                    x="-75"
                    y="-55"
                    width="150"
                    height="110"
                    rx="8"
                    fill={groupedBlocks['parallel_block'] ? '#047857' : 'none'}
                    fillOpacity={groupedBlocks['parallel_block'] ? '0.2' : '0'}
                    stroke={groupedBlocks['parallel_block'] ? '#10b981' : '#f59e0b'}
                    strokeWidth="1.5"
                    strokeDasharray="4, 4"
                  />
                  <text x="0" y="4" textAnchor="middle" fill="#fbbf24" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    {groupedBlocks['parallel_block'] ? 'Req_p = 2 Ω (Agrupado)' : '⚡ Clique para agrupar (R2 // R3)'}
                  </text>
                </g>
              </g>
            )}

            {/* DEFAULT / SINGLE / OTHER SCHEMATICS */}
            {(effectiveConfig.type === 'single' || effectiveConfig.type === 'meter_test' || effectiveConfig.type === 'joule_cable' || effectiveConfig.type === 'power_grid' || effectiveConfig.type === 'final_core') && (
              <g>
                {/* General Loop */}
                <rect x="80" y="60" width="440" height="200" rx="16" fill="none" stroke="#334155" strokeWidth="4" />

                {switchClosed && (
                  <rect
                    x="80"
                    y="60"
                    width="440"
                    height="200"
                    rx="16"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="3"
                    strokeDasharray="8, 12"
                    className="flow-active"
                  />
                )}

                {/* Battery Left */}
                <g transform="translate(80, 160)">
                  <circle cx="0" cy="0" r="22" fill="#0f172a" stroke="#06b6d4" strokeWidth="2" />
                  <line x1="-12" y1="-8" x2="12" y2="-8" stroke="#ef4444" strokeWidth="3" />
                  <line x1="-6" y1="8" x2="6" y2="8" stroke="#3b82f6" strokeWidth="3" />
                  <text x="0" y="36" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="monospace">
                    U = {effectiveConfig.voltage || 60} V
                  </text>
                </g>

                {/* Resistor / Appliance Top */}
                <g transform="translate(300, 60)">
                  <rect x="-45" y="-18" width="90" height="36" rx="6" fill="#1e293b" stroke="#06b6d4" strokeWidth="2" />
                  <path d="M -30 0 L -20 -8 L -10 8 L 0 -8 L 10 8 L 20 -8 L 30 0" stroke="#38bdf8" strokeWidth="2" fill="none" />
                  <text x="0" y="-24" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold" fontFamily="monospace">
                    {effectiveConfig.resistors?.[0]?.label || 'Carga Principal'}
                  </text>
                  <text x="0" y="32" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="monospace">
                    {effectiveConfig.resistors?.[0]?.value || 15} {effectiveConfig.resistors?.[0]?.unit || 'Ω'}
                  </text>
                </g>

                {/* Voltmeter / Ammeter Probes for Meter Test */}
                {effectiveConfig.type === 'meter_test' && (
                  <g>
                    {/* Ammeter in series */}
                    <g transform="translate(520, 160)">
                      <circle cx="0" cy="0" r="18" fill="#0f172a" stroke="#22c55e" strokeWidth="2" />
                      <text x="0" y="5" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold" fontFamily="monospace">A</text>
                      <text x="0" y="30" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">SÉRIE</text>
                    </g>
                    {/* Voltmeter in parallel */}
                    <g transform="translate(300, 140)">
                      <path d="M -55 -60 L -55 0 L 55 0 L 55 -60" stroke="#a855f7" strokeWidth="2" strokeDasharray="3, 3" fill="none" />
                      <circle cx="0" cy="0" r="18" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
                      <text x="0" y="5" textAnchor="middle" fill="#a855f7" fontSize="12" fontWeight="bold" fontFamily="monospace">V</text>
                      <text x="0" y="28" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">PARALELO</text>
                    </g>
                  </g>
                )}

                {/* Joule Heat Thermal Visual for Joule Cable */}
                {effectiveConfig.type === 'joule_cable' && (
                  <g transform="translate(300, 60)">
                    <circle cx="0" cy="0" r="45" fill="#f97316" fillOpacity="0.2" className="animate-ping" />
                    <text x="0" y="50" textAnchor="middle" fill="#fb923c" fontSize="10" fontFamily="monospace" fontWeight="bold">
                      🔥 Q = R · I² · t (Aquecimento Térmico)
                    </text>
                  </g>
                )}

                {/* Switch Bottom */}
                <g transform="translate(300, 260)">
                  <circle cx="-20" cy="0" r="4" fill="#06b6d4" />
                  <circle cx="20" cy="0" r="4" fill="#06b6d4" />
                  {switchClosed ? (
                    <line x1="-20" y1="0" x2="20" y2="0" stroke="#10b981" strokeWidth="3" />
                  ) : (
                    <line x1="-20" y1="0" x2="15" y2="-15" stroke="#f59e0b" strokeWidth="3" />
                  )}
                  <text x="0" y="20" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">INTERRUPTOR</text>
                </g>
              </g>
            )}
          </svg>
        </div>
      ) : (
        /* Telemetry Diagnostics Grid */
        <div className="w-full aspect-[16/9] max-h-[320px] bg-slate-900/90 rounded-xl border border-cyan-500/20 p-4 flex flex-col justify-between overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/80 border border-cyan-500/30 p-2.5 rounded-lg">
              <div className="text-[10px] text-cyan-400 font-mono uppercase">Tensão da Fonte (U)</div>
              <div className="text-lg font-bold font-mono text-cyan-200">{effectiveConfig.voltage || 120} V</div>
              <div className="text-[10px] text-slate-400">Diferença de potencial nominal</div>
            </div>

            <div className="bg-slate-950/80 border border-emerald-500/30 p-2.5 rounded-lg">
              <div className="text-[10px] text-emerald-400 font-mono uppercase">Estado do Circuito</div>
              <div className="text-lg font-bold font-mono text-emerald-300">
                {switchClosed ? 'FECHADO (ATIVO)' : 'ABERTO (CORTE)'}
              </div>
              <div className="text-[10px] text-slate-400">
                {switchClosed ? 'Corrente contínua fluindo' : 'Corrente nula (I = 0)'}
              </div>
            </div>

            <div className="bg-slate-950/80 border border-amber-500/30 p-2.5 rounded-lg col-span-2 sm:col-span-1">
              <div className="text-[10px] text-amber-400 font-mono uppercase">Topologia da Rede</div>
              <div className="text-lg font-bold font-mono text-amber-300 uppercase">
                {effectiveConfig.type}
              </div>
              <div className="text-[10px] text-slate-400">Arranjo de nós e ramos</div>
            </div>
          </div>

          {/* Resistors Table */}
          <div className="mt-2 bg-slate-950/60 rounded-lg p-2 border border-slate-800">
            <div className="text-[11px] font-bold text-slate-300 font-mono mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mapeamento de Cargas e Resistores:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(effectiveConfig.resistors || []).map((r) => (
                <div key={r.id} className="bg-slate-900 px-2 py-1 rounded text-xs font-mono text-cyan-300 border border-cyan-500/20">
                  <span className="text-slate-400">{r.label}:</span> <span className="font-bold">{r.value} {r.unit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 italic">
            Dica: Alterne para a aba &quot;Diagrama&quot; para visualizar os fluxos de corrente e interagir com os componentes.
          </div>
        </div>
      )}

      {/* Description caption */}
      {effectiveConfig.description && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-300 bg-cyan-950/40 border border-cyan-500/20 px-3 py-2 rounded-lg">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{effectiveConfig.description}</span>
        </div>
      )}
    </div>
  );
};
