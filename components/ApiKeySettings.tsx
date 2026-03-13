import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { getUserSettings, saveUserSettings } from '../services/userService';
import { Key, Eye, EyeOff, Check, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';

interface ApiKeySettingsProps {
  onClose?: () => void;
}

export const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const loadKey = async () => {
      const user = auth.currentUser;
      if (user) {
        const settings = await getUserSettings(user.uid);
        if (settings?.geminiApiKey) {
          setApiKey(settings.geminiApiKey);
        } else {
          // Fallback to local storage
          const savedKey = localStorage.getItem('VINTED_EXPERT_API_KEY');
          if (savedKey) {
            setApiKey(savedKey);
          }
        }
      }
      setIsLoading(false);
    };
    loadKey();
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setIsSaving(true);
    const user = auth.currentUser;
    if (user) {
      await saveUserSettings(user.uid, { geminiApiKey: apiKey.trim() });
      // Keep it in local storage as a backup/fast access
      localStorage.setItem('VINTED_EXPERT_API_KEY', apiKey.trim());
      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        if (onClose) onClose();
      }, 1500);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
          <Key size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Clé API Gemini</h2>
          <p className="text-xs text-gray-500 font-medium">Configuration de l'IA</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <p className="mb-2">
          Pour analyser vos vêtements, l'application utilise l'IA de Google. Vous devez fournir votre propre clé API.
        </p>
        <a 
          href="https://aistudio.google.com/app/apikey" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          Obtenir une clé gratuite <ExternalLink size={14} />
        </a>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
          Votre clé API
          <ShieldCheck size={14} className="text-emerald-500" />
        </label>
        
        {isLoading ? (
          <div className="h-12 bg-gray-100 animate-pulse rounded-xl border border-gray-200 flex items-center px-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ) : (
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm"
              placeholder="AIzaSy..."
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        )}
        <p className="text-xs text-gray-500">
          Sauvegardée de manière sécurisée sur votre compte Firebase.
        </p>
      </div>

      <div className="flex gap-3 mt-4">
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={isLoading || isSaving || !apiKey.trim()}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-bold rounded-xl transition-all ${
            isSaved 
              ? 'bg-emerald-500 text-white' 
              : !apiKey.trim()
                ? 'bg-blue-300 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
          }`}
        >
          {isSaving ? (
            <><Loader2 size={18} className="animate-spin" /> Sauvegarde...</>
          ) : isSaved ? (
            <><Check size={18} /> Enregistré</>
          ) : (
            'Enregistrer'
          )}
        </button>
      </div>
    </div>
  );
};
