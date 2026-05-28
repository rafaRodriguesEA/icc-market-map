
import React, { useState } from 'react';
import { Product, ProductVariation, AppSettings, UserProfile, AccessLevel } from '../types';
import { saveProduct, deleteProduct } from '../services/firebaseService';

interface ProductCatalogProps {
  products: Product[];
  settings: AppSettings;
  userProfile: UserProfile;
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({ products, settings, userProfile }) => {
  // State
  const [viewMode, setViewMode] = useState<'grid' | 'form'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null); // For Detail View
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null); // For Form
  const [tempVariation, setTempVariation] = useState<Partial<ProductVariation> | null>(null); // For Form Variation

  const canEdit = userProfile.accessLevel === AccessLevel.SUPERADMIN || 
                  userProfile.email === 'giovane.santos@iccbrazil.com.br';

  // --- Handlers ---

  const handleCreate = () => {
    setEditingProduct({
        brand: '',
        kgPerTon: undefined,
        type: settings.productTypes?.[0] || 'Outros',
        variations: []
    });
    setViewMode('form');
  };

  const handleEdit = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProduct({ ...product });
    setViewMode('form');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Deseja excluir este produto e todas suas variações?")) {
        await deleteProduct(id);
        if (selectedProduct?.id === id) setSelectedProduct(null);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.brand) return;
    
    const productToSave: Product = {
        id: editingProduct.id,
        brand: editingProduct.brand,
        type: editingProduct.type || (settings.productTypes?.[0] || 'Outros'),
        kgPerTon: editingProduct.kgPerTon || 0,
        variations: editingProduct.variations || []
    };

    try {
        await saveProduct(productToSave);
        setViewMode('grid');
        setEditingProduct(null);
    } catch (error) {
        console.error("Error saving product", error);
        alert("Erro ao salvar produto");
    }
  };

  // --- Variation Handlers (Form) ---

  const handleAddVariation = () => {
    setTempVariation({
        id: Date.now().toString(),
        packaging: settings.packagings[0] || '',
        incoterm: settings.incoterms[0] || 'CIF',
        currency: 'USD',
        price: undefined,
        destination: '',
        country: '',
        fobSantos: undefined,
        cifBaltimore: undefined,
        cifAntwerp: undefined,
        fcaIcc: undefined
    });
  };

  const handleSaveVariation = () => {
      if (tempVariation && editingProduct) {
          const variationToSave: ProductVariation = {
              id: tempVariation.id!,
              packaging: tempVariation.packaging || '',
              incoterm: tempVariation.incoterm || '',
              currency: tempVariation.currency || 'USD',
              price: tempVariation.price || 0,
              destination: tempVariation.destination || '',
              country: tempVariation.country || '',
              fobSantos: tempVariation.fobSantos || 0,
              cifBaltimore: tempVariation.cifBaltimore || 0,
              cifAntwerp: tempVariation.cifAntwerp || 0,
              fcaIcc: tempVariation.fcaIcc || 0
          };

          const currentVariations = editingProduct.variations || [];
          const exists = currentVariations.find(v => v.id === variationToSave.id);
          
          let newVariations;
          if (exists) {
              newVariations = currentVariations.map(v => v.id === variationToSave.id ? variationToSave : v);
          } else {
              newVariations = [...currentVariations, variationToSave];
          }

          setEditingProduct({ ...editingProduct, variations: newVariations });
          setTempVariation(null);
      }
  };

  const handleDeleteVariation = (id: string) => {
      if (editingProduct) {
          const newVariations = (editingProduct.variations || []).filter(v => v.id !== id);
          setEditingProduct({ ...editingProduct, variations: newVariations });
      }
  };

  // --- Render ---

  if (viewMode === 'form') {
      return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-slide-up max-w-5xl mx-auto">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-xl text-slate-800">
                    {editingProduct?.id ? 'Editar Produto' : 'Novo Produto'}
                    </h3>
                    <button onClick={() => setViewMode('grid')} className="text-slate-400 hover:text-slate-600">
                    <i className="fas fa-times text-xl"></i>
                    </button>
            </div>
            
            <div className="p-8 space-y-8">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Marca / Produto</label>
                            <input 
                                required
                                value={editingProduct?.brand || ''} 
                                onChange={e => setEditingProduct(prev => ({...prev, brand: e.target.value}))}
                                className="w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-slate-700 bg-white"
                                placeholder="Ex: Hilyses"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Tipo</label>
                            <div className="relative">
                                <select 
                                    required
                                    value={editingProduct?.type || settings.productTypes?.[0]} 
                                    onChange={e => setEditingProduct(prev => ({...prev, type: e.target.value}))}
                                    className="w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-slate-700 bg-white appearance-none"
                                >
                                    {settings.productTypes?.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                                <i className="fas fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Fator de Potencial</label>
                            <input 
                                type="number"
                                step="0.0001"
                                value={editingProduct?.kgPerTon ?? ''} 
                                onChange={e => setEditingProduct(prev => ({...prev, kgPerTon: e.target.value === '' ? undefined : parseFloat(e.target.value)}))}
                                className="w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-slate-700 bg-white"
                                placeholder="Ex: 0.001"
                            />
                        </div>
                    </div>

                    {/* Variations Section */}
                    <div>
                        <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-2">
                            <h4 className="font-bold text-slate-700">Árvore de Variações (SKUs)</h4>
                            <button 
                                type="button" 
                                onClick={handleAddVariation}
                                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <i className="fas fa-plus mr-1"></i> Adicionar Variação
                            </button>
                        </div>

                        {/* Variation List */}
                        <div className="overflow-x-auto border border-slate-200 rounded-xl mb-6">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="p-3">Embalagem</th>
                                        <th className="p-3">Incoterm</th>
                                        <th className="p-3">Destino/País</th>
                                        <th className="p-3 text-right">Preço</th>
                                        <th className="p-3 text-right">Eq. FOB Santos</th>
                                        <th className="p-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {editingProduct?.variations?.map((v) => (
                                        <tr key={v.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-medium text-slate-700">{v.packaging}</td>
                                            <td className="p-3">
                                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">{v.incoterm}</span>
                                            </td>
                                            <td className="p-3 text-slate-600">{v.destination}, {v.country}</td>
                                            <td className="p-3 text-right font-bold text-emerald-600">
                                                {v.currency} {v.price ? v.price.toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}
                                            </td>
                                            <td className="p-3 text-right text-slate-500">
                                                ${v.fobSantos ? v.fobSantos.toLocaleString(undefined, {minimumFractionDigits: 2}) : '-'}
                                            </td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => setTempVariation(v)} className="text-slate-400 hover:text-blue-600 mr-2"><i className="fas fa-pencil-alt"></i></button>
                                                <button onClick={() => handleDeleteVariation(v.id)} className="text-slate-400 hover:text-red-600"><i className="fas fa-times"></i></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!editingProduct?.variations || editingProduct.variations.length === 0) && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                                                Nenhuma variação adicionada.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Variation Edit Modal/Panel (Inline) */}
                        {tempVariation && (
                            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 shadow-inner animate-fade-in relative">
                                <h5 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <i className="fas fa-tag text-emerald-500"></i>
                                    {tempVariation.id && editingProduct?.variations?.some(v => v.id === tempVariation.id) ? 'Editar Variação' : 'Nova Variação'}
                                </h5>
                                
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Embalagem</label>
                                        <select 
                                            className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:border-emerald-500 outline-none bg-white text-slate-700" 
                                            value={tempVariation.packaging || ''}
                                            onChange={e => setTempVariation({...tempVariation, packaging: e.target.value})}
                                        >
                                            {settings.packagings?.map(pkg => (
                                                <option key={pkg} value={pkg}>{pkg}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Incoterm</label>
                                        <select 
                                            className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:border-emerald-500 outline-none bg-white text-slate-700"
                                            value={tempVariation.incoterm || ''}
                                            onChange={e => setTempVariation({...tempVariation, incoterm: e.target.value})}
                                        >
                                            {settings.incoterms?.map(inc => (
                                                <option key={inc} value={inc}>{inc}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Moeda</label>
                                        <select 
                                            className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:border-emerald-500 outline-none bg-white text-slate-700"
                                            value={tempVariation.currency || 'USD'}
                                            onChange={e => setTempVariation({...tempVariation, currency: e.target.value as any})}
                                        >
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="BRL">R$ (BRL)</option>
                                            <option value="RMB">RMB</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Preço Unitário</label>
                                        <input 
                                            type="number" step="0.01"
                                            className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:border-emerald-500 outline-none bg-white text-slate-700" 
                                            value={tempVariation.price ?? ''}
                                            onChange={e => setTempVariation({...tempVariation, price: e.target.value === '' ? undefined : parseFloat(e.target.value)})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Destino (Porto/Cidade)</label>
                                        <input 
                                            className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:border-emerald-500 outline-none bg-white text-slate-700" 
                                            value={tempVariation.destination || ''}
                                            onChange={e => setTempVariation({...tempVariation, destination: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">País</label>
                                        <input 
                                            className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:border-emerald-500 outline-none bg-white text-slate-700" 
                                            value={tempVariation.country || ''}
                                            onChange={e => setTempVariation({...tempVariation, country: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-lg border border-slate-200 mb-4">
                                    <h6 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Equivalentes (USD/Kg)</h6>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1">FOB Santos</label>
                                            <input type="number" step="0.001" className="w-full p-1.5 rounded border border-slate-300 text-sm bg-white text-slate-700" value={tempVariation.fobSantos ?? ''} onChange={e => setTempVariation({...tempVariation, fobSantos: e.target.value === '' ? undefined : parseFloat(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1">CIF Baltimore</label>
                                            <input type="number" step="0.001" className="w-full p-1.5 rounded border border-slate-300 text-sm bg-white text-slate-700" value={tempVariation.cifBaltimore ?? ''} onChange={e => setTempVariation({...tempVariation, cifBaltimore: e.target.value === '' ? undefined : parseFloat(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1">CIF Antuérpia</label>
                                            <input type="number" step="0.001" className="w-full p-1.5 rounded border border-slate-300 text-sm bg-white text-slate-700" value={tempVariation.cifAntwerp ?? ''} onChange={e => setTempVariation({...tempVariation, cifAntwerp: e.target.value === '' ? undefined : parseFloat(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1">FCA ICC</label>
                                            <input type="number" step="0.001" className="w-full p-1.5 rounded border border-slate-300 text-sm bg-white text-slate-700" value={tempVariation.fcaIcc ?? ''} onChange={e => setTempVariation({...tempVariation, fcaIcc: e.target.value === '' ? undefined : parseFloat(e.target.value)})} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setTempVariation(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium">Cancelar</button>
                                    <button type="button" onClick={handleSaveVariation} className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-bold shadow-sm">Confirmar Variação</button>
                                </div>
                            </div>
                        )}
                    </div>
            </div>

            <div className="bg-slate-50 px-8 py-6 border-t border-slate-100 flex justify-end gap-4">
                    <button onClick={() => setViewMode('grid')} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-white border border-transparent hover:border-slate-200 rounded-xl transition-all">
                        Cancelar
                    </button>
                    <button onClick={handleSaveProduct} className="px-8 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 hover:shadow-xl transform hover:-translate-y-0.5 transition-all">
                        Salvar Produto Completo
                    </button>
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-end border-b border-slate-200 pb-6">
            <div>
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Catálogo de Produtos</h2>
                <p className="text-slate-500 mt-1 font-medium">Gerencie o portfólio e visualize a árvore de variações.</p>
            </div>
            {canEdit && (
                <button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-200 transform hover:-translate-y-0.5 flex items-center gap-2 font-bold">
                    <i className="fas fa-plus"></i> Novo Produto
                </button>
            )}
        </div>

        {/* Grid View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => {
                // Safety check for variations
                const variations = product.variations || [];
                const varCount = variations.length;
                
                // Safety check for prices to prevent Math.min/max crashing on empty arrays or undefined values
                const prices = variations.map(v => v.price).filter(p => typeof p === 'number');
                const minPrice = prices.length ? Math.min(...prices) : 0;
                const maxPrice = prices.length ? Math.max(...prices) : 0;
                
                return (
                    <div 
                        key={product.id} 
                        onClick={() => setSelectedProduct(product)}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col overflow-hidden relative"
                    >
                        {/* Colored Top Bar */}
                        <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-emerald-500"></div>
                        
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors border border-slate-100">
                                    <i className="fas fa-cube text-xl"></i>
                                </div>
                                {canEdit && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => handleEdit(product, e)} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
                                            <i className="fas fa-pencil-alt text-xs"></i>
                                        </button>
                                        <button onClick={(e) => handleDelete(product.id!, e)} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors">
                                            <i className="fas fa-trash text-xs"></i>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <h4 className="font-bold text-lg text-slate-800 mb-1 leading-tight">{product.brand}</h4>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">{product.type}</span>
                            
                            <div className="mt-auto space-y-3">
                                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <i className="fas fa-layer-group text-slate-400"></i>
                                    <span className="font-bold">{varCount}</span> 
                                    <span className="text-xs">Variações Ativas</span>
                                </div>

                                {varCount > 0 ? (
                                    <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                                        <span>Faixa de Preço:</span>
                                        <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                                            ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-400 italic text-center py-1">Sem preços cadastrados</div>
                                )}
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 p-3 text-center border-t border-slate-100 group-hover:bg-blue-50 transition-colors">
                            <span className="text-xs font-bold text-blue-600">Ver Árvore de Variações <i className="fas fa-arrow-right ml-1"></i></span>
                        </div>
                    </div>
                );
            })}
            
            {products.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center p-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <i className="fas fa-box-open text-5xl mb-4 text-slate-300"></i>
                    <p className="font-medium text-lg">Catálogo Vazio</p>
                    <p className="text-sm">Comece adicionando seu primeiro produto.</p>
                </div>
            )}
        </div>

        {/* Detail Modal */}
        {selectedProduct && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setSelectedProduct(null)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                    {/* Modal Header */}
                    <div className="bg-slate-900 text-white p-8 flex justify-between items-start relative overflow-hidden shrink-0">
                         <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-emerald-900 opacity-50"></div>
                         <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-2 py-1 bg-white/10 rounded text-[10px] font-bold uppercase tracking-widest border border-white/10">{selectedProduct.type}</span>
                                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold border border-emerald-500/30">Fator: {selectedProduct.kgPerTon}</span>
                            </div>
                            <h2 className="text-4xl font-extrabold tracking-tight">{selectedProduct.brand}</h2>
                         </div>
                         <button onClick={() => setSelectedProduct(null)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors relative z-10">
                             <i className="fas fa-times"></i>
                         </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                        <div className="mb-6 flex items-center gap-2">
                             <i className="fas fa-sitemap text-slate-400"></i>
                             <h3 className="text-lg font-bold text-slate-800">Árvore de Variações</h3>
                        </div>

                        {(!selectedProduct.variations || selectedProduct.variations.length === 0) ? (
                            <div className="bg-white rounded-xl p-12 text-center text-slate-400 shadow-sm border border-slate-200">
                                <i className="fas fa-leaf text-4xl mb-3 opacity-20"></i>
                                <p>Nenhuma variação cadastrada para este produto.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {selectedProduct.variations.map((variation, index) => (
                                    <div key={index} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
                                        {/* Left: Main Info */}
                                        <div className="p-6 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 w-full md:w-1/3 flex flex-col justify-center">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                                    <i className="fas fa-box"></i>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 font-bold uppercase">Embalagem</p>
                                                    <p className="font-bold text-slate-800">{variation.packaging}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                                    <i className="fas fa-globe"></i>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 font-bold uppercase">Incoterm</p>
                                                    <p className="font-bold text-slate-800">{variation.incoterm}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Middle: Logistics */}
                                        <div className="p-6 w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-center">
                                            <div className="mb-4">
                                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Destino</p>
                                                <p className="font-medium text-slate-700 flex items-center gap-2">
                                                    <i className="fas fa-map-marker-alt text-red-400"></i>
                                                    {variation.destination}, {variation.country}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Preço Venda</p>
                                                <p className="text-2xl font-bold text-emerald-600">
                                                    {variation.currency} {variation.price ? variation.price.toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right: Equivalents Tree */}
                                        <div className="p-6 w-full md:w-1/3 bg-slate-50/50">
                                            <p className="text-xs text-slate-400 font-bold uppercase mb-3 text-center">Equivalências (USD/Kg)</p>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2 border-dashed">
                                                    <span className="text-slate-600">FOB Santos</span>
                                                    <span className="font-mono font-bold text-slate-800">${variation.fobSantos?.toFixed(3)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2 border-dashed">
                                                    <span className="text-slate-600">CIF Baltimore</span>
                                                    <span className="font-mono font-bold text-slate-800">${variation.cifBaltimore?.toFixed(3)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2 border-dashed">
                                                    <span className="text-slate-600">CIF Antuérpia</span>
                                                    <span className="font-mono font-bold text-slate-800">${variation.cifAntwerp?.toFixed(3)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600">FCA ICC</span>
                                                    <span className="font-mono font-bold text-slate-800">${variation.fcaIcc?.toFixed(3)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="p-5 border-t border-slate-200 bg-white flex justify-end">
                        <button onClick={() => setSelectedProduct(null)} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default ProductCatalog;
