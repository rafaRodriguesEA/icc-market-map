import React from 'react';
import { AIAnalysis } from '../types';

interface AnalysisModalProps {
  analysis: AIAnalysis | null;
  onClose: () => void;
  loading: boolean;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ analysis, onClose, loading }) => {
  if (!loading && !analysis) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-blue-500/10"></div>
          <div className="flex items-center gap-4 relative z-10">
             <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
                <i className="fas fa-robot text-emerald-400 text-2xl"></i>
             </div>
             <div>
               <h3 className="text-white font-bold text-xl tracking-tight">Diretor Comercial AI</h3>
               <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Powered by Gemini</p>
             </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/20 text-white/70 hover:text-white transition-all flex items-center justify-center z-10">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-6">
              <div className="relative">
                  <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <i className="fas fa-bolt text-emerald-500 animate-pulse"></i>
                  </div>
              </div>
              <div className="text-center">
                  <p className="text-slate-800 font-bold text-lg">Analisando Inteligência de Mercado</p>
                  <p className="text-slate-500 text-sm">Processando dados do cliente e segmento...</p>
              </div>
            </div>
          ) : analysis ? (
            <div className="space-y-8">
              <div>
                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    <i className="fas fa-chess-knight text-emerald-500"></i> Estratégia Recomendada
                </h4>
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-slate-700 font-medium leading-relaxed shadow-sm">
                  {analysis.strategy}
                </div>
              </div>

              <div>
                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    <i className="fas fa-comments text-blue-500"></i> Pontos de Discussão
                </h4>
                <ul className="space-y-3">
                  {analysis.talkingPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-slate-600 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <i className="fas fa-check-circle text-emerald-500 mt-0.5"></i>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    <i className="fas fa-shield-alt text-red-500"></i> Análise de Risco
                </h4>
                <div className="flex items-start gap-3 bg-red-50 p-4 rounded-xl border border-red-100">
                  <i className="fas fa-exclamation-triangle text-red-500 mt-1"></i>
                  <p className="text-red-800 text-sm font-medium">{analysis.riskAssessment}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        
        <div className="bg-slate-50 p-5 flex justify-end border-t border-slate-100">
          <button onClick={onClose} className="text-sm font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 px-6 py-2.5 rounded-xl transition-all shadow-sm hover:shadow">
            Fechar Análise
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;