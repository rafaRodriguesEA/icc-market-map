
import React, { useState } from 'react';
import { UserProfile, AppSettings, AccessLevel, Product } from '../types';
import { uploadFile, saveUser, deleteUser, updateSettings, addDepartment, removeDepartment, addPackaging, removePackaging, addIncoterm, removeIncoterm, addClientSegment, removeClientSegment, addProductType, removeProductType } from '../services/firebaseService';

interface AdminPanelProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  settings: AppSettings;
  products: Product[]; // Kept in prop interface to not break App.tsx passing it, but unused here
}

const MASTER_EMAIL = 'giovane.santos@iccbrazil.com.br';

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, allUsers, settings }) => {
  const [activeTab, setActiveTab] = useState<'config' | 'collaborators'>('config');
  
  // Branding State
  const [uploading, setUploading] = useState(false);
  
  // User Form State
  const [editingUser, setEditingUser] = useState<Partial<UserProfile> | null>(null);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [userFormError, setUserFormError] = useState('');
  
  // Settings List States
  const [newDept, setNewDept] = useState('');
  const [newPkg, setNewPkg] = useState('');
  const [newInc, setNewInc] = useState('');
  const [newSeg, setNewSeg] = useState('');
  const [newPType, setNewPType] = useState('');

  // Handle Image Uploads
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setUploading(true);
      try {
        const url = await uploadFile(e.target.files[0], 'branding');
        await updateSettings({ logoUrl: url });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setUploading(true);
      try {
        const url = await uploadFile(e.target.files[0], 'branding');
        await updateSettings({ coverImageUrl: url });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleUserPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && editingUser) {
        setUploading(true);
        try {
            const url = await uploadFile(e.target.files[0], 'avatars');
            setEditingUser(prev => ({ ...prev, photoUrl: url }));
        } finally {
            setUploading(false);
        }
    }
  };

  // User Management
  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
  };

  const handleCreateUser = () => {
    setEditingUser({
        uid: Date.now().toString(),
        accessLevel: AccessLevel.SELLER,
        department: settings.departments[0] || '',
        subordinates: [],
        canViewSpecificUsers: []
    });
    setIsUserFormOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser?.email || !editingUser?.displayName) {
        setUserFormError("Nome e Email são obrigatórios.");
        return;
    }

    try {
        await saveUser(editingUser as UserProfile);
        setIsUserFormOpen(false);
        setEditingUser(null);
    } catch (err) {
        console.error(err);
        setUserFormError("Erro ao salvar usuário.");
    }
  };

  const handleDeleteUser = async (uid: string) => {
      if (window.confirm("Tem certeza que deseja remover este colaborador?")) {
          try {
              await deleteUser(uid);
          } catch (e: any) {
              alert(e.message);
          }
      }
  };

  // Subordinate Logic
  const sellers = allUsers.filter(u => u.accessLevel === AccessLevel.SELLER);
  
  const toggleSubordinate = (uid: string) => {
      const current = editingUser?.subordinates || [];
      if (current.includes(uid)) {
          setEditingUser(prev => ({...prev, subordinates: current.filter(id => id !== uid)}));
      } else {
          setEditingUser(prev => ({...prev, subordinates: [...current, uid]}));
      }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden min-h-[600px] flex flex-col animate-slide-up">
      <div className="bg-slate-900 text-white p-8 flex justify-between items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/30 to-blue-900/30"></div>
        <div className="relative z-10">
            <h2 className="text-2xl font-bold">Painel Administrativo</h2>
            <p className="text-slate-400 text-sm mt-1">Configurações globais e gestão de acesso.</p>
        </div>
        <div className="flex bg-slate-800/50 p-1 rounded-xl backdrop-blur-sm relative z-10">
            <button 
                onClick={() => setActiveTab('config')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'config' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <i className="fas fa-sliders-h mr-2"></i> Configurações
            </button>
            <button 
                onClick={() => setActiveTab('collaborators')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'collaborators' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <i className="fas fa-users-cog mr-2"></i> Equipe
            </button>
        </div>
      </div>

      <div className="p-8 flex-1 overflow-y-auto bg-slate-50">
        {/* CONFIGURATION TAB (Visual + Lists) */}
        {activeTab === 'config' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                
                {/* Branding Section */}
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">Identidade Visual</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Logo Section */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800">Logo da Aplicação</h3>
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">PNG Recomendado</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-full h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center mb-4 overflow-hidden relative group transition-colors hover:border-emerald-400 hover:bg-emerald-50/10">
                                {settings.logoUrl ? (
                                    <img src={settings.logoUrl} className="w-1/2 h-1/2 object-contain" alt="Logo" />
                                ) : (
                                    <div className="text-slate-300 flex flex-col items-center">
                                        <i className="fas fa-image text-4xl mb-2"></i>
                                        <span className="text-sm">Nenhuma logo</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                    <label className="cursor-pointer">
                                        <span className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm shadow hover:scale-105 transition-transform">
                                            {uploading ? 'Enviando...' : 'Trocar Imagem'}
                                        </span>
                                        <input type="file" onChange={handleLogoUpload} accept="image/*" className="hidden" disabled={uploading} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cover Section */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                         <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800">Capa de Login</h3>
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Alta Resolução</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-full h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center mb-4 overflow-hidden relative group transition-colors hover:border-emerald-400 hover:bg-emerald-50/10">
                                {settings.coverImageUrl ? (
                                    <img src={settings.coverImageUrl} className="w-full h-full object-cover" alt="Cover" />
                                ) : (
                                    <div className="text-slate-300 flex flex-col items-center">
                                        <i className="fas fa-image text-4xl mb-2"></i>
                                        <span className="text-sm">Nenhuma capa</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                    <label className="cursor-pointer">
                                        <span className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm shadow hover:scale-105 transition-transform">
                                            {uploading ? 'Enviando...' : 'Trocar Imagem'}
                                        </span>
                                        <input type="file" onChange={handleCoverUpload} accept="image/*" className="hidden" disabled={uploading} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lists Management */}
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 pt-6">Gerenciar Listas e Opções</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    {/* Client Segments */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><i className="fas fa-tags text-slate-400"></i> Perfis de Cliente (Segmentos)</h4>
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text" 
                                value={newSeg}
                                onChange={(e) => setNewSeg(e.target.value)}
                                placeholder="Novo perfil..." 
                                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-emerald-500 bg-white text-slate-700"
                            />
                            <button onClick={() => { if(newSeg) { addClientSegment(newSeg); setNewSeg(''); } }} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700"><i className="fas fa-plus"></i></button>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                            {settings.clientSegments?.map(item => (
                                <span key={item} className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-2">
                                    {item}
                                    <button onClick={() => removeClientSegment(item)} className="text-slate-400 hover:text-red-500"><i className="fas fa-times"></i></button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Product Types - NEW */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><i className="fas fa-flask text-slate-400"></i> Tipos de Produto</h4>
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text" 
                                value={newPType}
                                onChange={(e) => setNewPType(e.target.value)}
                                placeholder="Novo tipo..." 
                                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-emerald-500 bg-white text-slate-700"
                            />
                            <button onClick={() => { if(newPType) { addProductType(newPType); setNewPType(''); } }} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700"><i className="fas fa-plus"></i></button>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                            {settings.productTypes?.map(item => (
                                <span key={item} className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-2">
                                    {item}
                                    <button onClick={() => removeProductType(item)} className="text-slate-400 hover:text-red-500"><i className="fas fa-times"></i></button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Departments */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><i className="fas fa-building text-slate-400"></i> Departamentos</h4>
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text" 
                                value={newDept}
                                onChange={(e) => setNewDept(e.target.value)}
                                placeholder="Novo departamento..." 
                                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-emerald-500 bg-white text-slate-700"
                            />
                            <button onClick={() => { if(newDept) { addDepartment(newDept); setNewDept(''); } }} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700"><i className="fas fa-plus"></i></button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {settings.departments?.map(item => (
                                <span key={item} className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-2">
                                    {item}
                                    <button onClick={() => removeDepartment(item)} className="text-slate-400 hover:text-red-500"><i className="fas fa-times"></i></button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Packagings */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><i className="fas fa-box text-slate-400"></i> Embalagens</h4>
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text" 
                                value={newPkg}
                                onChange={(e) => setNewPkg(e.target.value)}
                                placeholder="Nova embalagem..." 
                                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-emerald-500 bg-white text-slate-700"
                            />
                            <button onClick={() => { if(newPkg) { addPackaging(newPkg); setNewPkg(''); } }} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700"><i className="fas fa-plus"></i></button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {settings.packagings?.map(item => (
                                <span key={item} className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-2">
                                    {item}
                                    <button onClick={() => removePackaging(item)} className="text-slate-400 hover:text-red-500"><i className="fas fa-times"></i></button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Incoterms */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><i className="fas fa-globe text-slate-400"></i> Incoterms</h4>
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text" 
                                value={newInc}
                                onChange={(e) => setNewInc(e.target.value)}
                                placeholder="Novo incoterm..." 
                                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:border-emerald-500 bg-white text-slate-700"
                            />
                            <button onClick={() => { if(newInc) { addIncoterm(newInc); setNewInc(''); } }} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700"><i className="fas fa-plus"></i></button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {settings.incoterms?.map(item => (
                                <span key={item} className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-2">
                                    {item}
                                    <button onClick={() => removeIncoterm(item)} className="text-slate-400 hover:text-red-500"><i className="fas fa-times"></i></button>
                                </span>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        )}

        {/* COLLABORATORS TAB */}
        {activeTab === 'collaborators' && (
            <div className="animate-fade-in">
                {!isUserFormOpen ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <i className="fas fa-users"></i>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">Membros da Equipe</h3>
                                    <p className="text-xs text-slate-500">{allUsers.length} usuários ativos</p>
                                </div>
                             </div>
                             <button onClick={handleCreateUser} className="bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 transition shadow-md shadow-emerald-200 flex items-center gap-2 font-bold text-sm">
                                <i className="fas fa-user-plus"></i> Novo Usuário
                             </button>
                        </div>

                        {/* Users Table */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Colaborador</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cargo/Dept</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acesso</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {allUsers.map(user => (
                                        <tr key={user.uid} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={user.photoUrl || "https://ui-avatars.com/api/?background=random"} className="w-10 h-10 rounded-full object-cover border border-slate-200" alt="" />
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">{user.displayName} {user.email === MASTER_EMAIL && <i className="fas fa-crown text-yellow-500 ml-1 text-xs" title="Master Admin"></i>}</p>
                                                        <p className="text-xs text-slate-500">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm font-medium text-slate-700">{user.role}</p>
                                                <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">{user.department}</span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                                    user.accessLevel === AccessLevel.SUPERADMIN ? 'bg-purple-100 text-purple-700' :
                                                    user.accessLevel === AccessLevel.MANAGER ? 'bg-blue-100 text-blue-700' :
                                                    'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {user.accessLevel}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => handleEditUser(user)} className="w-8 h-8 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-all mr-2">
                                                    <i className="fas fa-pencil-alt"></i>
                                                </button>
                                                {user.email !== MASTER_EMAIL && (
                                                    <button onClick={() => handleDeleteUser(user.uid)} className="w-8 h-8 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all">
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    // USER FORM
                    <form onSubmit={handleSaveUser} className="max-w-3xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
                        <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="font-bold text-xl text-slate-800">
                                    {editingUser?.uid && allUsers.some(u => u.uid === editingUser.uid) ? 'Editar Usuário' : 'Novo Usuário'}
                                </h3>
                                <p className="text-slate-500 text-sm">Preencha os dados de acesso e perfil.</p>
                            </div>
                            <button type="button" onClick={() => setIsUserFormOpen(false)} className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-all">
                                <i className="fas fa-times text-lg"></i>
                            </button>
                        </div>

                        {userFormError && (
                            <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 text-sm flex items-center gap-3 border border-red-100">
                                <i className="fas fa-exclamation-circle text-lg"></i>
                                {userFormError}
                            </div>
                        )}

                        <div className="space-y-6">
                             <div className="flex justify-center mb-8">
                                <div className="relative group w-28 h-28">
                                    <img 
                                        src={editingUser?.photoUrl || "https://ui-avatars.com/api/?background=random"} 
                                        className="w-full h-full rounded-full object-cover border-4 border-white shadow-md" 
                                        alt=""
                                    />
                                    <label className="absolute bottom-1 right-1 bg-emerald-600 text-white w-9 h-9 rounded-full flex items-center justify-center cursor-pointer hover:bg-emerald-700 shadow-lg hover:scale-110 transition-all">
                                        <i className="fas fa-camera text-sm"></i>
                                        <input type="file" onChange={handleUserPhotoUpload} className="hidden" accept="image/*" />
                                    </label>
                                </div>
                             </div>

                             <div className="grid grid-cols-2 gap-6">
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Nome Completo</label>
                                     <input 
                                        required
                                        value={editingUser?.displayName || ''} 
                                        onChange={e => setEditingUser(prev => ({...prev, displayName: e.target.value}))}
                                        className="w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-slate-700 bg-white"
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Email</label>
                                     <input 
                                        type="email"
                                        required
                                        disabled={editingUser?.email === MASTER_EMAIL}
                                        value={editingUser?.email || ''} 
                                        onChange={e => setEditingUser(prev => ({...prev, email: e.target.value}))}
                                        className="w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-slate-700 disabled:bg-slate-100 disabled:text-slate-500 bg-white"
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Cargo</label>
                                     <input 
                                        value={editingUser?.role || ''} 
                                        onChange={e => setEditingUser(prev => ({...prev, role: e.target.value}))}
                                        className="w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-slate-700 bg-white"
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Departamento</label>
                                     <div className="relative">
                                         <select 
                                            value={editingUser?.department || ''} 
                                            onChange={e => setEditingUser(prev => ({...prev, department: e.target.value}))}
                                            className="w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-slate-700 appearance-none bg-white"
                                         >
                                             <option value="">Selecione...</option>
                                             {settings.departments.map(d => <option key={d} value={d}>{d}</option>)}
                                         </select>
                                         <i className="fas fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                     </div>
                                 </div>
                                 <div className="col-span-2">
                                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Nível de Acesso</label>
                                     <div className="relative">
                                         <select 
                                            value={editingUser?.accessLevel || AccessLevel.SELLER} 
                                            disabled={editingUser?.email === MASTER_EMAIL}
                                            onChange={e => setEditingUser(prev => ({...prev, accessLevel: e.target.value as AccessLevel}))}
                                            className="w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium text-slate-700 appearance-none bg-white disabled:bg-slate-100"
                                         >
                                             {Object.values(AccessLevel).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                                         </select>
                                         <i className="fas fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                                     </div>
                                 </div>
                             </div>

                             {/* MANAGER SPECIFIC LOGIC */}
                             {editingUser?.accessLevel === AccessLevel.MANAGER && (
                                 <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mt-6">
                                     <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                                         <i className="fas fa-sitemap"></i> Definir Equipe (Vendedores)
                                     </h4>
                                     <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                         {sellers.map(seller => (
                                             <label key={seller.uid} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100 cursor-pointer hover:border-blue-300 transition-colors">
                                                 <input 
                                                    type="checkbox" 
                                                    checked={editingUser.subordinates?.includes(seller.uid) || false}
                                                    onChange={() => toggleSubordinate(seller.uid)}
                                                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                                 />
                                                 <div className="flex-1">
                                                     <p className="text-sm font-bold text-slate-700">{seller.displayName}</p>
                                                     <p className="text-xs text-slate-500">{seller.email}</p>
                                                 </div>
                                             </label>
                                         ))}
                                         {sellers.length === 0 && <p className="text-sm text-slate-500 italic">Nenhum vendedor cadastrado no sistema.</p>}
                                     </div>
                                 </div>
                             )}
                        </div>

                        <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-100">
                            <button type="button" onClick={() => setIsUserFormOpen(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors">Cancelar</button>
                            <button type="submit" className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-200 hover:shadow-xl transition-all transform hover:-translate-y-0.5">
                                {uploading ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
