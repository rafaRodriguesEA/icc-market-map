
import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { subscribeToClients, addClient, updateClient, deleteClient, subscribeToUsers, subscribeToSettings, saveUser, subscribeToProducts, subscribeToMarketPrices } from './services/firebaseService';
import { generateCommercialStrategy } from './services/geminiService';
import { Client, ClientStatus, AIAnalysis, UserProfile, AccessLevel, AppSettings, Product, MarketEntry } from './types';
import { STATUS_COLORS, SEGMENT_ICONS, DEFAULT_AVATAR } from './constants';
import StatsCard from './components/StatsCard';
import ClientForm from './components/ClientForm';
import ClientProfile from './components/ClientProfile';
import AnalysisModal from './components/AnalysisModal';
import AdminPanel from './components/AdminPanel';
import ProductCatalog from './components/ProductCatalog';
import MarketIntelligence from './components/MarketIntelligence';
import Login from './components/Login';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

enum View {
  DASHBOARD = 'dashboard',
  CLIENTS = 'clients',
  MARKET = 'market',
  PRODUCTS = 'products',
  SETTINGS = 'settings',
  ADMIN = 'admin'
}

const MASTER_EMAIL = 'giovane.santos@iccbrazil.com.br';

const App: React.FC = () => {
  // Auth State
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // App Data
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [marketEntries, setMarketEntries] = useState<MarketEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ departments: [], packagings: [], incoterms: [], clientSegments: [] });
  
  // UI State
  const [viewingClient, setViewingClient] = useState<Client | null>(null); // Read-only Profile View
  const [editingClient, setEditingClient] = useState<Client | null>(null); // Edit Form View
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  // 1. Initialize Auth and Fetch Settings (Public Data)
  useEffect(() => {
    // Settings are public (logo, background), so we fetch immediately
    const unsubSettings = subscribeToSettings((data) => setSettings(data));
    
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (!user) {
        // Clear data on logout
        setUserProfile(null);
        setClients([]);
        setProducts([]);
        setMarketEntries([]);
      }
      setLoadingAuth(false);
    });

    return () => {
      unsubSettings();
      unsubAuth();
    };
  }, []);

  // 2. Fetch User Profile and Private Data (Products, Market) ONLY when Auth is ready
  useEffect(() => {
    if (!authUser) return;

    // A. Subscribe to Products
    const unsubProducts = subscribeToProducts((data) => setProducts(data));
    
    // B. Subscribe to Market Intelligence
    const unsubMarket = subscribeToMarketPrices((data) => setMarketEntries(data));

    // C. Subscribe to Users & Handle Profile
    const unsubUsers = subscribeToUsers((allUsers) => {
        setUsers(allUsers);
        
        let profile = allUsers.find(u => u.uid === authUser.uid);
        
        // Handle Master Admin hardcode / First login
        if (!profile && authUser.email === MASTER_EMAIL) {
            profile = {
                uid: authUser.uid,
                email: authUser.email!,
                displayName: authUser.displayName || 'Master Admin',
                role: 'Diretor Comercial',
                department: 'Diretoria',
                accessLevel: AccessLevel.SUPERADMIN,
                photoUrl: authUser.photoURL || ""
            };
            saveUser(profile); // Auto-create master
        } else if (!profile) {
            // New regular user (login via Google but not in DB yet)
            profile = {
                uid: authUser.uid,
                email: authUser.email!,
                displayName: authUser.displayName || 'Novo Usuário',
                role: 'N/A',
                department: 'N/A',
                accessLevel: AccessLevel.OTHER, // Restricted by default
                photoUrl: authUser.photoURL || ""
            };
            saveUser(profile);
        }

        setUserProfile(profile || null);
    });

    return () => {
        unsubProducts();
        unsubMarket();
        unsubUsers();
    };
  }, [authUser]);

  // 3. Fetch Clients based on RLS (User Profile)
  useEffect(() => {
    if (userProfile) {
        const unsubClients = subscribeToClients(userProfile, (data) => {
            setClients(data);
        });
        return () => unsubClients();
    } else {
        setClients([]);
    }
  }, [userProfile]);


  // Handlers
  const handleSaveClient = async (data: Omit<Client, 'id'>) => {
    if (!userProfile) return;
    
    // Inject Owner ID
    const clientData = {
        ...data,
        ownerId: editingClient ? editingClient.ownerId : userProfile.uid
    };

    if (editingClient && editingClient.id) {
      await updateClient(editingClient.id, clientData);
    } else {
      await addClient(clientData);
    }
    setIsFormOpen(false);
    setEditingClient(null);
  };

  const handleDeleteClient = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      await deleteClient(id);
      if (viewingClient?.id === id) setViewingClient(null);
    }
  };

  const handleAiAnalysis = async (client: Client) => {
    setAiAnalysis(null);
    setAiLoading(true);
    setShowAiModal(true);
    try {
      const result = await generateCommercialStrategy(client);
      setAiAnalysis(result);
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar análise AI.");
      setShowAiModal(false);
    } finally {
      setAiLoading(false);
    }
  };

  const handleLogout = () => {
    auth.signOut();
  };

  if (loadingAuth) {
      return (
          <div className="h-screen flex items-center justify-center bg-slate-900">
             <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-emerald-500 font-medium animate-pulse">Carregando Market Map...</p>
             </div>
          </div>
      );
  }

  if (!authUser || !userProfile) {
      return <Login settings={settings} />;
  }

  // Access Checks
  const isSuperAdmin = userProfile.accessLevel === AccessLevel.SUPERADMIN || userProfile.email === MASTER_EMAIL;

  // Metrics
  const totalPotential = clients.reduce((acc, c) => acc + (c.potentialValue || 0), 0);
  const activeClients = clients.filter(c => c.status === ClientStatus.ACTIVE).length;
  const prospectClients = clients.filter(c => c.status === ClientStatus.PROSPECT).length;

  const chartData = Object.values(ClientStatus).map(status => ({
    name: status,
    value: clients.filter(c => c.status === status).length
  }));
  
  const chartColors = ['#94a3b8', '#3b82f6', '#eab308', '#10b981', '#ef4444'];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col shadow-2xl z-20 relative">
        <div className="h-44 relative flex items-center justify-center overflow-hidden border-b border-white/10">
            {settings.coverImageUrl && (
                <div className="absolute inset-0 opacity-30 bg-cover bg-center" style={{backgroundImage: `url(${settings.coverImageUrl})`}}></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900"></div>
            
            <div className="relative z-10 text-center p-6 animate-fade-in">
               {settings.logoUrl ? (
                   <img src={settings.logoUrl} className="h-14 object-contain mx-auto mb-3 drop-shadow-lg" alt="ICC" />
               ) : (
                   <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-900/40">
                      <i className="fas fa-leaf text-white text-lg"></i>
                   </div>
               )}
               <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-md">Market Map</h1>
               <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-1">Intelligence CRM</p>
            </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-2">Menu Principal</p>
          
          <button 
            onClick={() => setCurrentView(View.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${currentView === View.DASHBOARD ? 'bg-emerald-600/20 text-emerald-400 border-l-4 border-emerald-500 shadow-inner' : 'text-slate-400 hover:bg-white/5 hover:text-white border-l-4 border-transparent'}`}
          >
            <i className={`fas fa-chart-pie w-6 text-center transition-transform group-hover:scale-110 ${currentView === View.DASHBOARD ? 'text-emerald-400' : ''}`}></i>
            <span className="font-medium">Dashboard</span>
          </button>
          
          <button 
            onClick={() => setCurrentView(View.CLIENTS)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${currentView === View.CLIENTS ? 'bg-emerald-600/20 text-emerald-400 border-l-4 border-emerald-500 shadow-inner' : 'text-slate-400 hover:bg-white/5 hover:text-white border-l-4 border-transparent'}`}
          >
            <i className={`fas fa-users w-6 text-center transition-transform group-hover:scale-110 ${currentView === View.CLIENTS ? 'text-emerald-400' : ''}`}></i>
            <span className="font-medium">Carteira</span>
          </button>

          {/* New Market Intelligence Menu Item */}
          <button 
            onClick={() => setCurrentView(View.MARKET)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${currentView === View.MARKET ? 'bg-emerald-600/20 text-emerald-400 border-l-4 border-emerald-500 shadow-inner' : 'text-slate-400 hover:bg-white/5 hover:text-white border-l-4 border-transparent'}`}
          >
            <i className={`fas fa-search-dollar w-6 text-center transition-transform group-hover:scale-110 ${currentView === View.MARKET ? 'text-emerald-400' : ''}`}></i>
            <span className="font-medium">Inteligência</span>
          </button>

          <button 
            onClick={() => setCurrentView(View.PRODUCTS)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${currentView === View.PRODUCTS ? 'bg-emerald-600/20 text-emerald-400 border-l-4 border-emerald-500 shadow-inner' : 'text-slate-400 hover:bg-white/5 hover:text-white border-l-4 border-transparent'}`}
          >
            <i className={`fas fa-box-open w-6 text-center transition-transform group-hover:scale-110 ${currentView === View.PRODUCTS ? 'text-emerald-400' : ''}`}></i>
            <span className="font-medium">Catálogo</span>
          </button>

          {isSuperAdmin && (
             <>
             <div className="my-4 border-t border-white/10"></div>
             <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gestão</p>
             <button 
                onClick={() => setCurrentView(View.ADMIN)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${currentView === View.ADMIN ? 'bg-emerald-600/20 text-emerald-400 border-l-4 border-emerald-500 shadow-inner' : 'text-slate-400 hover:bg-white/5 hover:text-white border-l-4 border-transparent'}`}
             >
                <i className={`fas fa-cogs w-6 text-center transition-transform group-hover:scale-110 ${currentView === View.ADMIN ? 'text-emerald-400' : ''}`}></i>
                <span className="font-medium">Admin</span>
             </button>
             </>
          )}
        </nav>

        <div className="p-4 m-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
           <div className="flex items-center gap-3 mb-4">
             <div className="relative">
                <img src={userProfile.photoUrl || "https://ui-avatars.com/api/?background=random"} alt="User" className="w-10 h-10 rounded-full border-2 border-slate-600 object-cover" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-800"></div>
             </div>
             <div className="overflow-hidden">
               <p className="text-sm font-bold text-white truncate">{userProfile.displayName}</p>
               <p className="text-xs text-slate-400 truncate">{userProfile.role}</p>
             </div>
           </div>
           <button onClick={handleLogout} className="w-full py-2.5 text-xs font-bold text-slate-300 hover:text-white border border-white/10 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
             <i className="fas fa-sign-out-alt"></i> Encerrar Sessão
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-slate-50 scroll-smooth">
        {/* Decorative background blur */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-emerald-50 to-slate-50 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto p-8 relative z-10">
          
          {/* Dashboard View */}
          {currentView === View.DASHBOARD && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex justify-between items-end border-b border-slate-200 pb-6">
                <div>
                   <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Visão Geral</h2>
                   <p className="text-slate-500 mt-1 font-medium">Bem-vindo de volta, <span className="text-emerald-600">{userProfile.displayName.split(' ')[0]}</span>.</p>
                </div>
                <button onClick={() => { setIsFormOpen(true); setEditingClient(null); setCurrentView(View.CLIENTS); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-200 transform hover:-translate-y-0.5 flex items-center gap-2 font-bold">
                  <i className="fas fa-plus"></i> Novo Cliente
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard title="Meus Clientes" value={clients.length} icon="fa-users" color="bg-gradient-to-br from-blue-400 to-blue-600" />
                <StatsCard title="Pipeline (Potencial)" value={`$${totalPotential.toLocaleString()}`} icon="fa-chart-line" color="bg-gradient-to-br from-emerald-400 to-emerald-600" trend="+12% vs mês anterior" />
                <StatsCard title="Ativos" value={activeClients} icon="fa-handshake" color="bg-gradient-to-br from-purple-400 to-purple-600" />
                <StatsCard title="Prospects" value={prospectClients} icon="fa-bullseye" color="bg-gradient-to-br from-orange-400 to-orange-600" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-6">
                     <h3 className="text-lg font-bold text-slate-800">Funil de Vendas</h3>
                     <button className="text-sm text-emerald-600 font-semibold hover:underline">Ver Detalhes</button>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} dy={10} />
                        <YAxis hide />
                        <Tooltip 
                            cursor={{fill: '#f8fafc'}} 
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}} 
                            itemStyle={{color: '#334155', fontWeight: 600}}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50} animationDuration={1500}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Recent Activity / Simple List */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Oportunidades Quentes</h3>
                  <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {clients.filter(c => c.status === ClientStatus.NEGOTIATION).slice(0, 5).map(client => (
                      <div key={client.id} className="group flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100 cursor-pointer" onClick={() => setViewingClient(client)}>
                        <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 p-1 flex-shrink-0 shadow-sm group-hover:shadow transition-shadow">
                           <img src={client.logoUrl || DEFAULT_AVATAR} alt={client.companyName} className="w-full h-full object-contain rounded-lg" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">{client.companyName}</p>
                          <p className="text-xs text-slate-500 truncate font-medium flex items-center gap-1">
                              <i className="fas fa-dollar-sign text-emerald-500 text-[10px]"></i>
                              {client.potentialValue.toLocaleString()}
                          </p>
                        </div>
                        <button className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-600 hover:text-white hover:scale-110">
                            <i className="fas fa-eye text-xs"></i>
                        </button>
                      </div>
                    ))}
                    {clients.filter(c => c.status === ClientStatus.NEGOTIATION).length === 0 && (
                      <div className="flex flex-col items-center justify-center h-40 text-center">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                             <i className="fas fa-check text-slate-400"></i>
                          </div>
                          <p className="text-sm text-slate-500">Tudo tranquilo por aqui.</p>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setCurrentView(View.CLIENTS)} className="w-full mt-4 py-2 text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors border-t border-slate-100">
                      Ver todas as oportunidades
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Clients View */}
          {currentView === View.CLIENTS && (
            <div className="space-y-8 animate-slide-up">
               <div className="flex justify-between items-end border-b border-slate-200 pb-6">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Gestão de Carteira</h2>
                    <p className="text-slate-500 mt-1 font-medium">Gerencie seus relacionamentos e oportunidades.</p>
                </div>
                <button onClick={() => { setIsFormOpen(true); setEditingClient(null); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-200 transform hover:-translate-y-0.5 flex items-center gap-2 font-bold">
                  <i className="fas fa-plus"></i> Adicionar Cliente
                </button>
              </div>

              {isFormOpen ? (
                 <ClientForm 
                   initialData={editingClient || undefined} 
                   onSubmit={handleSaveClient} 
                   onCancel={() => setIsFormOpen(false)}
                   users={users}
                   products={products}
                   settings={settings}
                 />
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-left">
                          <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa</th>
                          <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Contato</th>
                          <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Segmento</th>
                          <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Potencial</th>
                          <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {clients.map(client => (
                          <tr 
                            key={client.id} 
                            onClick={() => setViewingClient(client)}
                            className="hover:bg-slate-50 transition-colors group cursor-pointer"
                          >
                            <td className="p-5">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 shadow-sm">
                                  <img src={client.logoUrl || DEFAULT_AVATAR} className="w-full h-full object-contain rounded-lg" alt="Logo" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 text-sm">{client.companyName}</p>
                                  <p className="text-xs text-slate-500">{client.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-5">
                                <div className="text-sm font-medium text-slate-700">{client.contactName || (client.contacts?.[0]?.name) || '-'}</div>
                                <div className="text-xs text-slate-400">{client.phone || (client.contacts?.[0]?.phone) || '-'}</div>
                            </td>
                            <td className="p-5">
                              <span className="inline-flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                <i className={`fas ${SEGMENT_ICONS[client.segment as any] || 'fa-tag'} text-slate-500`}></i>
                                {client.segment}
                              </span>
                            </td>
                            <td className="p-5">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${STATUS_COLORS[client.status]}`}>
                                {client.status}
                              </span>
                            </td>
                            <td className="p-5 text-sm font-bold text-slate-700">${client.potentialValue?.toLocaleString()}</td>
                            <td className="p-5 text-right">
                               <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleAiAnalysis(client); }}
                                    className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                    title="Análise AI"
                                  >
                                    <i className="fas fa-magic text-xs"></i>
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingClient(client); setIsFormOpen(true); }}
                                    className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                  >
                                    <i className="fas fa-pencil-alt text-xs"></i>
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); client.id && handleDeleteClient(client.id); }}
                                    className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                  >
                                    <i className="fas fa-trash text-xs"></i>
                                  </button>
                               </div>
                            </td>
                          </tr>
                        ))}
                        {clients.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-12 text-center">
                              <div className="flex flex-col items-center">
                                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                      <i className="fas fa-folder-open text-slate-300 text-2xl"></i>
                                  </div>
                                  <p className="text-slate-500 font-medium">Sua carteira está vazia.</p>
                                  <button onClick={() => { setIsFormOpen(true); setEditingClient(null); }} className="mt-4 text-emerald-600 font-bold hover:underline">Adicionar primeiro cliente</button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 font-medium">
                      <span>Mostrando {clients.length} registros</span>
                      <div className="flex gap-2">
                          <button className="px-3 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-50" disabled>Anterior</button>
                          <button className="px-3 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-50" disabled>Próxima</button>
                      </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* New Market Intelligence View - Passed 'users' prop */}
          {currentView === View.MARKET && (
             <MarketIntelligence entries={marketEntries} settings={settings} userProfile={userProfile} users={users} />
          )}

          {/* Product Catalog View */}
          {currentView === View.PRODUCTS && (
            <ProductCatalog products={products} settings={settings} userProfile={userProfile} />
          )}

          {/* Admin View */}
          {currentView === View.ADMIN && isSuperAdmin && (
             <AdminPanel currentUser={userProfile} allUsers={users} settings={settings} products={products} />
          )}

        </div>
      </main>

      {/* Viewing Client Profile (Modal) */}
      {viewingClient && (
         <ClientProfile 
            client={viewingClient}
            onClose={() => setViewingClient(null)}
            onEdit={() => { setViewingClient(null); setEditingClient(viewingClient); setIsFormOpen(true); }}
            onDelete={() => viewingClient.id && handleDeleteClient(viewingClient.id)}
            onAiAnalysis={() => handleAiAnalysis(viewingClient)}
            users={users}
            products={products}
         />
      )}

      {/* AI Analysis Modal */}
      {showAiModal && (
        <AnalysisModal 
          analysis={aiAnalysis} 
          loading={aiLoading} 
          onClose={() => setShowAiModal(false)} 
        />
      )}
    </div>
  );
};

export default App;
