import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem } from '../types';
import { ImageOff, Package, Truck, Loader2, Calendar, Clock, Send, Printer, CheckCircle2, SearchX, X, Store, Check, FileText, Search, Filter, Save } from 'lucide-react';
import { updateItem } from '../services/inventoryService';
import { getOptimizedImageUrl, parseDate, formatDateToDDMMYYYY } from '../constants';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import { PdfCropper } from './PdfCropper';
import { LazyImage } from './LazyImage';

// Set up PDF.js worker - using the version from the imported package to ensure compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const base64ToArrayBuffer = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
};

const uint8ToBase64 = (uint8: Uint8Array): string => {
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return window.btoa(binary);
};

const getTransportStyles = (transport?: string) => {
  const t = String(transport || "").toLowerCase();
  if (t.includes('mondial') || t.includes('relay')) return 'bg-pink-50 text-pink-600 border-pink-100';
  if (t.includes('vinted') && t.includes('go')) return 'bg-blue-50 text-blue-600 border-blue-100';
  if (t.includes('chronopost')) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-gray-50 text-gray-500 border-gray-100';
};

interface CommandItemCardProps { 
  item: InventoryItem; 
  onClick: (item: InventoryItem) => void; 
  onImageFetch: (sku: string, urls: string[]) => void;
  onUpdateItem: (item: InventoryItem) => void;
  onOpenPdf: (url: string, item: InventoryItem) => void;
  isBulkValidating?: boolean;
}

