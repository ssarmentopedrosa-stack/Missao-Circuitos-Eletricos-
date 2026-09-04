import React, { useState } from 'react';
import { Calculator, X, Zap, ArrowRightLeft, Sparkles, Check, ChevronRight } from 'lucide-react';
import { formatNumber } from '../utils/physics';
import { sound } from '../utils/audio';

interface AstronautCalculatorProps {
  onClose?: () => void;
  isDocked?: boolean;
}

export const AstronautCalculator: React.FC<AstronautCalculatorProps> = ({ onClose, isDocked = false }) => {
  const [activeTab, setActiveTab] = useState<'formulas' | 'converter' | 'calc'>('formulas');
  
  // Formula Solvers States
  const [ohmU, setOhmU] = useState<string>('120');
  const [ohmR, setOhmR] = useState<string>('30');
  const [ohmMode, setOhmMode] = useState<'calc_I' | 'calc_U' | 'calc_R'>('calc_I');

  const [seriesR1, setSeriesR1] = useState<string>('20');
  const [seriesR2, setSeriesR2] = useState<string>('30');
  const [seriesR3, setSeriesR3] = useState<string>('50');

  const [parR1, setParR1] = useState<string>('60');
  const [parR2, setParR2] = useState<string>('30');

  const [pwrU, setPwrU] = useState<string>('220');
  const [pwrI, setPwrI] = useState<string>('5');
  const [pwrR, setPwrR] = useState<string>('44');

  const [energyP, setEnergyP] = useState<string>('1500'); // W
  const [energyHours, setEnergyHours] = useState<string>('4'); // h
  const [tariff, setTariff] = useState<string>('0.85'); // R$/kWh

  // Converter States
  const [mAValue, setMAValue] = useState<string>('500');
  const [kOhmValue, setKOhmValue] = useState<string>('4.7');
  const [kWValue, setKWValue] = useState<string>('2.5');
  const [kWhValue, setKWhValue] = useState<string>('1');

  // Simple quick arithmetic calculator
  const [calcInput, setCalcInput] = useState<string>('');
  const [calcResult, setCalcResult] = useState<string>('');

  const handleCalcButton = (char: string) => {
    sound.playClick();
    if (char === 'C') {
      setCalcInput('');
      setCalcResult('');
    } else if (char === '=') {
      try {
        // Safe evaluation of simple math
        const sanitized = calcInput.replace(/×/g, '*').replace(/÷/g, '/');
        // eslint-disable-next-line no-new-func
        const res = Function(`'use strict'; return (${sanitized})`)();
        setCalcResult(String(res));
      } catch {
        setCalcResult('Erro');
      }
    } else {
      setCalcInput(prev => prev + char);
    }
  };

  // Live Formula Calculations
  const calcOhmResult = () => {
    const u = parseFloat(ohmU.replace(',', '.')) || 0;
    const r = parseFloat(ohmR.replace(',', '.')) || 1;
    if (ohmMode === 'calc_I') {
      return { val: u / r, unit: 'A (Amperes)', label: 'Corrente (I = U / R)' };
    } else if (ohmMode === 'calc_U') {
      return { val: u * r, unit: 'V (Volts)', label: 'Tensão (U = R · I)' };
    } else {
      return { val: r !== 0 ? u / r : 0, unit: 'Ω (Ohms)', label: 'Resistência (R = U / I)' };
    }
  };

  const calcSeriesReq = () => {
    const r1 = parseFloat(seriesR1.replace(',', '.')) || 0;
    const r2 = parseFloat(seriesR2.replace(',', '.')) || 0;
    const r3 = parseFloat(seriesR3.replace(',', '.')) || 0;
    return r1 + r2 + r3;
  };

  const calcParReq = () => {
    const r1 = parseFloat(parR1.replace(',', '.')) || 0;
    const r2 = parseFloat(parR2.replace(',', '.')) || 0;
    if (r1 + r2 === 0) return 0;
    return (r1 * r2) / (r1 + r2);
  };

  const calcPowerResults = () => {
    const u = parseFloat(pwrU.replace(',', '.')) || 0;
    const i = parseFloat(pwrI.replace(',', '.')) || 0;
    const r = parseFloat(pwrR.replace(',', '.')) || 0;
    const pVI = u * i;
    const pRI2 = r * Math.pow(i, 2);
    const pV2R = r > 0 ? Math.pow(u, 2) / r : 0;
    return { pVI, pRI2, pV2R };
  };

  const calcEnergyResults = () => {
    const p = parseFloat(energyP.replace(',', '.')) || 0;
    const h = parseFloat(energyHours.replace(',', '.')) || 0;
    const tar = parseFloat(tariff.replace(',', '.')) || 0;
    const kWh = (p * h) / 1000;
    const cost = kWh * tar;
    const joules = p * (h * 3600);
    return { kWh, cost, joules };
  };

  const ohmRes = calcOhmResult();
  const seriesReq = calcSeriesReq();
  const parReq = calcParReq();
  const pwrRes = calcPowerResults();
  const energyRes = calcEnergyResults();

  const containerClasses = isDocked
    ? 'w-full bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-4 text-xs'
    : 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md';

  const modalInnerClasses = isDocked
    ? 'space-y-4'
    : 'relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-cyan-500/50 rounded-3xl p-5 sm:p-6 flex flex-col overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.25)]';

  const content = (
    <div className={modalInnerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <span>Calculadora & Ferramentas do Astronauta</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-cyan-950 text-cyan-300 border border-cyan-500/30 rounded">ARES-III</span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex bg-slate-950 rounded-xl p-1 border border-cyan-500/20 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => { sound.playClick(); setActiveTab('formulas'); }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeTab === 'formulas' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Fórmulas
            </button>
            <button
              type="button"
              onClick={() => { sound.playClick(); setActiveTab('converter'); }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeTab === 'converter' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Conversor
            </button>
            <button
              type="button"
              onClick={() => { sound.playClick(); setActiveTab('calc'); }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeTab === 'calc' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Aritmética
            </button>
          </div>

          {!isDocked && onClose && (
            <button
              type="button"
              onClick={() => { sound.playClick(); onClose(); }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
        {activeTab === 'formulas' && (
          <div className="space-y-4">
            {/* 1. Ohm's Law Solver */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-cyan-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300 font-mono flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  1ª Lei de Ohm (U = R · I)
                </span>
                <div className="flex gap-1 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setOhmMode('calc_I')}
                    className={`px-2 py-0.5 rounded ${ohmMode === 'calc_I' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400'}`}
                  >
                    I = U/R
                  </button>
                  <button
                    type="button"
                    onClick={() => setOhmMode('calc_U')}
                    className={`px-2 py-0.5 rounded ${ohmMode === 'calc_U' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400'}`}
                  >
                    U = R·I
                  </button>
                  <button
                    type="button"
                    onClick={() => setOhmMode('calc_R')}
                    className={`px-2 py-0.5 rounded ${ohmMode === 'calc_R' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400'}`}
                  >
                    R = U/I
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">
                    {ohmMode === 'calc_U' ? 'Resistência R (Ω):' : 'Tensão U (V):'}
                  </label>
                  <input
                    type="text"
                    value={ohmU}
                    onChange={(e) => setOhmU(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-cyan-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">
                    {ohmMode === 'calc_U' ? 'Corrente I (A):' : ohmMode === 'calc_R' ? 'Corrente I (A):' : 'Resistência R (Ω):'}
                  </label>
                  <input
                    type="text"
                    value={ohmR}
                    onChange={(e) => setOhmR(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-cyan-500/20 flex items-center justify-between font-mono">
                <span className="text-slate-400 text-[11px]">{ohmRes.label}:</span>
                <span className="text-sm font-extrabold text-cyan-300">
                  {formatNumber(ohmRes.val)} {ohmRes.unit}
                </span>
              </div>
            </div>

            {/* 2. Series and Parallel Quick Solvers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Series */}
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-bold text-amber-300 font-mono text-[11px]">
                  Série (Req = R1 + R2 + R3)
                </span>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                  <input
                    type="text"
                    placeholder="R1"
                    value={seriesR1}
                    onChange={(e) => setSeriesR1(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded p-1 text-center text-white focus:border-amber-400 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="R2"
                    value={seriesR2}
                    onChange={(e) => setSeriesR2(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded p-1 text-center text-white focus:border-amber-400 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="R3"
                    value={seriesR3}
                    onChange={(e) => setSeriesR3(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded p-1 text-center text-white focus:border-amber-400 outline-none"
                  />
                </div>
                <div className="bg-slate-900 p-2 rounded-xl border border-amber-500/30 flex justify-between font-mono">
                  <span className="text-slate-400">Req Série:</span>
                  <span className="text-amber-300 font-bold">{formatNumber(seriesReq)} Ω</span>
                </div>
              </div>

              {/* Parallel */}
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-bold text-emerald-300 font-mono text-[11px]">
                  Paralelo (Req = R1·R2 / (R1+R2))
                </span>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                  <input
                    type="text"
                    placeholder="R1"
                    value={parR1}
                    onChange={(e) => setParR1(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded p-1 text-center text-white focus:border-emerald-400 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="R2"
                    value={parR2}
                    onChange={(e) => setParR2(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded p-1 text-center text-white focus:border-emerald-400 outline-none"
                  />
                </div>
                <div className="bg-slate-900 p-2 rounded-xl border border-emerald-500/30 flex justify-between font-mono">
                  <span className="text-slate-400">Req Paralelo:</span>
                  <span className="text-emerald-300 font-bold">{formatNumber(parReq)} Ω</span>
                </div>
              </div>
            </div>

            {/* 3. Power and Energy Solver */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-purple-500/30 space-y-2.5">
              <span className="font-bold text-purple-300 font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Potência Elétrica (P = U·I = R·I² = U²/R)
              </span>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Tensão U (V):</label>
                  <input
                    type="text"
                    value={pwrU}
                    onChange={(e) => setPwrU(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:border-purple-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Corrente I (A):</label>
                  <input
                    type="text"
                    value={pwrI}
                    onChange={(e) => setPwrI(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:border-purple-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Resistência R (Ω):</label>
                  <input
                    type="text"
                    value={pwrR}
                    onChange={(e) => setPwrR(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:border-purple-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-center">
                <div className="bg-slate-900 p-2 rounded-xl border border-purple-500/20">
                  <div className="text-[9px] text-slate-400">P = U · I</div>
                  <div className="text-xs font-bold text-purple-300">{formatNumber(pwrRes.pVI)} W</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-xl border border-purple-500/20">
                  <div className="text-[9px] text-slate-400">P = R · I²</div>
                  <div className="text-xs font-bold text-purple-300">{formatNumber(pwrRes.pRI2)} W</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-xl border border-purple-500/20">
                  <div className="text-[9px] text-slate-400">P = U² / R</div>
                  <div className="text-xs font-bold text-purple-300">{formatNumber(pwrRes.pV2R)} W</div>
                </div>
              </div>
            </div>

            {/* 4. Energy Consumption (kWh & Cost) */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-cyan-500/30 space-y-2.5">
              <span className="font-bold text-cyan-300 font-mono">
                Consumo de Energia (E = P · Δt) & Custo
              </span>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Potência P (W):</label>
                  <input
                    type="text"
                    value={energyP}
                    onChange={(e) => setEnergyP(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:border-cyan-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Tempo (horas):</label>
                  <input
                    type="text"
                    value={energyHours}
                    onChange={(e) => setEnergyHours(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:border-cyan-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-mono">Tarifa (R$/kWh):</label>
                  <input
                    type="text"
                    value={tariff}
                    onChange={(e) => setTariff(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="bg-slate-900 p-2 rounded-xl border border-cyan-500/20 flex justify-between">
                  <span className="text-slate-400">Energia Total:</span>
                  <span className="text-cyan-300 font-bold">{formatNumber(energyRes.kWh)} kWh</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-xl border border-emerald-500/30 flex justify-between">
                  <span className="text-slate-400">Custo Estimado:</span>
                  <span className="text-emerald-400 font-bold">R$ {formatNumber(energyRes.cost, 2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'converter' && (
          <div className="space-y-3 font-mono">
            {/* mA to A */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400">Miliamperes (mA):</label>
                <input
                  type="text"
                  value={mAValue}
                  onChange={(e) => setMAValue(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs"
                />
              </div>
              <ArrowRightLeft className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="flex-1 text-right">
                <div className="text-[10px] text-slate-400">Amperes (A):</div>
                <div className="text-cyan-300 font-bold text-sm">
                  {formatNumber((parseFloat(mAValue.replace(',', '.')) || 0) / 1000, 4)} A
                </div>
              </div>
            </div>

            {/* kOhm to Ohm */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400">Quilo-ohms (kΩ):</label>
                <input
                  type="text"
                  value={kOhmValue}
                  onChange={(e) => setKOhmValue(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs"
                />
              </div>
              <ArrowRightLeft className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex-1 text-right">
                <div className="text-[10px] text-slate-400">Ohms (Ω):</div>
                <div className="text-amber-300 font-bold text-sm">
                  {formatNumber((parseFloat(kOhmValue.replace(',', '.')) || 0) * 1000)} Ω
                </div>
              </div>
            </div>

            {/* kW to W */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400">Quilowatts (kW):</label>
                <input
                  type="text"
                  value={kWValue}
                  onChange={(e) => setKWValue(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs"
                />
              </div>
              <ArrowRightLeft className="w-4 h-4 text-purple-400 shrink-0" />
              <div className="flex-1 text-right">
                <div className="text-[10px] text-slate-400">Watts (W):</div>
                <div className="text-purple-300 font-bold text-sm">
                  {formatNumber((parseFloat(kWValue.replace(',', '.')) || 0) * 1000)} W
                </div>
              </div>
            </div>

            {/* kWh to Joules */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400">Quilowatt-hora (kWh):</label>
                <input
                  type="text"
                  value={kWhValue}
                  onChange={(e) => setKWhValue(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-xs"
                />
              </div>
              <ArrowRightLeft className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1 text-right">
                <div className="text-[10px] text-slate-400">Joules (J):</div>
                <div className="text-emerald-300 font-bold text-sm">
                  {formatNumber((parseFloat(kWhValue.replace(',', '.')) || 0) * 3.6e6)} J
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calc' && (
          <div className="space-y-3 font-mono">
            {/* Display */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-cyan-500/40 text-right space-y-1">
              <div className="text-xs text-slate-500 min-h-[16px]">{calcInput || '0'}</div>
              <div className="text-2xl font-extrabold text-white">{calcResult || calcInput || '0'}</div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 gap-2">
              {['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '%', '='].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handleCalcButton(btn)}
                  className={`p-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                    btn === '='
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                      : btn === 'C'
                      ? 'bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300'
                      : ['÷', '×', '-', '+'].includes(btn)
                      ? 'bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-white'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isDocked) {
    return <div id="astronaut-calculator-docked" className={containerClasses}>{content}</div>;
  }

  return (
    <div id="astronaut-calculator-modal" className={containerClasses}>
      {content}
    </div>
  );
};
