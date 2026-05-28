
import React, { useState } from 'react';
import { Client, UserProfile, Product, AppSettings } from '../types';
import { STATUS_COLORS, SEGMENT_ICONS } from '../constants';

interface ClientProfileProps {
  client: Client;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAiAnalysis: () => void;
  users: UserProfile[];
  products: Product[];
}

const ClientProfile: React.FC<ClientProfileProps> = ({ 
  client, onClose, onEdit, onDelete, onAiAnalysis, users, products 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'production' | 'contacts'>('overview');

  // Helper Data Resolvers
  const manager = users.find(u => u.uid === client.managerId);
  const seller = users.find(u => u.uid === client.sellerId);
  
  const productsSold = products.filter(p => client.productsSoldIds?.includes(p.id!));
  
  // Calculations
  const accessiblePotentialTons = (client.annualFeedProduction || 0) * ((client.volumePercentageConsidered || 0) / 100);
  const monthlyFeedProduction = (client.annualFeedProduction || 0) / 12;

  // FIX: Removed / 1000 division to treat factor as direct multiplier (Ton/Ton)
  const potentialBreakdown = (client.potentialProductIds || []).map(pid => {
      const product = products.find(p => p.id === pid);
      if (!product) return null;
      const potentialTons = (accessiblePotentialTons * (product.kgPerTon || 0));
      return { product, potentialTons };
  }).filter(Boolean) as { product: Product, potentialTons: number }[];


  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-50 w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up relative">
        
        {/* --- HEADER HERO SECTION --- */}
        <div className="bg-white p-8 border-b border-slate-200 relative overflow-hidden shrink-0">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-100 shadow-md p-2 shrink-0 flex items-center justify-center overflow-hidden">
                        {client.logoUrl ? (
                            <img 
                                src={client.logoUrl} 
                                alt={client.companyName} 
                                className="w-full h-full object-contain rounded-xl"
                            />
                        ) : (
                            <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                                <span className="text-2xl font-extrabold tracking-widest">
                                    {client.companyName.substring(0, 2).toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">
                            {client.companyName}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                    <button onClick={onAiAnalysis} className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white transition-all border border-purple-100 group" title="IA Analysis">
                        <i className="fas fa-magic text-lg mb-0.5 group-hover:scale-110 transition-transform"></i>
                    </button>
                    <button onClick={onEdit} className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all border border-blue-100 group" title="Editar">
                        <i className="fas fa-pencil-alt text-lg mb-0.5 group-hover:scale-110 transition-transform"></i>
                    </button>
                    <button onClick={onDelete} className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all border border-red-100 group" title="Excluir">
                        <i className="fas fa-trash text-lg mb-0.5 group-hover:scale-110 transition-transform"></i>
                    </button>
                    <div className="w-px h-10 bg-slate-200 mx-2"></div>
                    <button onClick={onClose} className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>
            </div>
        </div>

        {/* --- NAVIGATION --- */}
        <div className="bg-white border-b border-slate-200 px-8 flex gap-8 shrink-0">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
                <i className="fas fa-chart-pie"></i> Visão Geral
            </button>
            <button 
                onClick={() => setActiveTab('production')}
                className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'production' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
                <i className="fas fa-industry"></i> Produção e Potencial
            </button>
            <button 
                onClick={() => setActiveTab('contacts')}
                className={`py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'contacts' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
                <i className="fas fa-address-book"></i> Contatos
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{client.contacts?.length || 0}</span>
            </button>
        </div>

        {/* --- CONTENT SCROLLABLE AREA --- */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            
            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    
                    {/* Left Column: Key Info */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* Basic Registration Info (Moved from Header) */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <i className="fas fa-info-circle text-slate-400"></i> Informações Cadastrais
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Status</p>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-block ${STATUS_COLORS[client.status]}`}>
                                        {client.status}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Perfil</p>
                                    <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                        <i className={`fas ${SEGMENT_ICONS[client.segment] || 'fa-tag'} text-emerald-500`}></i>
                                        {client.segment}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Unidade</p>
                                    <p className="text-sm font-bold text-slate-700 truncate">{client.unit || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Localização</p>
                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                        <i className="fas fa-map-marker-alt text-red-400 text-xs"></i>
                                        {client.state ? `${client.state}, ` : ''}{client.country}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Team & Competition */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                                <h3 className="font-bold text-slate-800">Detalhes Comerciais</h3>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Gerente Regional</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                            {manager?.displayName.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{manager?.displayName || 'Não atribuído'}</p>
                                            <p className="text-xs text-slate-500">{manager?.email}</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Vendedor Responsável</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                                            {seller?.displayName.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{seller?.displayName || 'Não atribuído'}</p>
                                            <p className="text-xs text-slate-500">{seller?.email}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-2 pt-4 border-t border-slate-50">
                                     <p className="text-xs font-bold text-slate-400 uppercase mb-2">Concorrência</p>
                                     {client.usesCompetition ? (
                                         <div className="flex items-center gap-2 bg-orange-50 text-orange-800 px-4 py-3 rounded-xl border border-orange-100">
                                             <i className="fas fa-exclamation-circle text-orange-500"></i>
                                             <span className="font-medium">Utiliza concorrente: <strong>{client.competitorName}</strong></span>
                                         </div>
                                     ) : (
                                        <div className="flex items-center gap-2 bg-slate-50 text-slate-600 px-4 py-3 rounded-xl border border-slate-100">
                                            <i className="fas fa-check-circle text-emerald-500"></i>
                                            <span className="font-medium">Não utiliza concorrência informada.</span>
                                        </div>
                                     )}
                                </div>
                            </div>
                        </div>
                        
                         {/* Notes */}
                        {client.notes && (
                            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6 shadow-sm">
                                <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                                    <i className="fas fa-sticky-note"></i> Notas & Histórico
                                </h3>
                                <p className="text-amber-900/80 whitespace-pre-line text-sm leading-relaxed">
                                    {client.notes}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Products */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-fit">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                             <h3 className="font-bold text-slate-800">Produtos Vendidos</h3>
                             <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">{productsSold.length}</span>
                        </div>
                        <div className="p-2 max-h-[500px] overflow-y-auto">
                            {productsSold.map(p => (
                                <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors border-b border-slate-50 last:border-0">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <i className="fas fa-box-open"></i>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-800">{p.brand}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold">{p.type}</p>
                                    </div>
                                </div>
                            ))}
                            {productsSold.length === 0 && (
                                <div className="p-8 text-center text-slate-400">
                                    <i className="fas fa-box-open text-3xl mb-2 opacity-30"></i>
                                    <p className="text-sm">Nenhum produto vinculado.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: PRODUCTION */}
            {activeTab === 'production' && (
                <div className="space-y-8 animate-fade-in">
                    
                    {/* Top Stats Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 1. Annual Production */}
                        <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><i className="fas fa-industry text-6xl"></i></div>
                             <p className="text-slate-400 text-xs font-bold uppercase mb-1">Produção Anual</p>
                             <h3 className="text-3xl font-extrabold">{client.annualFeedProduction?.toLocaleString()} <span className="text-lg font-medium text-slate-400">Tons</span></h3>
                        </div>
                         
                        {/* 2. Monthly Production (Replaced Processing) */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><i className="fas fa-calendar-alt text-5xl"></i></div>
                             <p className="text-slate-400 text-xs font-bold uppercase mb-2">Produção Mensal</p>
                             <p className="text-3xl font-extrabold text-slate-800">
                                 {monthlyFeedProduction.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-lg font-medium text-slate-400">Tons</span>
                             </p>
                             <p className="text-[10px] text-slate-400 mt-1">Média estimada</p>
                        </div>

                        {/* 3. Accessible Potential (with Volume Considered) */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
                             <p className="text-slate-400 text-xs font-bold uppercase mb-2">Potencial Acessível</p>
                             <p className="text-3xl font-extrabold text-emerald-600">{accessiblePotentialTons.toLocaleString()} <span className="text-lg font-medium text-slate-400">Tons</span></p>
                             <div className="mt-2 flex items-center gap-2 bg-emerald-50 text-emerald-800 px-2 py-1 rounded-lg w-fit text-xs font-bold">
                                <i className="fas fa-percentage"></i>
                                Volume Considerado: {client.volumePercentageConsidered}%
                             </div>
                        </div>
                    </div>

                    {/* Potentials Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Cálculo de Potencial por Produto</h3>
                                <p className="text-sm text-slate-500">Baseado no volume acessível e fator de inclusão.</p>
                            </div>
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-sm">
                                <i className="fas fa-calculator"></i>
                            </div>
                        </div>
                        
                        {potentialBreakdown.length > 0 ? (
                            <table className="w-full text-left">
                                <thead className="bg-white border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-8 py-4">Produto</th>
                                        <th className="px-8 py-4 text-center">Fator</th>
                                        <th className="px-8 py-4 text-right text-emerald-600">Potencial (Tons)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {potentialBreakdown.map(({product, potentialTons}) => (
                                        <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-4">
                                                <p className="font-bold text-slate-700">{product.brand}</p>
                                                <p className="text-xs text-slate-400">{product.type}</p>
                                            </td>
                                            <td className="px-8 py-4 text-center">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">
                                                    {product.kgPerTon}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-right">
                                                <span className="text-lg font-bold text-emerald-600">
                                                    {potentialTons.toLocaleString(undefined, {minimumFractionDigits: 3})}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                             <div className="p-12 text-center text-slate-400">
                                <i className="fas fa-calculator text-4xl mb-3 opacity-20"></i>
                                <p>Nenhum produto selecionado para cálculo de potencial.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB: CONTACTS */}
            {activeTab === 'contacts' && (
                <div className="animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Main Contact (Legacy) */}
                        {(client.contactName || client.email || client.phone) && (
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                                        {client.contactName?.charAt(0) || <i className="fas fa-user"></i>}
                                    </div>
                                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">Principal</span>
                                </div>
                                <h4 className="font-bold text-slate-800 text-lg mb-1">{client.contactName || 'Sem nome'}</h4>
                                <p className="text-sm text-slate-500 mb-4">Contato Geral</p>
                                
                                <div className="space-y-2">
                                    {client.email && (
                                        <div className="flex items-center gap-3 text-sm text-slate-600">
                                            <i className="fas fa-envelope text-slate-300 w-5"></i>
                                            <a href={`mailto:${client.email}`} className="hover:text-blue-600 truncate">{client.email}</a>
                                        </div>
                                    )}
                                    {client.phone && (
                                        <div className="flex items-center gap-3 text-sm text-slate-600">
                                            <i className="fas fa-phone text-slate-300 w-5"></i>
                                            <a href={`tel:${client.phone}`} className="hover:text-blue-600">{client.phone}</a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Dynamic Contacts */}
                        {client.contacts?.map(contact => (
                            <div key={contact.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 group-hover:bg-emerald-400 transition-colors"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                                        {contact.name.charAt(0)}
                                    </div>
                                    <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">{contact.role}</span>
                                </div>
                                <h4 className="font-bold text-slate-800 text-lg mb-1">{contact.name}</h4>
                                <p className="text-sm text-slate-500 mb-4">{contact.role}</p>
                                
                                <div className="space-y-2">
                                    {contact.email && (
                                        <div className="flex items-center gap-3 text-sm text-slate-600">
                                            <i className="fas fa-envelope text-slate-300 w-5"></i>
                                            <a href={`mailto:${contact.email}`} className="hover:text-emerald-600 truncate">{contact.email}</a>
                                        </div>
                                    )}
                                    {contact.phone && (
                                        <div className="flex items-center gap-3 text-sm text-slate-600">
                                            <i className="fas fa-phone text-slate-300 w-5"></i>
                                            <a href={`tel:${contact.phone}`} className="hover:text-emerald-600">{contact.phone}</a>
                                        </div>
                                    )}
                                </div>
                                {contact.observation && (
                                    <div className="mt-4 pt-3 border-t border-slate-50 text-xs text-slate-500 italic">
                                        "{contact.observation}"
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default ClientProfile;
