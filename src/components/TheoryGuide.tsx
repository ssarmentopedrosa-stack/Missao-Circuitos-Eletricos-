import React, { useState } from 'react';
import { THEORY_TOPICS, TheoryTopic } from '../data/theory';
import { BookOpen, X, Calculator, Lightbulb, Search, ArrowRight, Zap, Check } from 'lucide-react';
import { calcCurrent, calcPowerVI, calcPowerRI2, calcResistorsSeries, calcResistorsParallel, formatNumber } from '../utils/physics';
import { sound } from '../utils/audio';

interface TheoryGuideProps {
  onClose: () => void;
}

export const TheoryGuide: React.FC<TheoryGuideProps> = ({ onClose }) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>('fundamentos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'concepts' | 'calculator'>('concepts');

  // Interactive Sandbox Calculator States
  const [calcVoltage, setCalcVoltage] = useState<number>(120);
  const [calcResistance1, setCalcResistance1] = useState<number>(10);
  const [calcResistance2, setCalcResistance2] = useState<number>(20);
  const [assocType, setAssocType] = useState<'series' | 'parallel'>('series');

  const filteredTopics = THEORY_TOPICS.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTopic = THEORY_TOPICS.find((t) => t.id === selectedTopicId) || THEORY_TOPICS[0];

  // Live sandbox computations
  const currentReq = assocType === 'series'
    ? calcResistorsSeries([calcResistance1, calcResistance2])
    : calcResistorsParallel([calcResistance1, calcResistance2]);

  const currentTotal = calcCurrent(calcVoltage, currentReq);
  const powerTotal = calcPowerVI(calcVoltage, currentTotal);

  return (
    <div id="theory-guide-modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl h-[90vh] bg-slate-900 border border-cyan-500/40 rounded-3xl flex flex-col overflow-hidden shadow-[0_10px_50px_rgba(6,182,212,0.2)]">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-cyan-500/30 flex items-center justify-between gap-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                Holocron de Física • 3º Ano do Ensino Médio
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Guia de Circuitos & Fórmulas da Estação Orbital
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 rounded-xl p-1 border border-cyan-500/30 text-xs">
              <button
                type="button"
                onClick={() => { sound.playClick(); setActiveTab('concepts'); }}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeTab === 'concepts' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Teoria & Fórmulas
              </button>
              <button
                type="button"
                onClick={() => { sound.playClick(); setActiveTab('calculator'); }}
                className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'calculator' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Simulador Sandbox</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => { sound.playClick(); onClose(); }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content Body */}
        {activeTab === 'concepts' ? (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar with Topic List */}
            <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-cyan-500/20 bg-slate-950/40 p-4 flex flex-col gap-3 shrink-0">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar conceito..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900/90 border border-cyan-500/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Topics Nav List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {filteredTopics.map((topic) => {
                  const isSelected = topic.id === selectedTopic.id;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => { sound.playClick(); setSelectedTopicId(topic.id); }}
                      className={`w-full text-left p-3 rounded-xl border transition-all text-xs cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                          : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[10px] font-mono text-cyan-400 mb-0.5">
                        {topic.category}
                      </div>
                      <div className="font-semibold">{topic.title}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Topic Content Panel */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-900/80">
              {/* Topic Header */}
              <div>
                <div className="inline-block text-[11px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-2.5 py-1 rounded-full mb-2">
                  {selectedTopic.category}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  {selectedTopic.title}
                </h3>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  {selectedTopic.summary}
                </p>
              </div>

              {/* Formulas Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Fórmulas Essenciais</span>
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {selectedTopic.formulas.map((f, i) => (
                    <div key={i} className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-3.5 font-mono">
                      <div className="text-xs text-cyan-300 font-bold mb-1">{f.name}:</div>
                      <div className="text-base font-extrabold text-amber-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-amber-500/30 inline-block mb-1.5">
                        {f.formula}
                      </div>
                      <div className="text-[11px] text-slate-400">{f.units}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Concepts List */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase font-bold text-cyan-400 tracking-wider">
                  Pontos Conceituais Chave
                </h4>
                <ul className="space-y-2">
                  {selectedTopic.concepts.map((concept, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-200 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{concept}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Example Problem Resolution */}
              <div className="bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-mono text-emerald-400 font-bold uppercase flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Exemplo Resolvido Passo a Passo</span>
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  {selectedTopic.exampleProblem.statement}
                </div>
                <div className="text-xs font-mono text-emerald-300 bg-slate-900 p-2.5 rounded-lg border border-emerald-500/20">
                  {selectedTopic.exampleProblem.resolution}
                </div>
              </div>

              {/* Tigrão Tips */}
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 mb-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>Dica de Ouro de Tigrão para o Vestibular / ENEM</span>
                </div>
                <div className="text-xs text-amber-200/90 space-y-1">
                  {selectedTopic.tips.map((tip, i) => (
                    <p key={i}>• {tip}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Interactive Circuit Sandbox Calculator Tab */
          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-900/80">
            <div>
              <h3 className="text-xl font-bold text-white">
                Simulador Interativo de Circuitos
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Ajuste os valores dos resistores e da tensão para ver a Lei de Ohm e a Potência calculadas em tempo real!
              </p>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 space-y-2">
                <div className="flex justify-between text-xs font-mono text-cyan-300">
                  <span>Tensão da Fonte (U):</span>
                  <span className="font-bold">{calcVoltage} V</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="240"
                  step="6"
                  value={calcVoltage}
                  onChange={(e) => setCalcVoltage(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 space-y-2">
                <div className="flex justify-between text-xs font-mono text-cyan-300">
                  <span>Resistor R1:</span>
                  <span className="font-bold">{calcResistance1} Ω</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={calcResistance1}
                  onChange={(e) => setCalcResistance1(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 space-y-2">
                <div className="flex justify-between text-xs font-mono text-cyan-300">
                  <span>Resistor R2:</span>
                  <span className="font-bold">{calcResistance2} Ω</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={calcResistance2}
                  onChange={(e) => setCalcResistance2(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Association Switch */}
            <div className="flex items-center justify-center gap-4 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-xs font-mono text-slate-400">Tipo de Associação:</span>
              <button
                type="button"
                onClick={() => setAssocType('series')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                  assocType === 'series'
                    ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Série (Req = R1 + R2)
              </button>
              <button
                type="button"
                onClick={() => setAssocType('parallel')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                  assocType === 'parallel'
                    ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Paralelo [Req = (R1 · R2)/(R1 + R2)]
              </button>
            </div>

            {/* Live Calculated Results */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-950/90 border border-cyan-500/40 p-4 rounded-2xl text-center font-mono">
                <div className="text-[10px] text-cyan-400 font-bold uppercase mb-1">Resistência Eq. (Req)</div>
                <div className="text-2xl font-extrabold text-cyan-200">{formatNumber(currentReq)} Ω</div>
              </div>

              <div className="bg-slate-950/90 border border-emerald-500/40 p-4 rounded-2xl text-center font-mono">
                <div className="text-[10px] text-emerald-400 font-bold uppercase mb-1">Corrente Total (I)</div>
                <div className="text-2xl font-extrabold text-emerald-300">{formatNumber(currentTotal)} A</div>
              </div>

              <div className="bg-slate-950/90 border border-amber-500/40 p-4 rounded-2xl text-center font-mono">
                <div className="text-[10px] text-amber-400 font-bold uppercase mb-1">Potência Total (P)</div>
                <div className="text-2xl font-extrabold text-amber-300">{formatNumber(powerTotal)} W</div>
              </div>

              <div className="bg-slate-950/90 border border-purple-500/40 p-4 rounded-2xl text-center font-mono">
                <div className="text-[10px] text-purple-400 font-bold uppercase mb-1">Energia em 1 hora</div>
                <div className="text-2xl font-extrabold text-purple-300">{formatNumber(powerTotal / 1000)} kWh</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
