import React, { useState } from 'react';
import { Award, CheckCircle, Download, Printer, Shield, Sparkles, Star, Trophy, X } from 'lucide-react';
import { sound } from '../utils/audio';

interface CertificateModalProps {
  playerName?: string;
  score: number;
  accuracy: number;
  totalAnswered: number;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  playerName = 'Astronauta',
  score,
  accuracy,
  totalAnswered,
  onClose,
}) => {
  const [studentName, setStudentName] = useState<string>(playerName);
  const [isCustomizing, setIsCustomizing] = useState<boolean>(false);

  const rankTitle =
    accuracy >= 90
      ? 'Engenheiro Eletricista Chefe — Grau Supremo'
      : accuracy >= 75
      ? 'Oficial Especialista em Eletrodinâmica Espacial'
      : 'Técnico em Sistemas e Circuitos Orbitais';

  const issueDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  return (
    <div id="certificate-modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border-2 border-cyan-500/60 rounded-3xl p-6 sm:p-10 shadow-[0_0_60px_rgba(6,182,212,0.3)] my-auto">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={() => { sound.playClick(); onClose(); }}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer print:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Certificate Border Design */}
        <div className="border-4 border-double border-cyan-500/40 rounded-2xl p-6 sm:p-8 bg-slate-950/90 relative overflow-hidden text-center space-y-6">
          
          {/* Watermark Logo */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <Shield className="w-96 h-96 text-cyan-400" />
          </div>

          {/* Header */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono text-xs uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Agência Espacial Orbital ARES-III</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-100 to-amber-300 font-serif tracking-wide">
              CERTIFICADO DE EXCELÊNCIA
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 uppercase tracking-wider font-mono">
              Em Física e Engenharia de Circuitos Elétricos
            </p>
          </div>

          {/* Student Name */}
          <div className="py-2 space-y-2">
            <p className="text-xs sm:text-sm text-slate-300">
              Certificamos solenemente que o(a) astronauta
            </p>

            {isCustomizing ? (
              <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="bg-slate-900 border-2 border-cyan-400 rounded-xl px-4 py-2 text-white font-bold text-center text-lg outline-none w-full"
                  placeholder="Seu nome completo"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setIsCustomizing(false)}
                  className="px-3 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
                >
                  Salvar
                </button>
              </div>
            ) : (
              <div 
                onClick={() => setIsCustomizing(true)}
                className="group cursor-pointer inline-block"
                title="Clique para editar seu nome no certificado"
              >
                <div className="text-2xl sm:text-3xl font-black text-cyan-300 font-serif border-b-2 border-dashed border-cyan-500/50 pb-1 px-4 inline-block group-hover:border-cyan-400">
                  {studentName}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono print:hidden">
                  (clique no nome para personalizar)
                </div>
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed pt-2">
              concluiu com êxito todos os 8 setores da <span className="text-cyan-300 font-bold">Estação Orbital ARES-III</span>, dominando com primor a 1ª Lei de Ohm, circuitos em série e paralelo, redes mistas, potência elétrica e proteção contra sobrecarga.
            </p>
          </div>

          {/* Metrics & Badges */}
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto font-mono text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-cyan-500/30">
              <span className="text-slate-400 text-[10px] block">Pontuação Total</span>
              <span className="text-lg font-bold text-cyan-300">{score} pts</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-emerald-500/30">
              <span className="text-slate-400 text-[10px] block">Precisão Geral</span>
              <span className="text-lg font-bold text-emerald-400">{accuracy}%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-amber-500/30">
              <span className="text-slate-400 text-[10px] block">Desafios Salvos</span>
              <span className="text-lg font-bold text-amber-300">{totalAnswered}/24</span>
            </div>
          </div>

          {/* Rank Ribbon */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-300 font-mono text-xs font-bold shadow-lg">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Patente Concedida: {rankTitle}</span>
          </div>

          {/* Signatures & Seal */}
          <div className="pt-6 border-t border-slate-800 grid grid-cols-2 gap-6 items-end font-mono text-xs">
            <div className="text-center space-y-1">
              <div className="font-serif italic text-cyan-300 text-sm">Comandante Tigrão 🐾</div>
              <div className="h-0.5 bg-slate-700 w-32 mx-auto" />
              <div className="text-[10px] text-slate-400">Mascote & Chefe de Missão</div>
            </div>

            <div className="text-center space-y-1">
              <div className="font-mono font-bold text-slate-200 text-xs">{issueDate}</div>
              <div className="h-0.5 bg-slate-700 w-32 mx-auto" />
              <div className="text-[10px] text-slate-400">Data de Emissão Orbital</div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={() => { sound.playClick(); onClose(); }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar em PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
