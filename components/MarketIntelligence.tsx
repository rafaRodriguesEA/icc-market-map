
import React, { useState, useMemo } from 'react';
import { MarketEntry, AppSettings, UserProfile } from '../types';
import { saveMarketEntry, deleteMarketEntry } from '../services/firebaseService';

interface MarketIntelligenceProps {
  entries: MarketEntry[];
  settings: AppSettings;
  userProfile: UserProfile;
  users: UserProfile[]; // Needed to lookup creator names
}

// Helper interface for grouping
interface MarketGroup {
  key: string;
  competitor: string;
  product: string;
  productType: string;
  entries: MarketEntry[];
}

const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({ entries, settings, userProfile, users }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'form'>('grid');
  const [selectedGroup, setSelectedGroup] = useState<MarketGroup | null>(null); // For Detail Modal
  const [editingEntry, setEditingEntry] = useState<Partial<MarketEntry> | null>(null); // For Form
  
  // Detail View Mode (Cards vs Table)
  const [detailViewMode, setDetailViewMode] = useState<'cards' | 'table'>('cards');

  // Group Editing State
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false); // Custom Modal State
  const [groupFormData, setGroupFormData] = useState({ competitor: '', product: '', productType: '' });

  // --- Grouping Logic ---
  const groups: MarketGroup[] = useMemo(() => {
    const map = new Map<string, MarketGroup>();
    
    // Safety check: ensure entries is an array
    if (!Array.isArray(entries)) return [];

    entries.forEach(entry => {
        // Safe access to fields to prevent crashes on legacy/bad data
        const comp = (entry.competitor || 'Desconhecido').trim();
        const prod = (entry.product || 'Produto Geral').trim();
        const pType = (entry.productType || 'Outros');

        // Normalize key to group by Competitor + Product + Type
        const key = `${comp}-${prod}-${pType}`.toLowerCase();
        
        if (!map.has(key)) {
            map.set(key, {
                key,
                competitor: comp,
                product: prod,
                productType: pType,
                entries: []
            });
        }
        map.get(key)!.entries.push(entry);
    });

    return Array.from(map.values());
  }, [entries]);

  // --- Handlers ---

  const handleCreate = (prefill?: Partial<MarketEntry>) => {
    setEditingEntry({
      date: new Date().toISOString().split('T')[0],
      competitor: prefill?.competitor || '',
      product: prefill?.product || '',
      productType: settings.productTypes?.[0] || 'Outros',
      country: '',
      notes: '',
      packaging: settings.packagings?.[0] || '',
      price: 0,
      currency: 'USD',
      incoterm: settings.incoterms?.[0] || '',
      destination: '',
      fobSantos: undefined,
      cifBaltimore: undefined,
      cifAntwerp: undefined,
      fcaIcc: undefined,
      createdBy: userProfile.uid,
      ...prefill
    });
    setViewMode('form');
    // If we were in a modal, close it to focus on form
    if (selectedGroup) setSelectedGroup(null); 
  };

  const handleEdit = (entry: MarketEntry) => {
    setEditingEntry({ ...entry });
    setViewMode('form');
    // Close modal if open to focus on edit
    if (selectedGroup) setSelectedGroup(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja excluir este registro de mercado?")) {
      await deleteMarketEntry(id);
      // Update selected group if open (it will auto-update via props, but we check if it becomes empty)
      if (selectedGroup) {
          const updatedEntries = selectedGroup.entries.filter(e => e.id !== id);
          if (updatedEntries.length === 0) setSelectedGroup(null);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEntry && editingEntry.competitor && editingEntry.product) {
      try {
        await saveMarketEntry(editingEntry as MarketEntry);
        setViewMode('grid');
        setEditingEntry(null);
      } catch (error) {
        console.error("Error saving market entry", error);
        alert("Erro ao salvar registro.");
      }
    }
  };

  // --- Group Edit Handlers ---
  const handleOpenGroupEdit = () => {
      if (selectedGroup) {
          setGroupFormData({
              competitor: selectedGroup.competitor,
              product: selectedGroup.product,
              productType: selectedGroup.productType
          });
          setIsEditingGroup(true);
      }
  };

  // Step 1: Intercept Form Submit -> Open Custom Modal
  const handlePreUpdateGroup = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedGroup) return;
      setShowConfirmModal(true);
  };

  // Step 2: Execute logic after confirmation
  const executeBatchUpdate = async () => {
      if (!selectedGroup) return;

      setIsSavingGroup(true);
      try {
          // Create updates for all entries in this group
          const updates = selectedGroup.entries.map(entry => ({
              ...entry,
              competitor: groupFormData.competitor,
              product: groupFormData.product,
              productType: groupFormData.productType
          }));

          // Execute updates in parallel
          await Promise.all(updates.map(u => saveMarketEntry(u)));

          // Close all modals to force refresh and ensure UI state consistency
          setShowConfirmModal(false);
          setIsEditingGroup(false);
          setSelectedGroup(null); 
          
      } catch (err) {
          console.error("Error batch updating group", err);
          alert("Erro ao atualizar grupo: " + (err as any).message);
      } finally {
          setIsSavingGroup(false);
      }
  };

  // Helper Inputs
  const inputClass = "w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-500 outline-none bg-white text-slate-700 font-medium transition-colors text-sm";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1";
  
  // Detail Modal Label Helper
  const detailLabelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1";
  const detailValueClass = "text-base font-bold text-slate-800";

  // Helper to get user name
  const getUserName = (uid: string) => {
      const u = users.find(user => user.uid === uid);
      return u ? u.displayName : 'Desconhecido';
  };

  // --- FORM VIEW ---
  if (viewMode === 'form') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-slide-up max-w-5xl mx-auto">
        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-xl text-slate-800">
              {editingEntry?.id ? 'Editar Registro' : 'Novo Registro de Mercado'}
            </h3>
            <p className="text-slate-500 text-sm">Inteligência Competitiva e Preços.</p>
          </div>
          <button onClick={() => setViewMode('grid')} className="text-slate-400 hover:text-slate-600">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[75vh] custom-scrollbar">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Main Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelClass}>Data do Registro</label>
                <input 
                  type="date" 
                  required
                  value={editingEntry?.date} 
                  onChange={e => setEditingEntry(prev => ({...prev!, date: e.target.value}))}
                  className={inputClass} 
                />
              </div>
              <div>
                <label className={labelClass}>Concorrente</label>
                <input 
                  type="text" 
                  required
                  placeholder="Nome do Concorrente"
                  value={editingEntry?.competitor} 
                  onChange={e => setEditingEntry(prev => ({...prev!, competitor: e.target.value}))}
                  className={inputClass} 
                />
              </div>
              <div>
                <label className={labelClass}>País de Origem</label>
                <input 
                  type="text" 
                  placeholder="Ex: China"
                  value={editingEntry?.country} 
                  onChange={e => setEditingEntry(prev => ({...prev!, country: e.target.value}))}
                  className={inputClass} 
                />
              </div>
            </div>

            {/* Product Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Nome do Produto (Marca)</label>
                <input 
                  type="text" 
                  required
                  placeholder="Marca ou nome comercial"
                  value={editingEntry?.product} 
                  onChange={e => setEditingEntry(prev => ({...prev!, product: e.target.value}))}
                  className={inputClass} 
                />
              </div>
              <div>
                <label className={labelClass}>Tipo de Produto</label>
                <div className="relative">
                  <select 
                    value={editingEntry?.productType} 
                    onChange={e => setEditingEntry(prev => ({...prev!, productType: e.target.value}))}
                    className={`${inputClass} appearance-none`}
                  >
                    {settings.productTypes?.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <i className="fas fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 my-4"></div>

            {/* Commercial Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className={labelClass}>Embalagem</label>
                <div className="relative">
                  <select 
                    value={editingEntry?.packaging} 
                    onChange={e => setEditingEntry(prev => ({...prev!, packaging: e.target.value}))}
                    className={`${inputClass} appearance-none`}
                  >
                     <option value="">Selecione...</option>
                    {settings.packagings?.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <i className="fas fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                </div>
              </div>
               <div>
                <label className={labelClass}>Moeda</label>
                <div className="relative">
                  <select 
                    value={editingEntry?.currency} 
                    onChange={e => setEditingEntry(prev => ({...prev!, currency: e.target.value as any}))}
                    className={`${inputClass} appearance-none`}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="BRL">BRL</option>
                    <option value="RMB">RMB</option>
                  </select>
                  <i className="fas fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                </div>
              </div>
              <div>
                <label className={labelClass}>Preço</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={editingEntry?.price} 
                  onChange={e => setEditingEntry(prev => ({...prev!, price: parseFloat(e.target.value)}))}
                  className={inputClass} 
                />
              </div>
              <div>
                <label className={labelClass}>Incoterm</label>
                <div className="relative">
                  <select 
                    value={editingEntry?.incoterm} 
                    onChange={e => setEditingEntry(prev => ({...prev!, incoterm: e.target.value}))}
                    className={`${inputClass} appearance-none`}
                  >
                    <option value="">Selecione...</option>
                    {settings.incoterms?.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  <i className="fas fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                </div>
              </div>
               <div className="md:col-span-4">
                <label className={labelClass}>Destino (Porto/Cidade)</label>
                <input 
                  type="text" 
                  placeholder="Ex: Porto de Santos"
                  value={editingEntry?.destination} 
                  onChange={e => setEditingEntry(prev => ({...prev!, destination: e.target.value}))}
                  className={inputClass} 
                />
              </div>
            </div>

            {/* Equivalences Section */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
               <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                 <i className="fas fa-balance-scale text-emerald-500"></i> Equivalências de Preço (USD/Kg)
               </h4>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className={labelClass}>FOB Santos</label>
                    <input 
                      type="number" step="0.001"
                      className={`${inputClass} bg-white`}
                      value={editingEntry?.fobSantos ?? ''}
                      onChange={e => setEditingEntry(prev => ({...prev!, fobSantos: parseFloat(e.target.value)}))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>CIF Baltimore</label>
                    <input 
                      type="number" step="0.001"
                      className={`${inputClass} bg-white`}
                      value={editingEntry?.cifBaltimore ?? ''}
                      onChange={e => setEditingEntry(prev => ({...prev!, cifBaltimore: parseFloat(e.target.value)}))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>CIF Antuérpia</label>
                    <input 
                      type="number" step="0.001"
                      className={`${inputClass} bg-white`}
                      value={editingEntry?.cifAntwerp ?? ''}
                      onChange={e => setEditingEntry(prev => ({...prev!, cifAntwerp: parseFloat(e.target.value)}))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>FCA ICC</label>
                    <input 
                      type="number" step="0.001"
                      className={`${inputClass} bg-white`}
                      value={editingEntry?.fcaIcc ?? ''}
                      onChange={e => setEditingEntry(prev => ({...prev!, fcaIcc: parseFloat(e.target.value)}))}
                    />
                  </div>
               </div>
            </div>

            {/* Notes */}
            <div>
              <label className={labelClass}>Observações</label>
              <textarea 
                rows={3}
                placeholder="Detalhes adicionais..."
                value={editingEntry?.notes} 
                onChange={e => setEditingEntry(prev => ({...prev!, notes: e.target.value}))}
                className={inputClass} 
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4">
              <button type="button" onClick={() => setViewMode('grid')} className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                Cancelar
              </button>
              <button type="submit" className="px-8 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all">
                Salvar Registro
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- GRID VIEW ---
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Inteligência de Mercado</h2>
          <p className="text-slate-500 mt-1 font-medium">Monitore preços e movimentos da concorrência.</p>
        </div>
        <button onClick={() => handleCreate()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-200 transform hover:-translate-y-0.5 flex items-center gap-2 font-bold">
          <i className="fas fa-plus"></i> Novo Registro
        </button>
      </div>

      {/* Grid of Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {groups.map(group => {
              // Stats
              const entryCount = group.entries.length;
              const prices = group.entries.map(e => e.price); // Note: Assuming USD for simple min/max logic or purely numeric comparison
              const minPrice = prices.length ? Math.min(...prices) : 0;
              const maxPrice = prices.length ? Math.max(...prices) : 0;
              const latestEntry = group.entries.sort((a,b) => b.date.localeCompare(a.date))[0];

              return (
                <div 
                    key={group.key} 
                    onClick={() => setSelectedGroup(group)}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col overflow-hidden relative"
                >
                    {/* Top Bar */}
                    <div className="h-2 w-full bg-gradient-to-r from-orange-400 to-red-500"></div>

                    <div className="p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 group-hover:bg-red-50 group-hover:text-red-600 transition-colors border border-slate-100">
                                <i className="fas fa-building text-xl"></i>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase">
                                {latestEntry?.country || 'N/A'}
                            </span>
                        </div>

                        <h4 className="font-bold text-lg text-slate-800 mb-1 leading-tight">{group.competitor}</h4>
                        <div className="flex flex-col mb-4">
                           <span className="text-sm font-semibold text-emerald-700">{group.product}</span>
                           <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{group.productType}</span>
                        </div>

                        <div className="mt-auto space-y-3">
                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <i className="fas fa-history text-slate-400"></i>
                                <span className="font-bold">{entryCount}</span> 
                                <span className="text-xs">Registros de Preço</span>
                            </div>

                            <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                                <span>Último: {new Date(latestEntry?.date).toLocaleDateString()}</span>
                                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                                     ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-3 text-center border-t border-slate-100 group-hover:bg-orange-50 transition-colors">
                        <span className="text-xs font-bold text-orange-600">Ver Histórico Completo <i className="fas fa-arrow-right ml-1"></i></span>
                    </div>
                </div>
              );
          })}

          {groups.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center p-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <i className="fas fa-search-dollar text-5xl mb-4 text-slate-300"></i>
                    <p className="font-medium text-lg">Sem dados de mercado</p>
                    <p className="text-sm">Comece registrando preços da concorrência.</p>
                </div>
          )}
      </div>

      {/* Detail Modal (Variation Tree Style) */}
      {selectedGroup && (
            <div className="fixed inset-0 md:left-72 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedGroup(null)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-slide-up relative" onClick={e => e.stopPropagation()}>
                    
                    {/* Modal Header - Orange Gradient with Generic Title */}
                    <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 text-white p-8 flex justify-between items-center shrink-0 shadow-md">
                         <div>
                            <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm flex items-center gap-3">
                                <i className="fas fa-chart-line"></i> Detalhes do monitoramento
                            </h2>
                            <p className="text-orange-100 text-sm mt-1 font-medium">Análise detalhada do produto concorrente</p>
                         </div>
                         <button onClick={() => setSelectedGroup(null)} className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all shadow-inner">
                             <i className="fas fa-times text-lg"></i>
                         </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
                        
                        {/* Immutable Info Section (Top) */}
                        <div className="bg-slate-50 p-8 border-b border-slate-200 relative">
                             {/* Edit Button for Group */}
                             <div className="absolute top-8 right-8">
                                <button 
                                    onClick={handleOpenGroupEdit}
                                    className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 hover:border-orange-300 hover:text-orange-600 px-4 py-2 rounded-lg transition-all shadow-sm"
                                >
                                    <i className="fas fa-pencil-alt"></i> Editar Cadastro
                                </button>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                 <div>
                                     <span className={detailLabelClass}>Concorrente</span>
                                     <div className="flex items-center gap-2">
                                         <i className="fas fa-building text-slate-300"></i>
                                         <p className={detailValueClass}>{selectedGroup.competitor}</p>
                                     </div>
                                 </div>
                                 <div>
                                     <span className={detailLabelClass}>Produto (Marca)</span>
                                     <div className="flex items-center gap-2">
                                         <i className="fas fa-tag text-slate-300"></i>
                                         <p className={detailValueClass}>{selectedGroup.product}</p>
                                     </div>
                                 </div>
                                 <div>
                                     <span className={detailLabelClass}>Tipo de Produto</span>
                                     <div className="flex items-center gap-2">
                                         <i className="fas fa-flask text-slate-300"></i>
                                         <p className={detailValueClass}>{selectedGroup.productType}</p>
                                     </div>
                                 </div>
                             </div>
                        </div>

                        {/* History Section */}
                        <div className="p-8">
                            <div className="flex justify-between items-end mb-6 border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-2">
                                    <i className="fas fa-history text-slate-400"></i>
                                    <h3 className="text-lg font-bold text-slate-800">Histórico de Preços</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* View Toggle */}
                                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                                        <button 
                                            onClick={() => setDetailViewMode('cards')} 
                                            className={`p-2 rounded-md transition-all text-sm flex items-center gap-2 ${detailViewMode === 'cards' ? 'bg-white shadow text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                                            title="Visualização em Cartões"
                                        >
                                            <i className="fas fa-th-large"></i>
                                        </button>
                                        <button 
                                            onClick={() => setDetailViewMode('table')} 
                                            className={`p-2 rounded-md transition-all text-sm flex items-center gap-2 ${detailViewMode === 'table' ? 'bg-white shadow text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
                                            title="Visualização em Tabela"
                                        >
                                            <i className="fas fa-table"></i>
                                        </button>
                                    </div>

                                    <button 
                                        onClick={() => handleCreate({ 
                                            competitor: selectedGroup.competitor, 
                                            product: selectedGroup.product, 
                                            productType: selectedGroup.productType
                                        })}
                                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-lg transition-colors border border-emerald-200 flex items-center"
                                    >
                                        <i className="fas fa-plus mr-2"></i> Adicionar Preço
                                    </button>
                                </div>
                            </div>

                            {/* --- CONDITIONAL RENDERING: CARDS OR TABLE --- */}
                            
                            {detailViewMode === 'cards' && (
                                <div className="grid grid-cols-1 gap-6 animate-fade-in">
                                    {selectedGroup.entries.sort((a,b) => b.date.localeCompare(a.date)).map((entry, index) => (
                                        <div key={entry.id || index} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative group hover:shadow-md transition-shadow">
                                            <div className="flex flex-col lg:flex-row">
                                                {/* Left: Date & Packaging */}
                                                <div className="p-6 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-100 w-full lg:w-1/4 flex flex-col justify-center">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                                            <i className="fas fa-calendar"></i>
                                                        </div>
                                                        <div>
                                                            <span className={detailLabelClass}>Data do Registro</span>
                                                            <p className="font-bold text-slate-800">{new Date(entry.date).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center">
                                                            <i className="fas fa-box"></i>
                                                        </div>
                                                        <div>
                                                            <span className={detailLabelClass}>Embalagem</span>
                                                            <p className="font-bold text-slate-800">{entry.packaging}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Middle: Logistics & Price */}
                                                <div className="p-6 w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col justify-center">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <span className={detailLabelClass}>Origem (País)</span>
                                                            <p className="font-medium text-slate-700 flex items-center gap-2 truncate">
                                                                <i className="fas fa-globe-americas text-slate-400"></i>
                                                                {entry.country || 'N/A'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className={detailLabelClass}>Incoterm</span>
                                                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 inline-block">{entry.incoterm}</span>
                                                        </div>
                                                        <div>
                                                            <span className={detailLabelClass}>Destino</span>
                                                            <p className="font-medium text-slate-700 flex items-center gap-2 truncate">
                                                                <i className="fas fa-map-marker-alt text-red-400"></i>
                                                                {entry.destination}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className={detailLabelClass}>Preço Unitário</span>
                                                            <p className="text-xl font-bold text-emerald-600">
                                                                {entry.currency} {entry.price.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Equivalents Tree */}
                                                <div className="p-6 w-full lg:w-1/3 bg-slate-50/50">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className={detailLabelClass}>Equivalências (USD/Kg)</span>
                                                        {entry.notes && <i className="fas fa-info-circle text-blue-400 cursor-help" title={entry.notes}></i>}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-1 border-dashed">
                                                            <span className="text-slate-600">FOB Santos</span>
                                                            <span className="font-mono font-bold text-slate-800">{entry.fobSantos ? `$${entry.fobSantos.toFixed(3)}` : '-'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-1 border-dashed">
                                                            <span className="text-slate-600">CIF Baltimore</span>
                                                            <span className="font-mono font-bold text-slate-800">{entry.cifBaltimore ? `$${entry.cifBaltimore.toFixed(3)}` : '-'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-1 border-dashed">
                                                            <span className="text-slate-600">CIF Antuérpia</span>
                                                            <span className="font-mono font-bold text-slate-800">{entry.cifAntwerp ? `$${entry.cifAntwerp.toFixed(3)}` : '-'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-600">FCA ICC</span>
                                                            <span className="font-mono font-bold text-slate-800">{entry.fcaIcc ? `$${entry.fcaIcc.toFixed(3)}` : '-'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer: Creator Info */}
                                            <div className="bg-slate-50 px-6 py-2 border-t border-slate-100 flex justify-between items-center">
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                    <i className="fas fa-user-edit"></i>
                                                    <span>Registrado por: <strong>{getUserName(entry.createdBy)}</strong></span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                    <i className="fas fa-clock"></i>
                                                    <span>Criado em: {new Date(entry.createdAt).toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {/* Actions (Absolute) */}
                                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-1 rounded-lg shadow-sm z-10">
                                                <button onClick={() => handleEdit(entry)} className="w-8 h-8 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors flex items-center justify-center">
                                                    <i className="fas fa-pencil-alt text-xs"></i>
                                                </button>
                                                <button onClick={() => handleDelete(entry.id!)} className="w-8 h-8 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors flex items-center justify-center">
                                                    <i className="fas fa-trash text-xs"></i>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {detailViewMode === 'table' && (
                                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white animate-fade-in">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3">Data</th>
                                                <th className="px-4 py-3">Emb.</th>
                                                <th className="px-4 py-3">Origem</th>
                                                <th className="px-4 py-3">Incoterm</th>
                                                <th className="px-4 py-3">Destino</th>
                                                <th className="px-4 py-3 text-right">Preço</th>
                                                <th className="px-4 py-3 text-right text-slate-400">Eq. FOB Santos</th>
                                                <th className="px-4 py-3 text-right text-slate-400">Eq. CIF Balt.</th>
                                                <th className="px-4 py-3 text-right text-slate-400">Eq. CIF Ant.</th>
                                                <th className="px-4 py-3 text-right text-slate-400">Eq. FCA ICC</th>
                                                <th className="px-4 py-3 text-center">Criado Por</th>
                                                <th className="px-4 py-3 text-center sticky right-0 bg-slate-50 shadow-l">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedGroup.entries.sort((a,b) => b.date.localeCompare(a.date)).map((entry, index) => (
                                                <tr key={entry.id || index} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-slate-700">{new Date(entry.date).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 text-slate-600">{entry.packaging}</td>
                                                    <td className="px-4 py-3 text-slate-600">{entry.country || '-'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">{entry.incoterm}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]" title={entry.destination}>{entry.destination}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                                        {entry.currency} {entry.price.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-500 font-mono text-xs">
                                                        {entry.fobSantos ? `$${entry.fobSantos.toFixed(3)}` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-500 font-mono text-xs">
                                                        {entry.cifBaltimore ? `$${entry.cifBaltimore.toFixed(3)}` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-500 font-mono text-xs">
                                                        {entry.cifAntwerp ? `$${entry.cifAntwerp.toFixed(3)}` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-500 font-mono text-xs">
                                                        {entry.fcaIcc ? `$${entry.fcaIcc.toFixed(3)}` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-xs text-slate-400">
                                                        <div className="flex items-center justify-center gap-1" title={getUserName(entry.createdBy)}>
                                                            <i className="fas fa-user-circle"></i>
                                                            <span className="truncate max-w-[80px]">{getUserName(entry.createdBy).split(' ')[0]}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center sticky right-0 bg-white group-hover:bg-slate-50 shadow-l border-l border-slate-100">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button onClick={() => handleEdit(entry)} className="text-slate-400 hover:text-blue-600 transition-colors" title="Editar">
                                                                <i className="fas fa-pencil-alt"></i>
                                                            </button>
                                                            <button onClick={() => handleDelete(entry.id!)} className="text-slate-400 hover:text-red-600 transition-colors" title="Excluir">
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {selectedGroup.entries.length === 0 && (
                                        <div className="p-8 text-center text-slate-400 italic">Nenhum registro encontrado.</div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>

                    <div className="p-5 border-t border-slate-200 bg-white flex justify-end">
                        <button onClick={() => setSelectedGroup(null)} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                            Fechar
                        </button>
                    </div>

                    {/* Group Edit Form Modal */}
                    {isEditingGroup && (
                        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg border border-slate-200 animate-slide-up" onClick={e => e.stopPropagation()}>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Editar Cadastro do Concorrente</h3>
                                <p className="text-sm text-slate-500 mb-6 border-l-4 border-orange-400 pl-3 bg-orange-50 p-2 rounded-r">
                                    <i className="fas fa-exclamation-triangle text-orange-400 mr-2"></i>
                                    Atenção: Isso alterará o nome do concorrente ou produto em <strong>todos</strong> os registros deste histórico.
                                </p>
                                
                                <form onSubmit={handlePreUpdateGroup} className="space-y-4">
                                    <div>
                                        <label className={labelClass}>Concorrente</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={groupFormData.competitor} 
                                            onChange={e => setGroupFormData({...groupFormData, competitor: e.target.value})}
                                            className={inputClass} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Nome do Produto</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={groupFormData.product} 
                                            onChange={e => setGroupFormData({...groupFormData, product: e.target.value})}
                                            className={inputClass} 
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Tipo de Produto</label>
                                        <div className="relative">
                                            <select 
                                                value={groupFormData.productType} 
                                                onChange={e => setGroupFormData({...groupFormData, productType: e.target.value})}
                                                className={`${inputClass} appearance-none`}
                                            >
                                                {settings.productTypes?.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                            <i className="fas fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <button 
                                            type="button" 
                                            onClick={() => setIsEditingGroup(false)} 
                                            className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-lg shadow-orange-200 transition-colors flex items-center gap-2"
                                        >
                                           Atualizar Todos
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Custom Confirmation Modal (Z-Index higher than edit modal) */}
                    {showConfirmModal && (
                        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up border border-slate-200" onClick={e => e.stopPropagation()}>
                                <div className="bg-orange-50 p-6 flex flex-col items-center justify-center text-center border-b border-orange-100">
                                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                                        <i className="fas fa-exclamation-triangle text-3xl text-orange-500"></i>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800">Confirmar Alteração em Massa</h3>
                                </div>
                                <div className="p-6 text-center">
                                    <p className="text-slate-600 mb-6">
                                        Você está prestes a atualizar o nome do concorrente/produto em <strong className="text-slate-900">{selectedGroup?.entries.length}</strong> registros históricos.
                                        <br/><br/>
                                        Essa ação não pode ser desfeita. Tem certeza?
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <button 
                                            onClick={executeBatchUpdate} 
                                            disabled={isSavingGroup}
                                            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-200 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"
                                        >
                                            {isSavingGroup ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-check-circle"></i>}
                                            {isSavingGroup ? 'Processando...' : 'Sim, Atualizar Tudo'}
                                        </button>
                                        <button 
                                            onClick={() => setShowConfirmModal(false)}
                                            disabled={isSavingGroup}
                                            className="w-full py-3 bg-white border-2 border-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-50 hover:text-slate-700 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
      )}
    </div>
  );
};

export default MarketIntelligence;
