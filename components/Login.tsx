import React, { useState } from 'react';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Loader2, Package, Sparkles, ArrowRight, BarChart3, Wand2, Box } from 'lucide-react';

export const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      if (token) {
        localStorage.setItem('google_access_token', token);
      }
    } catch (error: any) {
      console.error("Erreur de connexion:", error);
      setError(error.message || "Une erreur est survenue lors de la connexion.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Left side - Branding & Features (Hidden on small mobile, visible on larger screens) */}
      <div className="hidden md:flex md:w-5/12 lg:w-1/2 bg-blue-600 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2000&auto=format&fit=crop')] opacity-10 mix-blend-overlay bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-indigo-900/90" />
        
        <div className="relative z-10 animate-in fade-in slide-in-from-left-8 duration-1000">
          <div className="flex items-center gap-3 text-white mb-16">
            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md border border-white/10 shadow-xl">
              <Package size={28} />
            </div>
            <span className="text-2xl font-bold tracking-tight">Vinted Manager</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
            Gérez votre activité Vinted comme un pro.
          </h1>
          <p className="text-blue-100 text-lg max-w-md leading-relaxed">
            L'outil tout-en-un pour suivre votre stock, générer des annonces avec l'IA et analyser vos ventes.
          </p>
        </div>

        <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
          <div className="flex items-center gap-4 text-white/90 group">
            <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-sm border border-white/5 group-hover:bg-white/20 transition-colors">
              <Box size={22} className="text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Gestion d'inventaire</h3>
              <p className="text-sm text-blue-200">Suivez vos articles et vos coûts</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-white/90 group">
            <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-sm border border-white/5 group-hover:bg-white/20 transition-colors">
              <Wand2 size={22} className="text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Annonces par IA</h3>
              <p className="text-sm text-blue-200">Générez descriptions et titres en 1 clic</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-white/90 group">
            <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-sm border border-white/5 group-hover:bg-white/20 transition-colors">
              <BarChart3 size={22} className="text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Suivi des bénéfices</h3>
              <p className="text-sm text-blue-200">Analysez vos marges et vos ventes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-24 relative bg-gray-50 md:bg-white">
        {/* Mobile Header (Only visible on mobile) */}
        <div className="md:hidden flex flex-col items-center mb-12 animate-in fade-in slide-in-from-top-8 duration-700">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full" />
            <div className="bg-blue-600 p-4 rounded-3xl text-white relative shadow-xl shadow-blue-600/20">
              <Package size={36} strokeWidth={1.5} />
              <Sparkles size={16} className="text-blue-300 absolute top-2 right-2 animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Vinted Manager</h1>
          <p className="text-gray-500 mt-2 text-center font-medium">Votre assistant de revente intelligent</p>
        </div>

        <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
          <div className="mb-10 text-center md:text-left bg-white md:bg-transparent p-8 md:p-0 rounded-3xl shadow-sm md:shadow-none border border-gray-100 md:border-none">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 hidden md:block">Bon retour !</h2>
            <p className="text-gray-500 hidden md:block mb-8">Connectez-vous pour accéder à votre espace vendeur.</p>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2 md:hidden">Connexion</h2>
            <p className="text-gray-500 md:hidden mb-8 text-sm">Accédez à votre inventaire et gérez vos ventes.</p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium animate-in fade-in slide-in-from-top-2 text-left">
                {error.includes('auth/unauthorized-domain') ? (
                  <>
                    <span className="font-bold block mb-1">Domaine non autorisé</span>
                    Veuillez ajouter ce domaine dans votre console Firebase :
                    <code className="block mt-2 p-2 bg-white border border-red-100 rounded-lg break-all font-mono text-xs text-red-800">
                      {window.location.hostname}
                    </code>
                  </>
                ) : error}
              </div>
            )}

            <button 
              onClick={handleLogin}
              disabled={isLoading}
              className="group w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 px-6 py-4 rounded-2xl font-bold hover:bg-gray-50 hover:border-gray-300 focus:ring-4 focus:ring-gray-100 transition-all active:scale-[0.98] shadow-sm relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-100/0 via-gray-100/50 to-gray-100/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin text-gray-400" size={24} />
                  <span className="text-lg">Connexion en cours...</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-lg">Continuer avec Google</span>
                  <ArrowRight size={18} className="text-gray-400 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 absolute right-6" />
                </>
              )}
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400 font-medium max-w-xs mx-auto">
              En vous connectant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
