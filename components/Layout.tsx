import React, { useState } from 'react';
import { motion } from "motion/react";
import { View, InventoryItem } from '../types';
import { Package, Banknote, RefreshCw, ShoppingCart, AlertCircle, User, LogOut, Key, Loader2 } from 'lucide-react';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { ApiKeySettings } from './ApiKeySettings';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  setView: (view: View) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isAuthLoading?: boolean;
  error?: string | null;
  selectedItem?: InventoryItem | null;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentView, 
  setView, 
  onRefresh, 
  isRefreshing, 
  isAuthLoading,
  error,
  selectedItem
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const user = auth.currentUser;

  const navItems = [
    { id: View.STOCK_VIEW, label: 'Stock', icon: <Package size={24} /> },
    { id: View.COMMAND_VIEW, label: 'Commandes', icon: <ShoppingCart size={24} /> },
    { id: View.SOLD_VIEW, label: 'Ventes', icon: <Banknote size={24} /> },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem('google_access_token');
  };

  const getIsActive = (itemId: View) => {
    if (currentView === itemId) return true;
    
    const commandStatuses = ['À traiter', 'À envoyer', 'Expédié'];

    if (itemId === View.STOCK_VIEW) {
      if (currentView === View.ADD_ITEM) return true;
      if ((currentView === View.ITEM_DETAILS || currentView === View.EDIT_ITEM) && selectedItem?.articleStatus === 'En stock') return true;
    }

    if (itemId === View.COMMAND_VIEW) {
      if ((currentView === View.ITEM_DETAILS || currentView === View.EDIT_ITEM) && commandStatuses.includes(selectedItem?.articleStatus || '')) return true;
    }
    
    if (itemId === View.SOLD_VIEW) {
      if ((currentView === View.ITEM_DETAILS || currentView === View.EDIT_ITEM) && selectedItem?.articleStatus === 'Vendu') return true;
    }
    
    return false;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="fixed top-0 left-0 right-0 h-20 bg-white shadow-sm flex items-center justify-between px-4 z-50">
        <div 
          className="flex items-center gap-3.5 cursor-pointer"
          onClick={() => setView(View.DASHBOARD)}
        >
          <div className="bg-blue-600 p-2 rounded-xl text-white transition-transform active:scale-95">
            <Package size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Vinted Manager</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {onRefresh && (
            <button 
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`p-2.5 rounded-xl transition-all ${isRefreshing ? 'text-zinc-300' : 'hover:bg-zinc-100 text-zinc-600 active:scale-95'}`}
              title="Recharger et synchroniser les emails"
            >
              <RefreshCw size={24} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          )}
          
          <div className="relative">
            <button 
              onClick={() => !isAuthLoading && setShowProfileMenu(!showProfileMenu)}
              className={`p-2 rounded-full hover:bg-zinc-100 text-zinc-600 ${isAuthLoading ? 'opacity-50 cursor-wait' : ''}`}
            >
              {isAuthLoading ? (
                <Loader2 size={28} className="animate-spin text-zinc-400" />
              ) : user?.photoURL ? (
                <img src={user.photoURL} alt="Profil" className="w-10 h-10 rounded-full" />
              ) : (
                <User size={28} />
              )}
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-zinc-100 p-2 z-50">
                <div className="px-3 py-2 text-xs font-bold text-zinc-500 truncate border-b border-zinc-100 mb-1">
                  {user?.email}
                </div>
                
                <button 
                  onClick={() => { setShowApiKeyModal(true); setShowProfileMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-zinc-600 hover:bg-zinc-50 rounded-xl text-xs font-bold transition-colors"
                >
                  <Key size={16} />
                  Clé API Gemini
                </button>

                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors"
                >
                  <LogOut size={16} />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <ApiKeySettings onClose={() => setShowApiKeyModal(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-24 pb-24 flex flex-col min-h-screen">
        {error && (
          <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
            <div className="bg-zinc-50 border border-zinc-100 p-5 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-zinc-600">
                <div className="bg-zinc-100 p-2.5 rounded-xl">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold opacity-70 mb-0.5">Erreur de synchronisation</p>
                  <p className="text-sm font-bold">{error}</p>
                </div>
              </div>
              <button 
                onClick={onRefresh}
                disabled={isRefreshing}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-bold active:scale-95 transition-all"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="h-full flex flex-col"
        >
          {children}
        </motion.div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-[72px] bg-white border-t border-zinc-100 px-2 flex justify-around items-center z-[60]">
        {navItems.map((item) => {
          const isActive = getIsActive(item.id);
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 ${
                isActive ? 'text-blue-600' : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              {React.cloneElement(item.icon as React.ReactElement, { size: 28 })}
              <span className="text-[13px] font-bold">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
};