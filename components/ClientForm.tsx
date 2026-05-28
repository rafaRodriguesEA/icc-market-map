
import React, { useState, useEffect } from 'react';
import { Client, ClientStatus, UserProfile, Product, AccessLevel, ClientContact, AppSettings } from '../types';
import { uploadLogo } from '../services/firebaseService';

interface ClientFormProps {
  initialData?: Client;
  onSubmit: (data: Omit<Client, 'id'>) => Promise<void>;
  onCancel: () => void;
  users: UserProfile[];
  products: Product[];
  settings: AppSettings;
}

const COUNTRIES = ["Brasil", "Estados Unidos", "China", "Argentina", "Chile", "Colômbia", "México", "Outro"];

const ClientForm: React.FC<ClientFormProps> = ({ initialData, onSubmit, onCancel, users, products, settings }) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'contatos' | 'producao'>('geral');
  const [formData, setFormData] = useState<Omit<Client, 'id'>>({
    companyName: '',
    contactName: '', // Legacy
    email: '',       // Legacy
    phone: '',       // Legacy
    contacts: [],    // Dynamic Contacts
    segment: settings.clientSegments?.[0] || '',
    status: ClientStatus.PROSPECT,
    potentialValue: 0,
    notes: '',
    lastContactDate: new Date().toISOString().split('T')[0],
    createdAt: Date.now(),
    logoUrl: '',
    ownerId: '',
    // New Fields
    managerId: '',
    sellerId: '',
    unit: '',
    country: 'Brasil',
    state: '',
    productsSoldIds: [],
    usesCompetition: false,
    competitorName: '',
    processingType: '',
    annualFeedProduction: 0,
    volumePercentageConsidered: 100,
    potentialProductIds: [],
    headsNumber: 0,
    dailyMilkProduction: 0,
    sowsNumber: 0
  });
  
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      const { id, ...rest } = initialData;
      setFormData(prev => ({ ...prev, ...rest, contacts: rest.contacts || [] }));
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // --- Contact Management ---
  const handleAddContact = () => {
    const newContact: ClientContact = {
      id: Date.now().toString(),
      name: '',
      role: '',
      email: '',
      phone: '',
      observation: ''
    };
    setFormData(prev => ({ ...prev, contacts: [...prev.contacts, newContact] }));
  };

  const handleRemoveContact = (id: string) => {
    setFormData(prev => ({ ...prev, contacts: prev.contacts.filter(c => c.id !== id) }));
  };

  const handleContactChange = (id: string, field: keyof ClientContact, value: string) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  // Logic for Multi-selects (Products Sold)
  const toggleProductSold = (productId: string) => {
    const current = formData.productsSoldIds || [];
    if (current.includes(productId)) {
        setFormData(prev => ({...prev, productsSoldIds: current.filter(id => id !== productId)}));
    } else {
        setFormData(prev => ({...prev, productsSoldIds: [...current, productId]}));
    }
  };

  // Logic for Linked Potential Products
  const togglePotentialProduct = (productId: string) => {
    const current = formData.potentialProductIds || [];
    if (current.includes(productId)) {
        setFormData(prev => ({...prev, potentialProductIds: current.filter(id => id !== productId)}));
    } else {
        setFormData(prev => ({...prev, potentialProductIds: [...current, productId]}));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalLogoUrl = formData.logoUrl;
      
      if (file) {
        finalLogoUrl = await uploadLogo(file);
      }
      
      // Update legacy contact fields with the first contact if available, for backward compat in lists
      const mainContact = formData.contacts[0];
      const dataToSubmit = {
          ...formData,
          logoUrl: finalLogoUrl,
          contactName: mainContact?.name || formData.contactName,
          email: mainContact?.email || formData.email,
          phone: mainContact?.phone || formData.phone
      };

      await onSubmit(dataToSubmit);
    } catch (error) {
      console.error("Error submitting form", error);
      alert("Erro ao salvar cliente.");
    } finally {
      setLoading(false);
    }
  };

  // Filtering Lists
  const managers = users.filter(u => u.accessLevel === AccessLevel.MANAGER || u.role.toLowerCase().includes('gerente'));
  const sellers = users.filter(u => {
      if (formData.managerId) {
          const manager = users.find(m => m.uid === formData.managerId);
          if (manager && manager.subordinates && manager.subordinates.length > 0) {
              return manager.subordinates.includes(u.uid);
          }
      }
      return u.accessLevel === AccessLevel.SELLER || u.role.toLowerCase().includes('vendedor');
  });

  // Calculations
  const accessiblePotentialTons = (formData.annualFeedProduction || 0) * ((formData.volumePercentageConsidered || 0) / 100);
  const monthlyFeedProduction = (formData.annualFeedProduction || 0) / 12;

  // Calculate Product Potentials (Tons)
  // FIX: Removed / 1000 division to treat factor as direct multiplier (Ton/Ton)
  const productPotentials = (formData.potentialProductIds || []).map(pid => {
      const product = products.find(p => p.id === pid);
      if (!product) return null;
      const potentialTons = (accessiblePotentialTons * (product.kgPerTon || 0));
      return { product, potentialTons };
  }).filter(Boolean) as { product: Product, potentialTons: number }[];


  const inputClass = "w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-500 outline-none bg-white text-slate-700 placeholder-slate-400 font-medium transition-colors";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2";

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-5xl mx-auto overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
         <div>
            <h2 className="text-2xl font-bold text-slate-800">
                {initialData ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">Gerenciamento completo de relacionamento (CRM).</p>
         </div>
         <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
             <i className="fas fa-times text-xl"></i>
         </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-50/50 border-b border-slate-200 shrink-0">
          <button 
            onClick={() => setActiveTab('geral')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors border-b-2 ${activeTab === 'geral' ? 'border-emerald-500 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
             <i className="fas fa-info-circle mr-2"></i> Geral
          </button>
          <button 
            onClick={() => setActiveTab('contatos')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors border-b-2 ${activeTab === 'contatos' ? 'border-emerald-500 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
             <i className="fas fa-address-book mr-2"></i> Contatos
          </button>
          <button 
            onClick={() => setActiveTab('producao')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors border-b-2 ${activeTab === 'producao' ? 'border-emerald-500 text-emerald-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
             <i className="fas fa-industry mr-2"></i> Produção & Potencial
          </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
        <form id="client-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* --- GERAL TAB --- */}
            {activeTab === 'geral' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Staff Assignment */}
                         <div>
                            <label className={labelClass}>Gerente Responsável</label>
                            <div className="relative">
                                <select name="managerId" value={formData.managerId} onChange={handleChange} className={`${inputClass} appearance-none`}>
                                    <option value="">Selecione...</option>
                                    {managers.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
                                </select>
                                <i className="fas fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                            </div>
                         </div>
                         <div>
                            <label className={labelClass}>Vendedor</label>
                            <div className="relative">
                                <select name="sellerId" value={formData.sellerId} onChange={handleChange} className={`${inputClass} appearance-none`}>
                                    <option value="">Selecione...</option>
                                    {sellers.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
                                </select>
                                <i className="fas fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                            </div>
                         </div>

                         {/* Basic Info */}
                         <div>
                            <label className={labelClass}>Cliente (Empresa)</label>
                            <input required name="companyName" value={formData.companyName} onChange={handleChange} className={inputClass} placeholder="Ex: AgriFoods Ltda" />
                         </div>
                         <div>
                            <label className={labelClass}>Unidade</label>
                            <input name="unit" value={formData.unit || ''} onChange={handleChange} className={inputClass} placeholder="Ex: Fábrica 01" />
                         </div>

                         {/* Location */}
                         <div>
                            <label className={labelClass}>País</label>
                            <div className="relative">
                                <select name="country" value={formData.country} onChange={handleChange} className={`${inputClass} appearance-none`}>
                                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <i className="fas fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                            </div>
                         </div>
                         <div>
                            <label className={labelClass}>Estado</label>
                            <input name="state" value={formData.state || ''} onChange={handleChange} className={inputClass} placeholder="Ex: São Paulo" />
                         </div>
                         
                         {/* Segment & Status */}
                         <div>
                            <label className={labelClass}>Perfil (Segmento)</label>
                            <div className="relative">
                                <select name="segment" value={formData.segment} onChange={handleChange} className={`${inputClass} appearance-none`}>
                                    <option value="">Selecione...</option>
                                    {settings.clientSegments?.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <i className="fas fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                            </div>
                         </div>
                         <div>
                            <label className={labelClass}>Status do Cliente</label>
                            <div className="relative">
                                <select name="status" value={formData.status} onChange={handleChange} className={`${inputClass} appearance-none`}>
                                    {Object.values(ClientStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <i className="fas fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                            </div>
                         </div>
                    </div>

                    {/* Logo Upload */}
                    <div>
                        <label className={labelClass}>Logo do Cliente</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                                {file ? (
                                    <img src={URL.createObjectURL(file)} className="w-full h-full object-contain" alt="Preview" />
                                ) : formData.logoUrl ? (
                                    <img src={formData.logoUrl} className="w-full h-full object-contain" alt="Current" />
                                ) : (
                                    <i className="fas fa-image text-slate-300 text-2xl"></i>
                                )}
                            </div>
                            <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold transition-colors">
                                <i className="fas fa-upload mr-2"></i> Selecionar Imagem
                                <input type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
                            </label>
                        </div>
                    </div>

                    {/* Products Sold (Multi-select) */}
                    <div>
                        <label className={labelClass}>Quais Produtos Vendemos até o momento?</label>
                        <div className="border border-slate-200 rounded-xl p-4 bg-white grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                            {products.map(p => (
                                <label key={p.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${formData.productsSoldIds?.includes(p.id!) ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.productsSoldIds?.includes(p.id!) || false}
                                        onChange={() => toggleProductSold(p.id!)}
                                        className="rounded text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm font-medium truncate" title={p.brand}>{p.brand}</span>
                                </label>
                            ))}
                            {products.length === 0 && <p className="col-span-full text-slate-400 text-sm italic">Nenhum produto cadastrado no catálogo.</p>}
                        </div>
                    </div>

                    {/* Competition */}
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                        <label className="flex items-center gap-3 cursor-pointer mb-3">
                             <div className="relative">
                                 <input type="checkbox" name="usesCompetition" checked={formData.usesCompetition || false} onChange={handleCheckboxChange} className="sr-only peer" />
                                 <div className="w-10 h-6 bg-slate-300 rounded-full peer peer-checked:bg-orange-500 transition-all"></div>
                                 <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-4"></div>
                             </div>
                             <span className="font-bold text-slate-700 text-sm">Cliente usa concorrência?</span>
                        </label>
                        {formData.usesCompetition && (
                            <div className="animate-fade-in">
                                <label className="block text-xs font-bold text-orange-700 uppercase tracking-wide mb-1">Qual Concorrente?</label>
                                <input name="competitorName" value={formData.competitorName || ''} onChange={handleChange} className="w-full p-2.5 rounded-lg border border-orange-200 focus:border-orange-500 outline-none bg-white text-slate-700" placeholder="Nome do concorrente" />
                            </div>
                        )}
                    </div>

                     {/* Notes - Moved to General Tab */}
                    <div className="pt-2">
                        <label className={labelClass}>Notas Gerais / Histórico</label>
                        <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={4} className={inputClass} placeholder="Observações importantes sobre o cliente..." />
                    </div>
                </div>
            )}

            {/* --- CONTATOS TAB --- */}
            {activeTab === 'contatos' && (
                <div className="space-y-6 animate-fade-in">
                     <div className="flex justify-between items-center mb-4">
                         <h4 className="font-bold text-slate-800">Lista de Contatos</h4>
                         <button type="button" onClick={handleAddContact} className="text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                             <i className="fas fa-plus mr-2"></i> Adicionar Contato
                         </button>
                     </div>

                     <div className="space-y-4">
                         {formData.contacts.map((contact, index) => (
                             <div key={contact.id} className="bg-slate-50 border border-slate-200 rounded-xl p-6 relative group hover:border-blue-300 transition-colors">
                                 <button type="button" onClick={() => handleRemoveContact(contact.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50">
                                     <i className="fas fa-trash"></i>
                                 </button>
                                 
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div>
                                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome</label>
                                         <input 
                                            value={contact.name} 
                                            onChange={(e) => handleContactChange(contact.id, 'name', e.target.value)} 
                                            className="w-full p-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none bg-white text-slate-700 text-sm font-medium" 
                                            placeholder="Nome Completo"
                                         />
                                     </div>
                                     <div>
                                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cargo (Ex: Nutricionista, Decisor)</label>
                                         <input 
                                            value={contact.role} 
                                            onChange={(e) => handleContactChange(contact.id, 'role', e.target.value)} 
                                            className="w-full p-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none bg-white text-slate-700 text-sm" 
                                            placeholder="Cargo"
                                         />
                                     </div>
                                     <div>
                                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email</label>
                                         <input 
                                            type="email"
                                            value={contact.email} 
                                            onChange={(e) => handleContactChange(contact.id, 'email', e.target.value)} 
                                            className="w-full p-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none bg-white text-slate-700 text-sm" 
                                            placeholder="email@exemplo.com"
                                         />
                                     </div>
                                     <div>
                                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telefone</label>
                                         <input 
                                            value={contact.phone} 
                                            onChange={(e) => handleContactChange(contact.id, 'phone', e.target.value)} 
                                            className="w-full p-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none bg-white text-slate-700 text-sm" 
                                            placeholder="(00) 00000-0000"
                                         />
                                     </div>
                                     <div className="md:col-span-2">
                                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observação do Contato</label>
                                         <input 
                                            value={contact.observation} 
                                            onChange={(e) => handleContactChange(contact.id, 'observation', e.target.value)} 
                                            className="w-full p-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none bg-white text-slate-700 text-sm" 
                                            placeholder="Notas específicas sobre este contato..."
                                         />
                                     </div>
                                 </div>
                             </div>
                         ))}

                         {formData.contacts.length === 0 && (
                             <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
                                 <i className="fas fa-address-book text-3xl mb-3 opacity-30"></i>
                                 <p>Nenhum contato cadastrado.</p>
                                 <p className="text-sm">Adicione nutricionistas, compradores e decisores.</p>
                             </div>
                         )}
                     </div>
                </div>
            )}

            {/* --- PRODUÇÃO TAB --- */}
            {activeTab === 'producao' && (
                <div className="space-y-8 animate-fade-in">
                    
                    {/* Process & Volume Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="md:col-span-3">
                            <label className={labelClass}>Tipo de Processamento</label>
                            <input name="processingType" value={formData.processingType || ''} onChange={handleChange} className={inputClass} placeholder="Ex: Peletizado, Extrusado..." />
                         </div>
                         <div>
                            <label className={labelClass}>Produção Ração (Tons/Ano)</label>
                            <input type="number" name="annualFeedProduction" value={formData.annualFeedProduction || ''} onChange={handleChange} className={inputClass} placeholder="0" />
                         </div>
                         <div>
                            <label className={labelClass}>% Considerar Volume</label>
                            <div className="relative">
                                <input type="number" name="volumePercentageConsidered" value={formData.volumePercentageConsidered || ''} onChange={handleChange} className={inputClass} placeholder="100" />
                                <span className="absolute right-4 top-3 text-slate-400 font-bold">%</span>
                            </div>
                         </div>
                         <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col justify-center">
                             <span className="text-xs font-bold text-slate-500 uppercase">Potencial Acessível</span>
                             <span className="text-xl font-extrabold text-emerald-600">{accessiblePotentialTons.toLocaleString()} <span className="text-sm text-slate-400">Tons</span></span>
                             <span className="text-[10px] text-slate-400">Ração Mensal: {monthlyFeedProduction.toLocaleString()} Tons</span>
                         </div>
                    </div>

                    {/* Specific Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <div>
                            <label className={labelClass}>Número de Cabeças</label>
                            <input type="number" name="headsNumber" value={formData.headsNumber || ''} onChange={handleChange} className={`${inputClass} bg-white`} />
                        </div>
                        <div>
                            <label className={labelClass}>Prod. Leite (Dia)</label>
                            <input type="number" name="dailyMilkProduction" value={formData.dailyMilkProduction || ''} onChange={handleChange} className={`${inputClass} bg-white`} />
                        </div>
                        <div>
                            <label className={labelClass}>Número de Matrizes</label>
                            <input type="number" name="sowsNumber" value={formData.sowsNumber || ''} onChange={handleChange} className={`${inputClass} bg-white`} />
                        </div>
                    </div>

                    {/* Product Selection for Potential Calculation */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h4 className="font-bold text-slate-800">Cálculo de Potencial por Produto</h4>
                                <p className="text-sm text-slate-500">Selecione os produtos para calcular o volume potencial baseado no fator Kg/Ton.</p>
                            </div>
                            <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-sm font-bold border border-emerald-100">
                                {formData.productsSoldIds?.length || 0} Produtos Vendidos
                            </div>
                        </div>

                        {/* Product Picker */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                             <div className="bg-slate-100 p-3 border-b border-slate-200 font-bold text-xs text-slate-500 uppercase">Selecione para Calcular</div>
                             <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto bg-white">
                                 {products.map(p => (
                                     <label key={p.id} className={`flex flex-col p-2 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${formData.potentialProductIds?.includes(p.id!) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}`}>
                                         <div className="flex justify-between items-start">
                                            <span className="font-bold text-sm text-slate-700 truncate w-full" title={p.brand}>{p.brand}</span>
                                            <input 
                                                type="checkbox" 
                                                checked={formData.potentialProductIds?.includes(p.id!) || false}
                                                onChange={() => togglePotentialProduct(p.id!)}
                                                className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                                            />
                                         </div>
                                         <span className="text-[10px] text-slate-400 mt-1">Fator: {p.kgPerTon}</span>
                                     </label>
                                 ))}
                             </div>
                        </div>

                        {/* Calculation Results Table */}
                        {productPotentials.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-100 text-slate-500 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="p-3">Produto</th>
                                            <th className="p-3 text-right">Fator</th>
                                            <th className="p-3 text-right text-emerald-600">Potencial (Tons)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {productPotentials.map(({product, potentialTons}) => (
                                            <tr key={product.id}>
                                                <td className="p-3 font-medium text-slate-700">{product.brand}</td>
                                                <td className="p-3 text-right text-slate-500">{product.kgPerTon}</td>
                                                <td className="p-3 text-right font-bold text-emerald-600">{potentialTons.toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3})}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </form>
      </div>

      {/* Footer Actions */}
      <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-end gap-4 shrink-0">
          <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-xl text-slate-600 hover:bg-white font-bold transition-colors border border-transparent hover:border-slate-300">
            Cancelar
          </button>
          <button type="submit" form="client-form" disabled={loading} className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-900/20 transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center">
            {loading && <i className="fas fa-spinner fa-spin mr-2"></i>}
            {initialData ? 'Salvar Alterações' : 'Criar Cliente'}
          </button>
      </div>
    </div>
  );
};

export default ClientForm;
