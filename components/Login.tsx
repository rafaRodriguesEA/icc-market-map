import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { AppSettings, UserProfile } from '../types';
import { subscribeToUsers } from '../services/firebaseService';

interface LoginProps {
  settings: AppSettings;
}

const Login: React.FC<LoginProps> = ({ settings }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State for avatar rotation
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<UserProfile[]>([]);

  // Fetch real users
  useEffect(() => {
    const unsub = subscribeToUsers((users) => {
        // Keep all users to calculate correct count
        setAllUsers(users);
    });
    return () => unsub();
  }, []);

  // Rotate users every 4 seconds
  useEffect(() => {
    if (allUsers.length === 0) return;

    const rotateUsers = () => {
        // Create a copy and shuffle
        const shuffled = [...allUsers].sort(() => 0.5 - Math.random());
        // Pick first 5
        setDisplayedUsers(shuffled.slice(0, 5));
    };

    rotateUsers(); // Initial set
    const interval = setInterval(rotateUsers, 4000); // Change every 4s

    return () => clearInterval(interval);
  }, [allUsers]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      setError('Credenciais inválidas. Verifique seu email e senha.');
    } finally {
      setLoading(false);
    }
  };

  const bgImage = settings.coverImageUrl 
    ? `url(${settings.coverImageUrl})`
    : 'url(https://images.unsplash.com/photo-1605000797499-95a51c5269ae?q=80&w=2071&auto=format&fit=crop)';

  // Calculate the "extra" count based on total users
  const totalCount = allUsers.length;
  const extraCount = Math.max(0, totalCount - 5);

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">
      
      {/* LEFT SIDE - BRANDING & VISUALS */}
      <div className="hidden lg:flex lg:w-3/5 relative bg-slate-900 flex-col p-12 overflow-hidden">
        {/* Background & Overlay */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[20s] ease-in-out hover:scale-110"
          style={{ backgroundImage: bgImage }}
        ></div>
        {/* Dark overlay for contrast */}
        <div className="absolute inset-0 z-0 bg-slate-900/80 mix-blend-multiply"></div>
        <div className="absolute inset-0 z-0 bg-gradient-to-tr from-slate-900 via-transparent to-emerald-900/20"></div>

        {/* Center Content: Logo, Title & Slogan */}
        <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center animate-fade-in px-8">
            
            {/* Logo - Static, No Glow */}
            <div className="mb-8">
               {settings.logoUrl ? (
                  <img 
                    src={settings.logoUrl} 
                    alt="Logo" 
                    className="h-24 w-auto object-contain brightness-0 invert" 
                  />
               ) : (
                  <i className="fas fa-leaf text-white text-6xl"></i>
               )}
            </div>

            {/* Title */}
            <h1 className="text-6xl font-extrabold text-white tracking-tight leading-none mb-6 drop-shadow-md">
                Market Map
            </h1>

            {/* Divider */}
            <div className="w-24 h-1 bg-emerald-500 mb-8"></div>

            {/* Slogan */}
            <h2 className="text-3xl font-light text-slate-100 leading-tight max-w-2xl animate-slide-up">
              Transformando dados em <span className="font-bold text-emerald-400">resultados reais</span>.
            </h2>
        </div>

        {/* Bottom: Collaborators Bubbles */}
        <div className="relative z-10 animate-slide-up mt-auto" style={{ animationDelay: '0.2s' }}>
            <p className="text-slate-300 text-sm font-semibold tracking-wide mb-4">Time ICC Conectado</p>
            <div className="flex items-center gap-4">
                <div className="flex -space-x-4">
                    {displayedUsers.map((user, idx) => (
                        <div 
                            key={user.uid || idx} 
                            className="w-12 h-12 rounded-full border-2 border-slate-900 overflow-hidden relative transition-transform duration-500 hover:-translate-y-1 hover:z-20 cursor-pointer bg-slate-800"
                            title={user.displayName}
                        >
                            <img 
                                src={user.photoUrl || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`} 
                                className="w-full h-full object-cover animate-fade-in" 
                                alt={user.displayName} 
                            />
                        </div>
                    ))}
                    
                    {/* Fallback placeholders if no users found yet */}
                    {allUsers.length === 0 && (
                        <div className="w-12 h-12 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center">
                            <i className="fas fa-users text-slate-500"></i>
                        </div>
                    )}

                    {extraCount > 0 && (
                        <div className="w-12 h-12 rounded-full border-2 border-slate-900 bg-emerald-600 flex items-center justify-center text-white text-xs font-bold relative z-10 shadow-lg">
                            +{extraCount}
                        </div>
                    )}
                </div>
                
                <div className="text-white text-sm ml-2">
                    <p className="font-medium opacity-90">Junte-se a nós,</p>
                    <p className="text-emerald-400 font-bold">solicite seu acesso.</p>
                </div>
            </div>
        </div>
      </div>

      {/* RIGHT SIDE - LOGIN FORM */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-8 lg:p-16 relative bg-white">
          <div className="w-full max-w-md animate-slide-right">
              
              {/* Mobile Logo (Visible only on small screens) */}
              <div className="lg:hidden text-center mb-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 mb-4 shadow-lg shadow-emerald-200">
                    {settings.logoUrl ? (
                        <img src={settings.logoUrl} alt="Logo" className="w-10 h-10 object-contain brightness-0 invert" />
                    ) : (
                        <i className="fas fa-leaf text-white text-2xl"></i>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Market Map</h2>
              </div>

              <div className="mb-10">
                  <h3 className="text-3xl font-bold text-slate-900 mb-2">Bem-vindo de volta</h3>
                  <p className="text-slate-500">Insira suas credenciais para acessar o painel.</p>
              </div>

              {error && (
                  <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg text-sm flex items-start gap-3">
                      <i className="fas fa-exclamation-circle mt-0.5"></i>
                      <span>{error}</span>
                  </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Email</label>
                      <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <i className="fas fa-envelope text-slate-400 group-focus-within:text-emerald-600 transition-colors"></i>
                          </div>
                          <input 
                              type="email" 
                              required 
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-800 font-medium placeholder-slate-400"
                              placeholder="seu.email@iccbrazil.com.br"
                          />
                      </div>
                  </div>
                  
                  <div>
                      <div className="flex justify-between items-center mb-2 ml-1">
                          <label className="block text-sm font-bold text-slate-700">Senha</label>
                          <a href="#" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">Esqueceu a senha?</a>
                      </div>
                      <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <i className="fas fa-lock text-slate-400 group-focus-within:text-emerald-600 transition-colors"></i>
                          </div>
                          <input 
                              type="password" 
                              required 
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-800 font-medium placeholder-slate-400"
                              placeholder="••••••••"
                          />
                      </div>
                  </div>

                  <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-orange-200 hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
                  >
                      {loading ? (
                          <>
                              <i className="fas fa-circle-notch fa-spin"></i> Processando...
                          </>
                      ) : (
                          <>
                              Acessar Sistema <i className="fas fa-arrow-right"></i>
                          </>
                      )}
                  </button>
              </form>

              <div className="mt-10 text-center space-y-2">
                  <p className="text-slate-400 text-xs font-medium">
                      © ICC Animal Nutrition - Todos os direitos reservados.
                  </p>
                  <p className="text-slate-300 text-[10px]">
                      Desenvolvido por Giovane Jesus
                  </p>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Login;