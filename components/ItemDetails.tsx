
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { InventoryItem } from '../types';
import { formatPrice, VINTED_STATUS_LABELS } from '../constants';
import { ChevronLeft, Pencil, Store, ShoppingBag, Globe, TrendingUp, Banknote, X, Check, Tag, Info, ChevronRight, Truck, Camera, Layers, Palette, FileText, Clock, Package, AlertTriangle, RefreshCcw, ImageOff } from 'lucide-react';;

interface ItemDetailsProps {
  item: InventoryItem;
  onEdit: () => void;
  onBack: () => void;
}

export const ItemDetails: React.FC<ItemDetailsProps> = ({ 
  item, onEdit, onBack 
}) => {
  const [drivePhotos, setDrivePhotos] = useState<string[]>(item.Images || []);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Identifie si nous sommes dans le flux de commande basé sur le statut
  const isCommandFlow = ['À traiter', 'À envoyer', 'Expédié', 'Litige'].includes(item.articleStatus);
  const isStockFlow = item.articleStatus === 'En stock';
  const isSoldFlow = item.articleStatus === 'Vendu' || item.isSold;

  // Swipe gesture state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const loadDrivePhotos = async (force = false) => {
    // No longer fetching from Google Drive
    setIsLoadingPhotos(false);
  };

  useEffect(() => {
    if (item.Images && item.Images.length > 0) {
      setDrivePhotos(item.Images);
    } else if (!item.images || item.images.length === 0) {
       loadDrivePhotos();
    }
  }, [item.sku, item.Images, item.images]);

  const allPhotos = useMemo(() => {
    if (drivePhotos.length > 0) return drivePhotos;
    if (item.Images?.[0]) return [item.Images?.[0]];
    return item.images || [];
  }, [item.images, item.Images?.[0], drivePhotos]);
  
  const totalCost = (item.PricePurchase || 0) + (item.PriceTransport || 0) + (item.PriceTaxes || 0);
  const currentPrice = isSoldFlow ? (item.PriceSold || 0) : (item.PriceEstimated || 0);
  const profit = currentPrice - totalCost;
  const multiplier = totalCost > 0 ? currentPrice / totalCost : 0;

  const nextImage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (allPhotos.length > 0) {
      setCurrentImgIdx((prev) => (prev + 1) % allPhotos.length);
    }
  }, [allPhotos.length]);

  const prevImage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (allPhotos.length > 0) {
      setCurrentImgIdx((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
    }
  }, [allPhotos.length]);

  const getStatusBadgeConfig = (item: InventoryItem) => {
    if (item.isSold || item.articleStatus === 'Vendu') {
      return { label: 'Vendu', styles: 'bg-emerald-500 text-white shadow-emerald-100', icon: <Check size={12} strokeWidth={3} /> };
    }

    // Si l'article est dans le flux commande, on garde le statut de traitement
    if (['À traiter', 'À envoyer', 'Expédié', 'Litige'].includes(item.articleStatus)) {
      switch (item.articleStatus) {
        case 'À traiter': return { label: 'À traiter', styles: 'bg-amber-500 text-white shadow-amber-100', icon: <Clock size={12} className="text-white" /> };
        case 'À envoyer': return { label: 'À envoyer', styles: 'bg-indigo-500 text-white shadow-indigo-100', icon: <Package size={12} className="text-white" /> };
        case 'Expédié': return { label: 'Expédié', styles: 'bg-purple-500 text-white shadow-purple-100', icon: <Truck size={12} className="text-white" /> };
        case 'Litige': return { label: 'Litige', styles: 'bg-red-500 text-white shadow-red-100', icon: <AlertTriangle size={12} className="text-white" /> };
      }
    }

    // Statuts Vinted harmonisés avec l'onglet Stock
    const vStatus = (item.vintedStatus || 'Apublier') as string;
    switch (vStatus) {
      case 'Publie':
      case 'Publié': return { label: 'Publié', styles: 'bg-emerald-500 text-white shadow-emerald-100', icon: <Globe size={12} className="text-white" /> };
      case 'Apublier':
      case 'À publier': return { label: 'À publier', styles: 'bg-orange-500 text-white shadow-orange-100', icon: <Package size={12} className="text-white" /> };
      case 'Arepublier':
      case 'À republier': return { label: 'À republier', styles: 'bg-amber-500 text-white shadow-amber-100', icon: <RefreshCcw size={12} className="text-white" /> };
      case 'Enattente':
      case 'En attente': return { label: 'En attente', styles: 'bg-zinc-500 text-white shadow-zinc-100', icon: <Clock size={12} className="text-white" /> };
      case 'Brouillon' as any: return { label: 'Brouillon', styles: 'bg-zinc-400 text-white shadow-zinc-100', icon: <FileText size={12} className="text-white" /> };
      default: return { label: VINTED_STATUS_LABELS[vStatus] || vStatus, styles: 'bg-zinc-400 text-white', icon: <Info size={12} className="text-white" /> };
    }
  };

  const badgeConfig = getStatusBadgeConfig(item);

  const getTransportBadgeStyles = (transport?: string) => {
    const t = String(transport || "").toLowerCase();
    if (t.includes('mondial') || t.includes('relay')) return 'bg-pink-50 text-pink-600 border border-pink-100 shadow-pink-50';
    if (t.includes('vinted') && t.includes('go')) return 'bg-[#09B1BA] text-white shadow-teal-100';
    if (t.includes('chronopost')) return 'bg-amber-50 text-amber-700 border border-amber-200 shadow-amber-50';
    return 'bg-zinc-50 text-zinc-600 border border-zinc-100';
  };

  const getVendorBadgeStyles = (vendor: string) => {
    const v = String(vendor || "").toLowerCase();
    if (v.includes('vinted')) return 'bg-[#09B1BA] text-white shadow-teal-100'; 
    if (v.includes('whatnot')) return 'bg-[#F5D211] text-zinc-900 shadow-yellow-100'; 
    return 'bg-white border border-zinc-200 text-zinc-600';
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLightboxOpen) {
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
        if (e.key === 'Escape') setIsLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, nextImage, prevImage]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;
    if (deltaX > 100 && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
      onBack();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div 
      className="animate-in fade-in slide-in-from-bottom-8 duration-700"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="px-1 flex items-center justify-between mb-4 relative min-h-[48px]">
        <button onClick={onBack} className="w-8 h-8 bg-white border border-zinc-200 text-zinc-600 rounded-full shadow-sm flex items-center justify-center hover:bg-zinc-50 active:scale-95 transition-all z-10">
          <ChevronLeft size={18} />
        </button>
        
        <div className="absolute left-0 right-0 flex flex-col items-center pointer-events-none">
          <h2 className="text-2xl font-bold text-gray-800">Détails de l'article</h2>
        </div>
        
        <div className="flex items-center gap-2 z-10">
          {(!isSoldFlow && !isCommandFlow || allPhotos.length === 0) && (
            <>
              <button 
                onClick={onEdit} 
                className="w-8 h-8 bg-blue-600 text-white rounded-full shadow-sm flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
              >
                <Pencil size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 shadow-sm bg-blue-50 text-blue-600 border border-blue-100">
          <span>#{item.sku}</span>
        </div>
        
        {isCommandFlow ? (
            <div className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 shadow-sm ${getTransportBadgeStyles(item.transport)}`}>
              <Truck size={14} />
              {item.transport || 'Transport Inconnu'}
            </div>
        ) : (
          <div className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 shadow-sm ${getVendorBadgeStyles(item.vendor)}`}>
            <Store size={14} />
            {item.vendor || 'Vinted'}
          </div>
        )}



        <div className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 shadow-sm ${badgeConfig.styles}`}>
          {badgeConfig.icon}
          {badgeConfig.label}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="relative group select-none max-w-sm mx-auto">
            <div 
              className="relative aspect-square rounded-[32px] overflow-hidden bg-white shadow-2xl shadow-zinc-200/50 border border-zinc-100 flex items-center justify-center cursor-zoom-in"
              onClick={() => setIsLightboxOpen(true)}
            >
              {allPhotos.length > 0 ? (
                <>
                  <img 
                    src={allPhotos[currentImgIdx]} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    alt={item.headline}
                  />
                  <div className="absolute bottom-6 right-6 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-white text-[10px] font-bold tracking-widest flex items-center gap-2 pointer-events-none z-20">
                    <Camera size={14} /> {currentImgIdx + 1} / {allPhotos.length}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-zinc-200">
                  <ImageOff size={80} strokeWidth={1} />
                  <span className="text-[10px] font-bold mt-6">Pas d'image</span>
                </div>
              )}
            </div>
            {allPhotos.length > 1 && (
              <>
                <button onClick={prevImage} className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-xl rounded-2xl flex items-center justify-center text-zinc-900 shadow-xl border border-white hover:bg-white hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100 z-30"><ChevronLeft size={28} /></button>
                <button onClick={nextImage} className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-xl rounded-2xl flex items-center justify-center text-zinc-900 shadow-xl border border-white hover:bg-white hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100 z-30"><ChevronRight size={28} /></button>
              </>
            )}
          </div>

          {isStockFlow && (item.description && item.description.trim().length > 0) && (
            <div className="bg-white p-3 rounded-[32px] shadow-sm border border-zinc-100 relative group">
              <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-2 text-zinc-400 font-bold text-[10px]"><FileText size={16} /> Description</div>
              </div>
              <div className="bg-zinc-50 p-3 rounded-3xl border border-zinc-100">
                 <div className="whitespace-pre-wrap break-words font-sans text-sm text-zinc-600 leading-relaxed">{item.description}</div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-4 rounded-[32px] shadow-sm border border-zinc-100 space-y-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px]"><Tag size={14} /> Titre de l'annonce</div>
                </div>
                <h1 className="text-2xl font-bold text-zinc-900 leading-tight tracking-tight">{item.headline}</h1>
              </div>
            </div>
            <div className="bg-zinc-50/50 rounded-3xl border border-zinc-100 overflow-hidden">
              <div className="divide-y divide-zinc-100">
                <DetailRow icon={<Store size={18} />} label="Marque" value={item.brand || "Vintage"} color="blue" />
                <DetailRow icon={<ShoppingBag size={18} />} label="Taille" value={item.size} color="purple" />
                <DetailRow icon={<Palette size={18} />} label="Coloris" value={item.color} color="orange" />
                {item.condition && <DetailRow icon={<Tag size={18} />} label="État" value={item.condition} color="emerald" />}
                <DetailRow icon={<Layers size={18} />} label="Catégorie" value={item.category.split(' - ').pop() || ""} color="slate" />
              </div>
            </div>
          </div>

          <div className="bg-zinc-50 p-4 rounded-[32px] shadow-sm border border-zinc-100 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-zinc-400 flex items-center gap-2"><Banknote size={16} className="text-zinc-500" /> Analyse Financière</h3>
              {!isCommandFlow && <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${multiplier >= 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>x{multiplier.toFixed(1)}</div>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col items-center text-center">
                <span className="text-[9px] font-bold text-zinc-400 uppercase mb-1.5">Achat</span><span className="text-sm font-bold text-zinc-900">{formatPrice(item.PricePurchase)}€</span>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col items-center text-center">
                <span className="text-[9px] font-bold text-zinc-400 uppercase mb-1.5">Livraison</span><span className="text-sm font-bold text-zinc-900">{formatPrice(item.PriceTransport)}€</span>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col items-center text-center">
                <span className="text-[9px] font-bold text-zinc-400 uppercase mb-1.5">Taxes</span><span className="text-sm font-bold text-zinc-900">{formatPrice(item.PriceTaxes)}€</span>
              </div>
            </div>
            <div className="bg-white py-3 px-5 rounded-2xl border border-zinc-100 flex items-center justify-between shadow-sm">
               <span className="text-[10px] font-bold text-zinc-400">Coût Total</span>
               <span className="text-lg font-bold text-zinc-900">{formatPrice(totalCost)}€</span>
            </div>
            {isSoldFlow && item.soldDate && (
              <div className="bg-emerald-50 py-3 px-5 rounded-2xl border border-emerald-100 flex items-center justify-between shadow-sm">
                 <span className="text-[10px] font-bold text-emerald-600">Date de Vente</span>
                 <span className="text-sm font-bold text-emerald-700">
                   {item.soldDate.includes('/') ? item.soldDate : new Date(item.soldDate).toLocaleDateString('fr-FR')}
                 </span>
              </div>
            )}
            {!isCommandFlow && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-600 p-5 rounded-3xl shadow-lg shadow-blue-100 text-white">
                  <p className="text-[9px] font-bold text-blue-200 mb-1.5">Prix {isSoldFlow ? 'Final' : 'Estimé'}</p>
                  <p className="text-2xl font-bold">{formatPrice(currentPrice)}€</p>
                </div>
                <div className={`p-5 rounded-3xl shadow-sm border ${profit >= 0 ? 'bg-white border-emerald-500 text-emerald-600' : 'bg-white border-red-500 text-red-600'}`}>
                  <p className={`text-[9px] font-bold mb-1.5 ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>Profit Net</p>
                  <div className="flex items-center gap-1.5"><TrendingUp size={16} /><p className="text-2xl font-bold tracking-tight">{formatPrice(profit)}€</p></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLightboxOpen && (
        <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {allPhotos.length > 0 && (
               <img src={allPhotos[currentImgIdx]} className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl" alt={item.headline} />
            )}
            {allPhotos.length > 1 && (
              <>
                <button onClick={prevImage} className="absolute left-4 md:left-10 p-4 bg-white/10 text-white rounded-full hover:bg-white/20 backdrop-blur-md transition-all active:scale-95"><ChevronLeft size={32} /></button>
                <button onClick={nextImage} className="absolute right-4 md:right-10 p-4 bg-white/10 text-white rounded-full hover:bg-white/20 backdrop-blur-md transition-all active:scale-95"><ChevronRight size={32} /></button>
              </>
            )}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-white/80 text-sm font-medium backdrop-blur-md">{currentImgIdx + 1} / {allPhotos.length}</div>
          </div>
          <button onClick={() => setIsLightboxOpen(false)} className="absolute top-6 right-6 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 backdrop-blur-md transition-all z-[80]"><X size={24} /></button>
        </div>
      )}
    </div>
  );
};

const DetailRow: React.FC<{icon: React.ReactNode, label: string, value: string, color: string}> = ({ icon, label, value, color }) => {
  const colors: any = { blue: 'bg-blue-50 text-blue-600', purple: 'bg-purple-50 text-purple-600', orange: 'bg-orange-50 text-orange-600', slate: 'bg-slate-50 text-slate-600', emerald: 'bg-emerald-50 text-emerald-600' };
  return (
    <div className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition-colors group cursor-default">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color] || 'bg-slate-100'}`}>
          {React.cloneElement(icon as React.ReactElement, { size: 16 })}
        </div>
        <div>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">{label}</p>
          <p className="text-xs font-bold text-slate-900 mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
};