const CommandItemCard: React.FC<CommandItemCardProps & { user: any }> = ({ user, item, onClick, onImageFetch, onUpdateItem, onOpenPdf, isBulkValidating }) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  const image = item.images?.[0] || item.Images?.[0];

  const handleStatusUpdate = async (e: React.MouseEvent, newStatus: 'À envoyer' | 'Expédié' | 'En stock' | 'Vendu') => {
    e.stopPropagation();
    if (!user) return;

    let finalPrice = item.PriceEstimated;
    if (newStatus === 'Vendu') {
      const priceInput = window.prompt("Prix de vente final (€) :", item.PriceEstimated?.toString() || "0");
      if (priceInput === null) return; // Cancelled
      finalPrice = parseFloat(priceInput.replace(',', '.'));
      if (isNaN(finalPrice)) finalPrice = item.PriceEstimated;
    }

    setIsUpdatingStatus(true);
    
    const updatedItem = { 
      ...item, 
      articleStatus: newStatus === 'En stock' ? 'En stock' : (newStatus as any),
      vintedStatus: newStatus === 'En stock' ? 'Publié' : (newStatus === 'Vendu' ? 'Vendu' : item.vintedStatus as any),
      ...(newStatus === 'Expédié' ? { soldDate: formatDateToDDMMYYYY() } : {}),
      ...(newStatus === 'Vendu' ? { isSold: true, PriceSold: finalPrice, soldDate: formatDateToDDMMYYYY() } : {})
    };

    try {
      await updateItem(user.uid, updatedItem.sku, updatedItem);
      onUpdateItem(updatedItem);
    } catch (err) {
      console.error("Erreur mise à jour statut:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusIcon = () => {
    switch (item.articleStatus) {
      case 'À traiter': return <Clock size={12} className="text-white" />;
      case 'À envoyer': return <Package size={12} className="text-white" />;
      case 'Expédié': return <Truck size={12} className="text-white" />;
      case 'Litige': return <SearchX size={12} className="text-white" />;
      default: return null;
    }
  };

  const getStatusBg = () => {
    switch (item.articleStatus) {
      case 'À traiter': return 'bg-amber-500';
      case 'À envoyer': return 'bg-indigo-500';
      case 'Expédié': return 'bg-purple-500';
      case 'Litige': return 'bg-red-500';
      default: return 'bg-zinc-400';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      // Handle DD/MM/YYYY format
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
           // Check if it's already a valid date string in French format
           return dateStr;
        }
      }
      // Handle ISO format or timestamp
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('fr-FR');
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div onClick={() => onClick(item)} className="bg-white p-3 rounded-2xl border border-zinc-100 shadow-sm flex flex-col gap-2 hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]">
      <div className="aspect-square w-full rounded-xl overflow-hidden bg-zinc-50 flex items-center justify-center relative" >
        <LazyImage src={image} thumbnail={item.thumbnail} />
        <div className="absolute top-2 left-2 bg-blue-600/90 backdrop-blur-sm h-5 px-1.5 rounded-md flex items-center justify-center">
          <span className="text-xs font-bold text-white tracking-wider">#{item.sku}</span>
        </div>
        <div className={`absolute top-2 right-2 ${getStatusBg()} h-5 w-5 rounded-md shadow-sm flex items-center justify-center`}>
          {getStatusIcon()}
        </div>
      </div>
      
      {/* Action buttons / Badges */}
      <div className="px-0.5">
        <div className="flex items-center justify-between h-[34px] w-full">
          {item.articleStatus === 'À traiter' ? (
            <div className="flex items-center gap-2 w-full h-full">
              {item.shippingLabelUrl ? (
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onOpenPdf(item.shippingLabelUrl!, item);
                  }}
                  className="flex-1 h-full bg-red-50 text-red-600 rounded-lg flex items-center justify-center text-[9px] font-bold border border-red-100 hover:bg-red-100 transition-colors shadow-sm"
                >
                  <Printer size={12} className="mr-1" /> PDF
                </button>
              ) : (
                <div className="flex-1 h-full bg-zinc-50 text-zinc-400 rounded-lg flex items-center justify-center text-[9px] font-bold border border-zinc-100 cursor-not-allowed">
                  <Loader2 size={10} className="mr-1 animate-spin" /> En attente
                </div>
              )}
            </div>
          ) : item.articleStatus === 'À envoyer' ? (
            <button 
              onClick={(e) => handleStatusUpdate(e, 'Expédié')} 
              disabled={isUpdatingStatus} 
              className="w-full h-full bg-blue-600 text-white rounded-lg flex items-center justify-center text-[10px] font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 active:scale-95"
            >
              {isUpdatingStatus ? <Loader2 size={12} className="animate-spin" /> : <><Send size={12} className="mr-1.5" /> Envoyé</>}
            </button>
          ) : item.articleStatus === 'Expédié' ? (
            <div className="flex items-center gap-2 w-full h-full">
              <div className="flex-1 h-full bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center text-[10px] font-bold gap-1.5 border border-purple-100">
                <Calendar size={12} /> {formatDate(item.soldDate || item.date)}
              </div>
              <button 
                onClick={(e) => handleStatusUpdate(e, 'Vendu')} 
                disabled={isUpdatingStatus} 
                className="flex-1 h-full bg-emerald-600 text-white rounded-lg flex items-center justify-center text-[10px] font-bold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200 active:scale-95"
              >
                {isUpdatingStatus ? <Loader2 size={12} className="animate-spin" /> : <><Check size={12} className="mr-1.5" /> Finaliser</>}
              </button>
            </div>
          ) : item.articleStatus === 'Litige' ? (
            <button 
              onClick={(e) => handleStatusUpdate(e, 'En stock')} 
              disabled={isUpdatingStatus} 
              className="w-full h-full bg-red-600 text-white rounded-lg flex items-center justify-center text-[10px] font-bold hover:bg-red-700 transition-colors shadow-sm shadow-red-200 active:scale-95"
            >
              {isUpdatingStatus ? <Loader2 size={12} className="animate-spin" /> : <><Check size={12} className="mr-1.5" /> Récupéré</>}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

type ViewStep = 'list' | 'processing' | 'success';

export const CommandView: React.FC<{ user: any, inventory: InventoryItem[], onItemClick: (item: InventoryItem) => void, onImageFetch: (sku: string, urls: string[]) => void, onUpdateItem: (item: InventoryItem) => void, isLoading: boolean }> = ({ user, inventory, onItemClick, onImageFetch, onUpdateItem, isLoading }) => {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [saveDefaultSuccess, setSaveDefaultSuccess] = useState(false);

  // Load defaults from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('vinted_command_filters');
    if (saved) {
      try {
        const defaults = JSON.parse(saved);
        if (defaults.selectedStatuses) setSelectedStatuses(defaults.selectedStatuses);
      } catch (e) {
        console.error("Error loading command filters:", e);
      }
    }
  }, []);

  const saveAsDefault = () => {
    const defaults = {
      selectedStatuses
    };
    localStorage.setItem('vinted_command_filters', JSON.stringify(defaults));
    setSaveDefaultSuccess(true);
    setTimeout(() => setSaveDefaultSuccess(false), 2000);
  };
  const [viewStep, setViewStep] = useState<ViewStep>('list');
  const [isBulkValidating, setIsBulkValidating] = useState(false);
  const [lastPdfUrl, setLastPdfUrl] = useState<string | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [croppingItem, setCroppingItem] = useState<{ url: string, item: InventoryItem } | null>(() => {
    try {
      const saved = sessionStorage.getItem('vinted_cropping_item');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (croppingItem) {
      sessionStorage.setItem('vinted_cropping_item', JSON.stringify(croppingItem));
    } else {
      sessionStorage.removeItem('vinted_cropping_item');
    }
  }, [croppingItem]);

  const openPdf = (url: string, item: InventoryItem) => {
    setCroppingItem({ url, item });
  };

  const closePdf = () => {
    setCroppingItem(null);
  };

  const toggleStatus = (status: string) => setSelectedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);

  const filtered = useMemo(() => {
    let list = [...inventory];
    if (selectedStatuses.length > 0) list = list.filter(item => selectedStatuses.includes(item.articleStatus));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        item.sku?.toLowerCase().includes(q) || 
        item.brand?.toLowerCase().includes(q)
      );
    }
    
    return list.sort((a, b) => {
      const dateA = parseDate(a.soldDate || a.date);
      const dateB = parseDate(b.soldDate || b.date);
      return dateB - dateA;
    });
  }, [inventory, selectedStatuses, searchQuery]);

  const stats = useMemo(() => ({
    'À traiter': inventory.filter(i => i.articleStatus === 'À traiter').length,
    'À envoyer': inventory.filter(i => i.articleStatus === 'À envoyer').length,
    'Expédié': inventory.filter(i => i.articleStatus === 'Expédié').length,
    'Litige': inventory.filter(i => i.articleStatus === 'Litige').length,
  }), [inventory]);

  const handleBulkStatusUpdate = async () => {
    const itemsToProcess = inventory.filter(i => i.articleStatus === 'À traiter');
    if (itemsToProcess.length === 0 || isBulkValidating || !user) return;
    
    setIsBulkValidating(true);
    try {
      for (const item of itemsToProcess) {
        const updatedItem = { ...item, articleStatus: 'À envoyer' as any };
        await updateItem(user.uid, updatedItem.sku, updatedItem);
        onUpdateItem(updatedItem);
      }
    } catch (err) {
      console.error("Erreur lors de la validation groupée:", err);
    } finally {
      setIsBulkValidating(false);
    }
  };

  const handleBulkPdfDownload = async () => {
    // PDF generation requires Google Apps Script backend, disabled for now
    alert("La génération de PDF nécessite le backend Google Apps Script.");
  };

  const handlePdfPrinted = async (item: InventoryItem) => {
    if (!user) return;
    // Update status to 'À envoyer'
    const updatedItem = { ...item, articleStatus: 'À envoyer' as any };
    try {
      await updateItem(user.uid, updatedItem.sku, updatedItem);
      onUpdateItem(updatedItem);
      closePdf();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };



  if (viewStep === 'processing') return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center pt-32 min-h-[50vh] animate-in fade-in duration-300">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-8 shadow-sm">
        <Loader2 size={32} className="animate-spin" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Génération...</h2>
      <p className="text-slate-400 font-bold text-[10px]">Fusion et Sauvegarde sur Drive</p>
    </div>
  );

  if (viewStep === 'success') return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center pt-24 min-h-[60vh] animate-in zoom-in duration-500 px-6">
      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-8 shadow-sm border-2 border-white">
        <CheckCircle2 size={40} strokeWidth={3} />
      </div>
      <div className="text-center space-y-2 mb-12">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">PDF Prêt !</h2>
        <p className="text-slate-400 font-bold text-[10px]">Bordereau groupé ({processedCount} articles) sauvegardé</p>
      </div>
      <div className="w-full flex flex-col gap-3">
        {lastPdfUrl && (
          <button 
            onClick={() => window.open(lastPdfUrl, "_blank")}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-3 text-xs active:scale-95 transition-all"
          >
            <Printer size={18} /> Ouvrir le PDF
          </button>
        )}
        <button 
          onClick={() => setViewStep('list')} 
          className="w-full py-4 bg-white text-slate-600 font-bold rounded-2xl border border-slate-100 flex items-center justify-center gap-3 text-xs active:scale-95 transition-all"
        >
          <Check size={18} /> Retour aux commandes
        </button>
      </div>
    </div>
  );

  return (
    <>
    <div className="animate-in fade-in duration-300">
      <div className="px-1 flex items-center justify-between mb-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-800">Commandes</h2>
          <span className="text-xs font-medium text-gray-400">{filtered.length} commandes en cours</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-medium outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm placeholder:text-zinc-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border transition-all flex items-center justify-center shadow-sm ${showFilters ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
          >
            <Filter size={20} />
          </button>
        </div>

        {showFilters && (
          <div className="bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-2">
              {/* Statut Filter */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Statut</label>
                <div className="flex flex-wrap gap-1.5">
                    {['À traiter', 'À envoyer', 'Expédié', 'Litige'].map(status => (
                      <button
                        key={status}
                        onClick={() => toggleStatus(status)}
                        title={status}
                        className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all flex-auto whitespace-nowrap flex justify-center items-center ${
                          selectedStatuses.includes(status)
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                            : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        {status === 'À traiter' && <Clock size={16} className="mr-1.5" />}
                        {status === 'À envoyer' && <Package size={16} className="mr-1.5" />}
                        {status === 'Expédié' && <Truck size={16} className="mr-1.5" />}
                        {status === 'Litige' && <SearchX size={16} className="mr-1.5" />}
                        {status}
                      </button>
                    ))}
                </div>
              </div>

              {/* Reset & Save Filters */}
              <div className="pt-1 flex justify-between items-center border-t border-zinc-100 mt-1">
                <button 
                  onClick={saveAsDefault}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${
                    saveDefaultSuccess 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {saveDefaultSuccess ? <Check size={12} /> : <Save size={12} />}
                  {saveDefaultSuccess ? 'Enregistré' : 'Enregistrer par défaut'}
                </button>
                <button 
                  onClick={() => {
                    setSelectedStatuses([]);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg text-[10px] font-bold hover:bg-zinc-200 transition-all active:scale-95"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filtered.length > 0 ? (
          filtered.map(item => (
            <CommandItemCard 
              key={item.sku} 
              user={user} 
              item={item} 
              onClick={onItemClick} 
              onImageFetch={onImageFetch} 
              onUpdateItem={onUpdateItem} 
              onOpenPdf={openPdf}
              isBulkValidating={isBulkValidating && item.articleStatus === 'À traiter'} 
            />
          ))
        ) : !isLoading && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mb-6">
              <SearchX size={32} />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-2">Aucune commande</h3>
            <p className="text-zinc-400 text-[10px] font-bold max-w-[200px] leading-relaxed mb-8">
              Il n'y a rien à afficher pour les filtres sélectionnés.
            </p>
            <button 
              onClick={() => setSelectedStatuses([])}
              className="px-6 py-3 bg-white border border-zinc-200 text-zinc-600 rounded-xl text-[10px] font-bold shadow-sm active:scale-95 transition-all"
            >
              Voir tout
            </button>
          </div>
        )}
      </div>
    </div>

    {/* PDF Cropper Overlay - Positioned to respect Layout header (z-50) and footer (z-60) */}
    {croppingItem && (
      <div className="fixed inset-0 z-40 bg-gray-50 overflow-y-auto animate-in slide-in-from-bottom-10 duration-300">
        <div className="min-h-screen pt-20 pb-20 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
          <PdfCropper 
            pdfUrl={croppingItem.url} 
            item={croppingItem.item} 
            onClose={closePdf} 
            onComplete={closePdf}
            onPrintMarkAsSent={() => handlePdfPrinted(croppingItem.item)}
          />
        </div>
      </div>
    )}
    </>
  );
};
