import React, { useState } from 'react';
import { CircuitData } from '../types';
import { analyzeCircuitTopology, formatFloat } from '../utils/circuitCalculations';
import { 
  Zap, 
  Activity, 
  Info, 
  ToggleLeft, 
  ToggleRight, 
  Flame, 
  Gauge, 
  Sliders, 
  Layers 
} from 'lucide-react';
import { sound } from '../utils/audio';

interface InteractiveCircuitDiagramProps {
  circuit: CircuitData;
  isEnergized?: boolean;
  selectedComponentId?: string | null;
  onSelectComponent?: (id: string) => void;
  interactive?: boolean;
  highlightedBranches?: string[];
}

export const InteractiveCircuitDiagram: React.FC<InteractiveCircuitDiagramProps> = ({
  circuit,
  isEnergized = true,
  selectedComponentId: externalSelectedId,
  onSelectComponent,
  interactive = true,
  highlightedBranches = [],
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [switchClosed, setSwitchClosed] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'current' | 'voltage' | 'power'>('current');

  const selectedId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;

  const analysis = analyzeCircuitTopology(circuit);
  const { req, totalCurrent, totalPower, components } = analysis;

  const handleComponentClick = (id: string) => {
    if (!interactive) return;
    sound.playClick();
    if (onSelectComponent) {
      onSelectComponent(id);
    } else {
      setInternalSelectedId((prev) => (prev === id ? null : id));
    }
  };

  const handleToggleSwitch = () => {
    if (!interactive) return;
    sound.playClick();
    setSwitchClosed((prev) => !prev);
  };

  const activeCurrent = isEnergized && switchClosed;

  // Selected component details
  const selectedComp = components.find((c) => c.id === selectedId);

  return (
    <div
      id="interactive-circuit-diagram-container"
      className="relative w-full bg-slate-950/90 border border-cyan-500/40 rounded-2xl p-4 overflow-hidden backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col gap-3"
    >
      {/* Background blueprint grid */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #06b6d4 1px, transparent 1px), linear-gradient(to bottom, #06b6d4 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Header bar with controls */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              activeCurrent ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'
            }`}
          />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
            {circuit.configuration === 'series' && 'Associação em Série (R1 + R2)'}
            {circuit.configuration === 'parallel' && 'Associação em Paralelo (R1 // R2)'}
            {circuit.configuration === 'mixed' && 'Circuito Misto (R1 + [R2 // R3])'}
            {circuit.configuration === 'single' && 'Barramento com Carga Única'}
          </span>
        </div>

        {/* Action controls & View modes */}
        <div className="flex items-center gap-2">
          {/* Switch button */}
          <button
            type="button"
            onClick={handleToggleSwitch}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
              switchClosed
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
            title="Abrir ou fechar a chave do circuito"
          >
            {switchClosed ? (
              <>
                <ToggleRight className="w-4 h-4 text-emerald-400" />
                <span>Chave: FECHADA</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-slate-500" />
                <span>Chave: ABERTA</span>
              </>
            )}
          </button>

          {/* View mode toggle */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => { sound.playClick(); setViewMode('current'); }}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'current'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              Corrente (I)
            </button>
            <button
              type="button"
              onClick={() => { sound.playClick(); setViewMode('voltage'); }}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'voltage'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              Tensão (V)
            </button>
            <button
              type="button"
              onClick={() => { sound.playClick(); setViewMode('power'); }}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'power'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              Potência (P)
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Stage */}
      <div className="relative z-10 w-full min-h-[200px] flex items-center justify-center p-2">
        <svg
          viewBox="0 0 540 220"
          className="w-full h-auto max-h-[240px] select-none"
        >
          <defs>
            {/* Animated dashed line pattern for current flow */}
            <linearGradient id="wireGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* ============================================================ */}
          {/* DC BATTERY / GENERATOR ON LEFT (X: 50, Y: 110) */}
          {/* ============================================================ */}
          <g transform="translate(60, 110)">
            {/* Positive terminal (long line) */}
            <line x1="0" y1="-24" x2="0" y2="24" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
            <text x="-16" y="-12" fill="#38bdf8" fontSize="13" fontWeight="bold" fontFamily="monospace">+</text>

            {/* Negative terminal (short thick line) */}
            <line x1="14" y1="-14" x2="14" y2="14" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
            <text x="22" y="-5" fill="#94a3b8" fontSize="13" fontWeight="bold" fontFamily="monospace">-</text>

            {/* Battery label */}
            <rect x="-35" y="32" width="84" height="20" rx="4" fill="#0f172a" stroke="#06b6d4" strokeWidth="1" />
            <text x="7" y="46" fill="#67e8f9" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {circuit.voltage} V (CC)
            </text>
          </g>

          {/* ============================================================ */}
          {/* SWITCH KEY (X: 130, Y: 40) */}
          {/* ============================================================ */}
          <g 
            transform="translate(140, 40)" 
            className="cursor-pointer"
            onClick={handleToggleSwitch}
          >
            <circle cx="0" cy="0" r="4" fill="#38bdf8" />
            <circle cx="36" cy="0" r="4" fill="#38bdf8" />
            {switchClosed ? (
              <line x1="0" y1="0" x2="36" y2="0" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
            ) : (
              <line x1="0" y1="0" x2="30" y2="-18" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
            )}
            <text x="18" y="-14" fill={switchClosed ? '#34d399' : '#f43f5e'} fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              {switchClosed ? 'Chave (ON)' : 'Chave (OFF)'}
            </text>
          </g>

          {/* ============================================================ */}
          {/* TOP & BOTTOM MAIN RAILS */}
          {/* ============================================================ */}
          {/* Left vertical from battery to top rail */}
          <line x1="60" y1="86" x2="60" y2="40" stroke="#38bdf8" strokeWidth="2.5" />
          <line x1="60" y1="40" x2="140" y2="40" stroke="#38bdf8" strokeWidth="2.5" />

          {/* Animated current particles on main bus if energized */}
          {activeCurrent && (
            <line
              x1="60"
              y1="40"
              x2="140"
              y2="40"
              stroke="#fbbf24"
              strokeWidth="2.5"
              strokeDasharray="4 6"
              className="animate-dash"
            />
          )}

          {/* Return rail from circuit back to negative battery terminal */}
          <line x1="60" y1="134" x2="60" y2="180" stroke="#38bdf8" strokeWidth="2.5" />
          <line x1="60" y1="180" x2="74" y2="180" stroke="#38bdf8" strokeWidth="2.5" />

          {/* ============================================================ */}
          {/* CIRCUIT TOPOLOGY BRANCHES */}
          {/* ============================================================ */}

          {/* CASE 1: SINGLE RESISTOR OR SERIE WITH 1 */}
          {(circuit.configuration === 'single' || circuit.resistors.length === 1) && (
            <g>
              <line x1="176" y1="40" x2="320" y2="40" stroke="#38bdf8" strokeWidth="2.5" />
              <line x1="320" y1="40" x2="320" y2="75" stroke="#38bdf8" strokeWidth="2.5" />

              {/* Resistor R1 */}
              <g
                transform="translate(320, 110)"
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => handleComponentClick('R1')}
              >
                <rect
                  x="-35"
                  y="-25"
                  width="70"
                  height="50"
                  rx="6"
                  fill={selectedId === 'R1' ? '#164e63' : '#0f172a'}
                  stroke={selectedId === 'R1' ? '#22d3ee' : '#06b6d4'}
                  strokeWidth={selectedId === 'R1' ? 2.5 : 1.5}
                  filter={viewMode === 'power' && activeCurrent ? 'url(#glow)' : undefined}
                />
                {/* Resistor zigzag icon inside */}
                <path
                  d="M-22,0 L-14,-10 L-6,10 L2,-10 L10,10 L18,-10 L22,0"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                <text x="0" y="-30" fill="#e0f2fe" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  R1 = {circuit.resistors[0]} Ω
                </text>
                {viewMode === 'current' && (
                  <text x="0" y="38" fill="#34d399" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    I = {formatFloat(components[0]?.current || 0)} A
                  </text>
                )}
                {viewMode === 'voltage' && (
                  <text x="0" y="38" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    V = {formatFloat(components[0]?.voltageDrop || 0)} V
                  </text>
                )}
                {viewMode === 'power' && (
                  <text x="0" y="38" fill="#fbbf24" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    P = {formatFloat(components[0]?.power || 0)} W
                  </text>
                )}
              </g>

              {/* Bottom return wire */}
              <line x1="320" y1="145" x2="320" y2="180" stroke="#38bdf8" strokeWidth="2.5" />
              <line x1="320" y1="180" x2="74" y2="180" stroke="#38bdf8" strokeWidth="2.5" />
            </g>
          )}

          {/* CASE 2: SERIES RESISTORS (2 or 3 in series) */}
          {circuit.configuration === 'series' && circuit.resistors.length >= 2 && (
            <g>
              <line x1="176" y1="40" x2="220" y2="40" stroke="#38bdf8" strokeWidth="2.5" />

              {/* Resistor R1 (horizontal on top rail) */}
              <g
                transform="translate(260, 40)"
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => handleComponentClick('R1')}
              >
                <rect
                  x="-35"
                  y="-20"
                  width="70"
                  height="40"
                  rx="6"
                  fill={selectedId === 'R1' ? '#164e63' : '#0f172a'}
                  stroke={selectedId === 'R1' ? '#22d3ee' : '#06b6d4'}
                  strokeWidth={selectedId === 'R1' ? 2.5 : 1.5}
                />
                <path d="M-22,0 L-14,-7 L-6,7 L2,-7 L10,7 L18,-7 L22,0" fill="none" stroke="#38bdf8" strokeWidth="2" />
                <text x="0" y="-25" fill="#e0f2fe" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  R1 = {circuit.resistors[0]} Ω
                </text>
                <text x="0" y="32" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  {viewMode === 'voltage' ? `V1 = ${formatFloat(components[0]?.voltageDrop || 0)} V` : `I = ${formatFloat(totalCurrent)} A`}
                </text>
              </g>

              {/* Connection to R2 */}
              <line x1="295" y1="40" x2="355" y2="40" stroke="#38bdf8" strokeWidth="2.5" />

              {/* Resistor R2 */}
              <g
                transform="translate(395, 40)"
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => handleComponentClick('R2')}
              >
                <rect
                  x="-35"
                  y="-20"
                  width="70"
                  height="40"
                  rx="6"
                  fill={selectedId === 'R2' ? '#164e63' : '#0f172a'}
                  stroke={selectedId === 'R2' ? '#22d3ee' : '#06b6d4'}
                  strokeWidth={selectedId === 'R2' ? 2.5 : 1.5}
                />
                <path d="M-22,0 L-14,-7 L-6,7 L2,-7 L10,7 L18,-7 L22,0" fill="none" stroke="#38bdf8" strokeWidth="2" />
                <text x="0" y="-25" fill="#e0f2fe" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  R2 = {circuit.resistors[1]} Ω
                </text>
                <text x="0" y="32" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  {viewMode === 'voltage' ? `V2 = ${formatFloat(components[1]?.voltageDrop || 0)} V` : `I = ${formatFloat(totalCurrent)} A`}
                </text>
              </g>

              {/* If third resistor exists in series */}
              {circuit.resistors.length >= 3 ? (
                <>
                  <line x1="430" y1="40" x2="480" y2="40" stroke="#38bdf8" strokeWidth="2.5" />
                  <line x1="480" y1="40" x2="480" y2="85" stroke="#38bdf8" strokeWidth="2.5" />
                  <g
                    transform="translate(480, 110)"
                    className="cursor-pointer"
                    onClick={() => handleComponentClick('R3')}
                  >
                    <rect
                      x="-20"
                      y="-25"
                      width="40"
                      height="50"
                      rx="6"
                      fill={selectedId === 'R3' ? '#164e63' : '#0f172a'}
                      stroke="#06b6d4"
                      strokeWidth="1.5"
                    />
                    <text x="0" y="36" fill="#e0f2fe" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                      R3 = {circuit.resistors[2]} Ω
                    </text>
                  </g>
                  <line x1="480" y1="135" x2="480" y2="180" stroke="#38bdf8" strokeWidth="2.5" />
                  <line x1="480" y1="180" x2="74" y2="180" stroke="#38bdf8" strokeWidth="2.5" />
                </>
              ) : (
                <>
                  {/* Right drop wire */}
                  <line x1="430" y1="40" x2="470" y2="40" stroke="#38bdf8" strokeWidth="2.5" />
                  <line x1="470" y1="40" x2="470" y2="180" stroke="#38bdf8" strokeWidth="2.5" />
                  <line x1="470" y1="180" x2="74" y2="180" stroke="#38bdf8" strokeWidth="2.5" />
                </>
              )}
            </g>
          )}

          {/* CASE 3: PARALLEL RESISTORS */}
          {circuit.configuration === 'parallel' && (
            <g>
              <line x1="176" y1="40" x2="280" y2="40" stroke="#38bdf8" strokeWidth="2.5" />

              {/* Node A (Top Node) */}
              <circle cx="280" cy="40" r="4" fill="#fbbf24" />
              <text x="270" y="32" fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="monospace">Nó A</text>

              <line x1="280" y1="40" x2="420" y2="40" stroke="#38bdf8" strokeWidth="2.5" />

              {/* Branch 1 (R1 at X: 280) */}
              <line x1="280" y1="40" x2="280" y2="75" stroke="#38bdf8" strokeWidth="2.5" />
              <g
                transform="translate(280, 110)"
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => handleComponentClick('R1')}
              >
                <rect
                  x="-30"
                  y="-25"
                  width="60"
                  height="50"
                  rx="6"
                  fill={selectedId === 'R1' ? '#164e63' : '#0f172a'}
                  stroke={selectedId === 'R1' ? '#22d3ee' : '#06b6d4'}
                  strokeWidth={selectedId === 'R1' ? 2.5 : 1.5}
                />
                <path d="M-18,0 L-12,-8 L-6,8 L0,-8 L6,8 L12,-8 L18,0" fill="none" stroke="#38bdf8" strokeWidth="2" />
                <text x="0" y="-30" fill="#e0f2fe" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  R1 = {circuit.resistors[0]} Ω
                </text>
                <text x="0" y="36" fill="#34d399" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  I1 = {formatFloat(components[0]?.current || 0)} A
                </text>
              </g>
              <line x1="280" y1="135" x2="280" y2="180" stroke="#38bdf8" strokeWidth="2.5" />

              {/* Branch 2 (R2 at X: 420) */}
              <line x1="420" y1="40" x2="420" y2="75" stroke="#38bdf8" strokeWidth="2.5" />
              <g
                transform="translate(420, 110)"
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => handleComponentClick('R2')}
              >
                <rect
                  x="-30"
                  y="-25"
                  width="60"
                  height="50"
                  rx="6"
                  fill={selectedId === 'R2' ? '#164e63' : '#0f172a'}
                  stroke={selectedId === 'R2' ? '#22d3ee' : '#06b6d4'}
                  strokeWidth={selectedId === 'R2' ? 2.5 : 1.5}
                />
                <path d="M-18,0 L-12,-8 L-6,8 L0,-8 L6,8 L12,-8 L18,0" fill="none" stroke="#38bdf8" strokeWidth="2" />
                <text x="0" y="-30" fill="#e0f2fe" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  R2 = {circuit.resistors[1]} Ω
                </text>
                <text x="0" y="36" fill="#34d399" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  I2 = {formatFloat(components[1]?.current || 0)} A
                </text>
              </g>
              <line x1="420" y1="135" x2="420" y2="180" stroke="#38bdf8" strokeWidth="2.5" />

              {/* Node B (Bottom Node) */}
              <line x1="420" y1="180" x2="280" y2="180" stroke="#38bdf8" strokeWidth="2.5" />
              <circle cx="280" cy="180" r="4" fill="#fbbf24" />
              <text x="270" y="196" fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="monospace">Nó B</text>

              {/* Bottom return to battery */}
              <line x1="280" y1="180" x2="74" y2="180" stroke="#38bdf8" strokeWidth="2.5" />
            </g>
          )}

          {/* CASE 4: MIXED CIRCUIT (R1 in series with R2 // R3) */}
          {circuit.configuration === 'mixed' && (
            <g>
              <line x1="176" y1="40" x2="210" y2="40" stroke="#38bdf8" strokeWidth="2.5" />

              {/* R1 on main series line */}
              <g
                transform="translate(245, 40)"
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => handleComponentClick('R1')}
              >
                <rect
                  x="-30"
                  y="-18"
                  width="60"
                  height="36"
                  rx="6"
                  fill={selectedId === 'R1' ? '#164e63' : '#0f172a'}
                  stroke={selectedId === 'R1' ? '#22d3ee' : '#06b6d4'}
                  strokeWidth="2"
                />
                <path d="M-18,0 L-12,-6 L-6,6 L0,-6 L6,6 L12,-6 L18,0" fill="none" stroke="#38bdf8" strokeWidth="2" />
                <text x="0" y="-24" fill="#e0f2fe" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  R1 = {circuit.resistors[0]} Ω
                </text>
              </g>

              {/* From R1 to Node A */}
              <line x1="275" y1="40" x2="330" y2="40" stroke="#38bdf8" strokeWidth="2.5" />
              <circle cx="330" cy="40" r="4" fill="#fbbf24" />

              {/* Branch up to R2 (upper branch) */}
              <line x1="330" y1="40" x2="330" y2="15" stroke="#38bdf8" strokeWidth="2.5" />
              <line x1="330" y1="15" x2="375" y2="15" stroke="#38bdf8" strokeWidth="2.5" />
              <g
                transform="translate(410, 15)"
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => handleComponentClick('R2')}
              >
                <rect
                  x="-30"
                  y="-14"
                  width="60"
                  height="28"
                  rx="5"
                  fill={selectedId === 'R2' ? '#164e63' : '#0f172a'}
                  stroke="#06b6d4"
                  strokeWidth="1.5"
                />
                <text x="0" y="4" fill="#e0f2fe" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  R2 = {circuit.resistors[1]} Ω
                </text>
              </g>
              <line x1="440" y1="15" x2="480" y2="15" stroke="#38bdf8" strokeWidth="2.5" />
              <line x1="480" y1="15" x2="480" y2="40" stroke="#38bdf8" strokeWidth="2.5" />

              {/* Branch down to R3 (lower branch) */}
              <line x1="330" y1="40" x2="330" y2="65" stroke="#38bdf8" strokeWidth="2.5" />
              <line x1="330" y1="65" x2="375" y2="65" stroke="#38bdf8" strokeWidth="2.5" />
              <g
                transform="translate(410, 65)"
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => handleComponentClick('R3')}
              >
                <rect
                  x="-30"
                  y="-14"
                  width="60"
                  height="28"
                  rx="5"
                  fill={selectedId === 'R3' ? '#164e63' : '#0f172a'}
                  stroke="#06b6d4"
                  strokeWidth="1.5"
                />
                <text x="0" y="4" fill="#e0f2fe" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  R3 = {circuit.resistors[2]} Ω
                </text>
              </g>
              <line x1="440" y1="65" x2="480" y2="65" stroke="#38bdf8" strokeWidth="2.5" />
              <line x1="480" y1="65" x2="480" y2="40" stroke="#38bdf8" strokeWidth="2.5" />

              {/* Node B and drop return */}
              <circle cx="480" cy="40" r="4" fill="#fbbf24" />
              <line x1="480" y1="40" x2="510" y2="40" stroke="#38bdf8" strokeWidth="2.5" />
              <line x1="510" y1="40" x2="510" y2="180" stroke="#38bdf8" strokeWidth="2.5" />
              <line x1="510" y1="180" x2="74" y2="180" stroke="#38bdf8" strokeWidth="2.5" />
            </g>
          )}

          {/* Current Flow Conventional Arrow */}
          {activeCurrent && (
            <g transform="translate(100, 32)">
              <polygon points="0,0 8,-4 8,4" fill="#34d399" />
              <text x="12" y="3" fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="monospace">i</text>
            </g>
          )}
        </svg>
      </div>

      {/* Component Inspector & Telemetry HUD */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-cyan-500/20 text-xs">
        {/* Global summary badge */}
        <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800 flex items-center justify-between font-mono">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Resistência Equivalente:</span>
            <span className="text-sm font-black text-cyan-300">Req = {formatFloat(req)} Ω</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Corrente Total:</span>
            <span className="text-sm font-black text-emerald-300">I_tot = {formatFloat(totalCurrent)} A</span>
          </div>
        </div>

        {/* Selected component inspector */}
        <div className="bg-cyan-950/40 rounded-xl p-2.5 border border-cyan-500/40 font-mono">
          {selectedComp ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-cyan-300 font-bold block text-xs">{selectedComp.label}</span>
                <span className="text-[11px] text-slate-300">
                  R: <strong className="text-white">{selectedComp.resistance} Ω</strong> • V: <strong className="text-white">{formatFloat(selectedComp.voltageDrop)} V</strong>
                </span>
              </div>
              <div className="text-right">
                <span className="text-emerald-300 font-bold block text-xs">I: {formatFloat(selectedComp.current)} A</span>
                <span className="text-amber-300 font-bold text-[11px]">P: {formatFloat(selectedComp.power)} W</span>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-[11px] flex items-center gap-1.5 py-1">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>Clique em qualquer resistor no diagrama para inspecionar seus valores em tempo real.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
