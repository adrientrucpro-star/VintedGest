
import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem } from '../types';
import { updateItem } from '../services/inventoryService';
import { 
  COLORS, POPULAR_BRANDS, SIZE_MAP, CATEGORY_TREE, VENDOR_OPTIONS, VINTED_STATUS_OPTIONS, VINTED_STATUS_LABELS, formatDateToDDMMYYYY 
} from '../constants';
import { X, Loader2, Truck, ChevronLeft, FileText, Check, Tag, Store, CheckCircle2, Package, RefreshCcw, Globe, Info, ImageOff, Camera, ChevronRight, Banknote, Plus, Clock, Trash2, AlertTriangle } from 'lucide-react';

const optimizeImage = async (base64: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(base64);
  });
};

interface EditItemProps {
  item: InventoryItem;
  onSave: (updatedItem: InventoryItem) => void;
  onCancel: () => void;
  onGoToStock: (updatedItem: InventoryItem) => void;
  onDelete?: (sku: string) => Promise<void>;
}

type Step = 'form' | 'saving' | 'success';

export const EditItem: React.FC<EditItemProps> = ({ item, onSave, onCancel, onGoToStock, onDelete }) => {
  const [step, setStep] = useState<Step>('form');
  const [editedItem, setEditedItem] = useState<InventoryItem>(item);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [estPriceStr, setEstPriceStr] = useState<string>(item.PriceEstimated?.toString() || "0");
  const [soldPriceStr, setSoldPriceStr] = useState<string>(item.PriceSold?.toString() || item.PriceEstimated?.toString() || "0");
  
  const getInitialSoldDate = () => {
    if (!item.soldDate) return new Date().toISOString().split('T')[0];
    try {
      if (item.soldDate.includes('/')) {
        const [d, m, y] = item.soldDate.split('/');
        if (d && m && y) return `${y}-${m}-${d}`;
      }
      const d = new Date(item.soldDate);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch (e) {}
    return new Date().toISOString().split('T')[0];
  };
  const [soldDateStr, setSoldDateStr] = useState<string>(getInitialSoldDate());
  
  const [purchasePriceStr, setPurchasePriceStr] = useState<string>(item.PricePurchase?.toString() || "0");
  const [shippingFeesStr, setShippingFeesStr] = useState<string>(item.PriceTransport?.toString() || "0");
  const [taxesStr, setTaxesStr] = useState<string>(item.PriceTaxes?.toString() || "0");
  const [catLevels, setCatLevels] = useState<string[]>(item.category.split(' - ').map(p => p.trim()));

  const [isAddingCustomBrand, setIsAddingCustomBrand] = useState(false);
  const [customBrandName, setCustomBrandName] = useState("");
  const [customBrandsList, setCustomBrandsList] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Image state
  const allPhotos = useMemo(() => {
    if (editedItem.Images && editedItem.Images.length > 0) return editedItem.Images;
    if (editedItem.Images?.[0]) return [editedItem.Images?.[0]];
    return editedItem.images || [];
  }, [editedItem]);

  useEffect(() => {
    if (item) {
      setEditedItem({ ...item });
      setEstPriceStr(item.PriceEstimated?.toString() || "0");
      setPurchasePriceStr(item.PricePurchase?.toString() || "0");
      setShippingFeesStr(item.PriceTransport?.toString() || "0");
      setTaxesStr(item.PriceTaxes?.toString() || "0");
      setCatLevels(item.category.split(' - ').map(p => p.trim()));
    }
  }, [item]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vinted_custom_brands');
      if (saved) setCustomBrandsList(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const allBrands = useMemo(() => Array.from(new Set([...POPULAR_BRANDS, ...customBrandsList])).sort(), [customBrandsList]);

  const parseToNumber = (val: string): number => {
    if (!val) return 0;
    const cleaned = val.toString().replace(',', '.').replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const availableSizes = useMemo(() => {
    const fullCat = catLevels.join(' ').toLowerCase();
    if (fullCat.includes('chaussures')) return SIZE_MAP.CHAUSSURES;
    if (fullCat.includes('enfant')) return SIZE_MAP.ENFANTS;
    if (fullCat.includes('femmes')) return SIZE_MAP.FEMMES;
    if (fullCat.includes('hommes')) {
       if (fullCat.includes('pantalons') || fullCat.includes('jeans') || fullCat.includes('shorts')) return SIZE_MAP.HOMMES_BAS;
       return SIZE_MAP.HOMMES_HAUTS;
    }
    return SIZE_MAP.HOMMES_HAUTS;
  }, [catLevels]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;
    setIsOptimizing(true);
    setError(null);
    try {
      const readPromises = files.map(file => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      }));
      const rawImages = await Promise.all(readPromises);
      const optimized = await Promise.all(rawImages.map(img => optimizeImage(img)));
      
      // When adding new images, we combine existing cloud URLs and new local images
      setEditedItem(prev => {
        const existingImages = prev.images && prev.images.length > 0 ? prev.images : (prev.Images || []);
        return {
          ...prev,
          images: [...existingImages, ...optimized],
          Images: [],
        };
      });
    } catch (err) { 
      setError("Erreur lors de l'ajout des photos."); 
    } finally { 
      setIsOptimizing(false); 
      if (fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };

  const handleRemoveImage = (idx: number) => {
    setEditedItem(prev => {
      const existingImages = prev.images && prev.images.length > 0 ? prev.images : (prev.Images || []);
      const newImages = [...existingImages];
      newImages.splice(idx, 1);
      return { 
        ...prev, 
        images: newImages,
        Images: [],
      };
    });
  };

  const handleMoveImage = (idx: number, direction: number) => {
    setEditedItem(prev => {
      const existingImages = prev.images && prev.images.length > 0 ? prev.images : (prev.Images || []);
      const newImages = [...existingImages];
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= newImages.length) return prev;
      
      const temp = newImages[idx];
      newImages[idx] = newImages[targetIdx];
      newImages[targetIdx] = temp;
      
      return { 
        ...prev, 
        images: newImages,
        Images: [],
      };
    });
  };

  const handleSave = async () => {
    setStep('saving');
    setError(null);
    try {
      const finalCategory = catLevels.filter(Boolean).join(' - ');
      
      let finalImages = editedItem.Images || [];
      let firstImage = finalImages[0];
      let localImages = editedItem.images || [];

      // If we have base64 images OR if the images array contains remaining URLs (after removal)
      const hasBase64 = localImages.some(img => img.startsWith('data:image'));
      const hasUrlsInImages = localImages.some(img => img.startsWith('http'));

      if (hasBase64 || hasUrlsInImages) {
        const { uploadImageToStorage } = await import('../services/storageService');
        const uploadedUrls: string[] = [];
        const uid = editedItem.userId;
        
        if (!uid) {
          setError("ID utilisateur manquant.");
          setStep('form');
          return;
        }
        
        for (let i = 0; i < localImages.length; i++) {
          const img = localImages[i];
          if (img.startsWith('data:image')) {
            try {
              const url = await uploadImageToStorage(uid, editedItem.sku, img, i);
              uploadedUrls.push(url);
            } catch (uploadErr) {
              console.error(`Failed to upload image ${i}:`, uploadErr);
              uploadedUrls.push(img);
            }
          } else {
            uploadedUrls.push(img);
          }
        }
        
        finalImages = uploadedUrls;
        firstImage = uploadedUrls[0];
        localImages = [];
      }

      // Régénère le thumbnail si les photos ont changé (on a un base64 local dispo)
      // Sinon on conserve le thumbnail existant
      let thumbnail = editedItem.thumbnail || '';
      if (localImages.length > 0 || (editedItem.images && editedItem.images.length > 0)) {
        const firstLocal = (editedItem.images || [])[0] || localImages[0];
        if (firstLocal) {
          const { generateThumbnail } = await import('../services/thumbnail');
          thumbnail = await generateThumbnail(firstLocal);
        }
      }

      const itemToSync: InventoryItem = { 
        ...editedItem, 
        category: finalCategory,
        categoryLevels: catLevels.filter(Boolean),
        PriceEstimated: parseToNumber(estPriceStr),
        PricePurchase: parseToNumber(purchasePriceStr),
        PriceTransport: parseToNumber(shippingFeesStr),
        PriceTaxes: parseToNumber(taxesStr),
        images: localImages,
        Images: finalImages,
        thumbnail,
        ...(editedItem.articleStatus === 'Vendu' ? {
          isSold: true,
          PriceSold: parseToNumber(soldPriceStr),
          soldDate: formatDateToDDMMYYYY(new Date(soldDateStr))
        } : {})
      };
      
      console.log("Saving item to Firestore:", itemToSync);
      await updateItem(itemToSync.userId, itemToSync.sku, itemToSync);
      
      setEditedItem(itemToSync);
      setStep('success');
    } catch (err) {
      setError("Erreur de sauvegarde.");
      setStep('form');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(item.sku);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const updateLevel = (index: number, value: string) => {
    const newLevels = catLevels.slice(0, index + 1);
    newLevels[index] = value;
    setCatLevels(newLevels);
  };

  const renderCategorySelectors = () => {
    const selectors = [];
    let currentOptions = CATEGORY_TREE;
    selectors.push(
      <select key="level-0" value={catLevels[0] || ""} onChange={(e) => updateLevel(0, e.target.value)} className="w-full px-4 py-3 bg-zinc-100 text-zinc-900 border-none rounded-2xl font-black outline-none appearance-none cursor-pointer shadow-sm mb-2 text-xs tracking-wider">
        <option value=""></option>
        {Object.keys(CATEGORY_TREE).map(k => <option key={k} value={k}>{k}</option>)}
      </select>
    );
    for (let i = 0; i < catLevels.length; i++) {
      const selectedValue = catLevels[i];
      if (!selectedValue || !currentOptions[selectedValue]) break;
      currentOptions = currentOptions[selectedValue];
      if (typeof currentOptions === 'object' && currentOptions !== null) {
        const options = Array.isArray(currentOptions) ? currentOptions : Object.keys(currentOptions);
        if (options.length > 0) {
          selectors.push(
            <select key={`level-${i + 1}`} value={catLevels[i + 1] || ""} onChange={(e) => updateLevel(i + 1, e.target.value)} className="w-full px-4 py-3 bg-zinc-100 text-zinc-900 border-none rounded-2xl font-black outline-none appearance-none cursor-pointer shadow-sm mb-2 text-xs tracking-wider">
              <option value=""></option>
              {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          );
        }
      }
    }
    return <div className="flex flex-col">{selectors}</div>;
  };

  // Helper functions for badges
  const getStatusBadgeConfig = (item: InventoryItem) => {
    if (item.isSold || item.articleStatus === 'Vendu') {
      return { label: 'Vendu', styles: 'bg-emerald-500 text-white shadow-sm', icon: <Check size={12} strokeWidth={3} /> };
    }
    if (['À traiter', 'À envoyer', 'Expédié'].includes(item.articleStatus)) {
      switch (item.articleStatus) {
        case 'À traiter': return { label: 'À traiter', styles: 'bg-amber-500 text-white shadow-sm', icon: <Info size={12} /> };
        case 'À envoyer': return { label: 'À envoyer', styles: 'bg-indigo-500 text-white shadow-sm', icon: <Truck size={12} /> };
        case 'Expédié': return { label: 'Expédié', styles: 'bg-purple-500 text-white shadow-sm', icon: <Globe size={12} /> };
      }
    }
    const vStatus = (item.vintedStatus || 'Apublier') as string;
    switch (vStatus) {
      case 'Publie':
      case 'Publié': return { label: 'Publié', styles: 'bg-emerald-500 text-white shadow-sm', icon: <Globe size={12} /> };
      case 'Apublier':
      case 'À publier': return { label: 'À publier', styles: 'bg-orange-500 text-white shadow-sm', icon: <Package size={12} /> };
      case 'Arepublier':
      case 'À republier': return { label: 'À republier', styles: 'bg-amber-500 text-white shadow-sm', icon: <RefreshCcw size={12} /> };
      case 'Enattente':
      case 'En attente': return { label: 'En attente', styles: 'bg-zinc-500 text-white shadow-sm', icon: <Clock size={12} /> };
      default: return { label: vStatus, styles: 'bg-zinc-400 text-white shadow-sm', icon: <Info size={12} /> };
    }
  };

  const getTransportBadgeStyles = (transport?: string) => {
    const t = String(transport || "").toLowerCase();
    if (t.includes('mondial') || t.includes('relay')) return 'bg-pink-50 text-pink-600 border border-pink-100 shadow-pink-50';
    if (t.includes('vinted') && t.includes('go')) return 'bg-blue-50 text-blue-600 border border-blue-100 shadow-blue-50';
    if (t.includes('chronopost')) return 'bg-amber-50 text-amber-700 border border-amber-100 shadow-amber-50';
    return 'bg-zinc-50 text-zinc-600 border border-zinc-100';
  };

  const getVendorBadgeStyles = (vendor: string) => {
    const v = String(vendor || "").toLowerCase();
    if (v.includes('vinted')) return 'bg-[#09B1BA] text-white shadow-teal-100'; 
    if (v.includes('whatnot')) return 'bg-[#F5D211] text-zinc-900 shadow-yellow-100'; 
    return 'bg-white border border-zinc-200 text-zinc-600';
  };

  const badgeConfig = getStatusBadgeConfig(editedItem);
  const isCommandFlow = ['À traiter', 'À envoyer', 'Expédié'].includes(editedItem.articleStatus);

  if (step === 'saving') return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center pt-32 min-h-[50vh] animate-in fade-in duration-500">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-8 shadow-sm">
        <Loader2 size={32} className="animate-spin" />
      </div>
      <h2 className="text-2xl font-bold text-zinc-900 mb-2">Mise à jour...</h2>
      <p className="text-zinc-400 font-bold text-[10px]">Synchronisation avec le cloud</p>
    </div>
  );

  if (step === 'success') return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center pt-24 min-h-[60vh] animate-in zoom-in duration-500 px-6">
      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-8 shadow-sm border-2 border-white">
        <CheckCircle2 size={40} strokeWidth={3} />
      </div>
      <div className="text-center space-y-2 mb-12">
        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">C'est à jour !</h2>
        <p className="text-zinc-400 font-bold text-[10px]">Article #{editedItem.sku} modifié avec succès</p>
      </div>
      <div className="w-full flex flex-col gap-3">
        <button onClick={() => onGoToStock(editedItem)} className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-3 text-xs active:scale-95 transition-all">
          <Store size={18} /> Stock
        </button>
        <button onClick={() => onSave(editedItem)} className="w-full py-4 bg-white text-zinc-600 font-bold rounded-2xl border border-zinc-100 flex items-center justify-center gap-3 text-xs active:scale-95 transition-all">
          <Check size={18} /> Voir l'article
        </button>
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="px-1 flex items-center justify-between mb-4 relative min-h-[48px]">
        <button onClick={onCancel} className="w-8 h-8 bg-white border border-zinc-200 text-zinc-600 rounded-full shadow-sm flex items-center justify-center hover:bg-zinc-50 active:scale-95 transition-all z-10">
          <ChevronLeft size={18} />
        </button>
        
        <div className="absolute left-0 right-0 flex flex-col items-center pointer-events-none">
          <h2 className="text-2xl font-bold text-gray-800">Modifier l'article</h2>
        </div>
        
        <div className="flex items-center gap-2 z-10">
          {onDelete && (
            <button 
              onClick={() => setShowDeleteConfirm(true)} 
              className="w-8 h-8 bg-white border border-zinc-200 text-red-500 rounded-full shadow-sm flex items-center justify-center hover:bg-red-50 active:scale-95 transition-all"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button 
            onClick={handleSave} 
            className="w-8 h-8 bg-blue-600 text-white rounded-full shadow-sm flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Check size={16} />
          </button>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 shadow-sm bg-blue-50 text-blue-600 border border-blue-100">
          <span>#{editedItem.sku}</span>
        </div>
        
        {isCommandFlow ? (
            <div className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 shadow-sm ${getTransportBadgeStyles(editedItem.transport)}`}>
              <Truck size={14} />
              {editedItem.transport || 'Transport Inconnu'}
            </div>
        ) : (
          <div className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 shadow-sm ${getVendorBadgeStyles(editedItem.vendor)}`}>
            <Store size={14} />
            {editedItem.vendor || 'Vinted'}
          </div>
        )}

        <div className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 shadow-sm ${badgeConfig.styles}`}>
          {badgeConfig.icon}
          {badgeConfig.label}
        </div>
      </div>

      {error && <div className="max-w-md mx-auto mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold text-center border border-red-100">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image & Description */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-[32px] shadow-sm border border-zinc-100 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Camera size={14} /> Photos ({allPhotos.length})
              </h3>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isOptimizing}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold hover:bg-blue-100 transition-colors"
              >
                {isOptimizing ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Ajouter
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {allPhotos.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-transparent transition-all group">
                  <img 
                    src={img} 
                    className="w-full h-full object-cover" 
                    alt="" 
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    {idx > 0 && (
                      <button onClick={(e) => { e.stopPropagation(); handleMoveImage(idx, -1); }} className="bg-white/90 text-zinc-900 p-1 rounded-full shadow-sm hover:bg-white transition-colors">
                        <ChevronLeft size={12} />
                      </button>
                    )}
                    {idx < allPhotos.length - 1 && (
                      <button onClick={(e) => { e.stopPropagation(); handleMoveImage(idx, 1); }} className="bg-white/90 text-zinc-900 p-1 rounded-full shadow-sm hover:bg-white transition-colors">
                        <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }} 
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-sm hover:bg-red-600 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              {allPhotos.length === 0 && (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-zinc-300 border-2 border-dashed border-zinc-100 rounded-3xl">
                  <ImageOff size={48} strokeWidth={1} />
                  <p className="text-[10px] font-bold mt-4">Aucune photo</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-indigo-50/30 p-3 rounded-[32px] shadow-sm border border-indigo-100 relative group">
            <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2 text-indigo-400 font-bold text-[10px]"><FileText size={16} /> Description</div>
            </div>
            <div className="bg-white p-3 rounded-3xl border border-indigo-100/50">
               <textarea 
                 value={editedItem.description || ""} 
                 onChange={(e) => setEditedItem({...editedItem, description: e.target.value})} 
                 className="w-full bg-transparent text-zinc-900 font-sans text-sm outline-none resize-none min-h-[140px] leading-relaxed" 
                 placeholder="Détails de l'article pour Vinted..."
               />
            </div>
          </div>
        </div>

        {/* Right Column: Details & Finance */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-blue-50/30 p-4 rounded-[32px] shadow-sm border border-blue-100 space-y-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-[10px]"><Tag size={14} /> Titre de l'annonce</div>
                </div>
                <textarea 
                  value={editedItem.headline} 
                  onChange={(e) => setEditedItem({...editedItem, headline: e.target.value})} 
                  className="w-full px-4 py-3 bg-white text-zinc-900 rounded-2xl font-bold text-lg outline-none focus:ring-2 focus:ring-blue-100 transition-all min-h-[60px] resize-none border border-blue-100/50 shadow-sm" 
                />
              </div>
            </div>
            
            <div className="bg-white rounded-3xl border border-blue-100/50 p-4 space-y-4">
              {/* Brand */}
              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Marque</label>
                {isAddingCustomBrand ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      autoFocus 
                      value={customBrandName} 
                      onChange={(e) => setCustomBrandName(e.target.value)} 
                      className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded-xl font-bold text-sm outline-none" 
                      placeholder="Nom..." 
                    />
                    <button onClick={() => { 
                        if (customBrandName.trim()) { 
                          const updated = [...customBrandsList, customBrandName.trim()]; 
                          setCustomBrandsList(updated); 
                          localStorage.setItem('vinted_custom_brands', JSON.stringify(updated)); 
                          setEditedItem({ ...editedItem, brand: customBrandName.trim() }); 
                          setCustomBrandName(""); 
                          setIsAddingCustomBrand(false); 
                        } 
                      }} className="p-2 bg-blue-600 text-white rounded-xl"><Check size={16} /></button>
                    <button onClick={() => setIsAddingCustomBrand(false)} className="p-2 bg-zinc-200 text-zinc-500 rounded-xl"><X size={16} /></button>
                  </div>
                ) : (
                  <select 
                    value={allBrands.includes(editedItem.brand) ? editedItem.brand : ""} 
                    onChange={(e) => e.target.value === "ADD_NEW" ? setIsAddingCustomBrand(true) : setEditedItem({ ...editedItem, brand: e.target.value })} 
                    className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl font-bold text-sm outline-none appearance-none"
                  >
                    <option value=""></option>
                    {allBrands.map(b => <option key={b} value={b}>{b}</option>)}
                    <option value="ADD_NEW">+ Nouvelle marque...</option>
                  </select>
                )}
              </div>

              {/* Size & Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Taille</label>
                  <select value={editedItem.size} onChange={(e) => setEditedItem({...editedItem, size: e.target.value})} className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl font-bold text-sm outline-none appearance-none">
                    <option value=""></option>
                    {availableSizes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Coloris</label>
                  <select value={editedItem.color} onChange={(e) => setEditedItem({...editedItem, color: e.target.value})} className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl font-bold text-sm outline-none appearance-none">
                    <option value=""></option>
                    {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">État de l'article</label>
                <select value={editedItem.condition || ""} onChange={(e) => setEditedItem({...editedItem, condition: e.target.value})} className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl font-bold text-sm outline-none appearance-none">
                  <option value=""></option>
                  <option value="Neuf avec étiquette">Neuf avec étiquette</option>
                  <option value="Neuf sans étiquette">Neuf sans étiquette</option>
                  <option value="Très bon état">Très bon état</option>
                  <option value="Bon état">Bon état</option>
                  <option value="Satisfaisant">Satisfaisant</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Catégorie</label>
                {renderCategorySelectors()}
              </div>

              {/* Status & Vendor */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-200/50">
                 <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Statut</label>
                    <select 
                      value={editedItem.vintedStatus} 
                      onChange={(e) => setEditedItem({...editedItem, vintedStatus: e.target.value as any})}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-bold text-xs outline-none appearance-none"
                    >
                      {VINTED_STATUS_OPTIONS.map(status => (
                        <option key={status} value={status}>{VINTED_STATUS_LABELS[status] || status}</option>
                      ))}
                    </select>
                 </div>
                 <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Vendeur</label>
                    <select 
                      value={editedItem.vendor} 
                      onChange={(e) => setEditedItem({...editedItem, vendor: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl font-bold text-xs outline-none appearance-none"
                    >
                      {VENDOR_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                 </div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50/30 p-4 rounded-[32px] shadow-sm border border-emerald-100 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-emerald-600/70 flex items-center gap-2"><Banknote size={16} className="text-emerald-600" /> Analyse Financière</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-emerald-100/50 flex flex-col items-center text-center">
                <span className="text-[9px] font-bold text-zinc-400 uppercase mb-1.5">Achat</span>
                <input type="text" inputMode="decimal" value={purchasePriceStr} onChange={(e) => setPurchasePriceStr(e.target.value)} className="w-full text-center font-bold text-sm outline-none bg-transparent" />
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-emerald-100/50 flex flex-col items-center text-center">
                <span className="text-[9px] font-bold text-zinc-400 uppercase mb-1.5">Livraison</span>
                <input type="text" inputMode="decimal" value={shippingFeesStr} onChange={(e) => setShippingFeesStr(e.target.value)} className="w-full text-center font-bold text-sm outline-none bg-transparent" />
              </div>
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-emerald-100/50 flex flex-col items-center text-center">
                <span className="text-[9px] font-bold text-zinc-400 uppercase mb-1.5">Taxes</span>
                <input type="text" inputMode="decimal" value={taxesStr} onChange={(e) => setTaxesStr(e.target.value)} className="w-full text-center font-bold text-sm outline-none bg-transparent" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-600 p-5 rounded-3xl shadow-lg shadow-blue-100 text-white">
                 <p className="text-[9px] font-bold text-blue-200 mb-1.5">Prix Estimé</p>
                 <div className="flex items-center gap-1">
                   <input type="text" inputMode="decimal" value={estPriceStr} onChange={(e) => setEstPriceStr(e.target.value)} className="bg-transparent text-2xl font-bold outline-none w-full text-white placeholder-blue-300" />
                   <span className="text-xl">€</span>
                 </div>
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-zinc-200 text-zinc-900">
                 <p className="text-[9px] font-bold text-zinc-400 mb-1.5">Coût Total</p>
                 <div className="flex items-center gap-1">
                   <span className="text-2xl font-bold">{(parseToNumber(purchasePriceStr) + parseToNumber(shippingFeesStr) + parseToNumber(taxesStr)).toFixed(2)}</span>
                   <span className="text-xl">€</span>
                 </div>
              </div>
            </div>

            {editedItem.articleStatus === 'Vendu' && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-100/50">
                <div className="bg-emerald-600 p-5 rounded-3xl shadow-lg shadow-emerald-100 text-white">
                   <p className="text-[9px] font-bold text-emerald-200 mb-1.5">Prix de Vente Final</p>
                   <div className="flex items-center gap-1">
                     <input type="text" inputMode="decimal" value={soldPriceStr} onChange={(e) => setSoldPriceStr(e.target.value)} className="bg-transparent text-2xl font-bold outline-none w-full text-white placeholder-emerald-300" />
                     <span className="text-xl">€</span>
                   </div>
                </div>
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-zinc-200 text-zinc-900">
                   <p className="text-[9px] font-bold text-zinc-400 mb-1.5">Date de Vente</p>
                   <div className="flex items-center gap-1 h-full">
                     <input type="date" value={soldDateStr} onChange={(e) => setSoldDateStr(e.target.value)} className="bg-transparent text-sm font-bold outline-none w-full text-zinc-900" />
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal de Suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => !isDeleting && setShowDeleteConfirm(false)} />
           <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center animate-in zoom-in duration-300">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 animate-bounce">
                 <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Supprimer l'article ?</h3>
              <p className="text-gray-400 text-xs font-bold mb-8 leading-relaxed">
                Cette action est irréversible. L'article <b>#{item.sku}</b> sera retiré définitivement.
              </p>
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-red-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 size={18} className="animate-spin" /> : "Confirmer la suppression"}
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
                >
                  Annuler
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const StatusBubble: React.FC<{ 
  label: string, 
  icon: React.ReactNode, 
  isActive: boolean, 
  onClick: () => void,
  activeClass: string
}> = ({ label, icon, isActive, onClick, activeClass }) => (
  <button 
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all duration-300 relative group active:scale-95 ${
      isActive ? `${activeClass} shadow-sm` : `bg-zinc-50 text-zinc-400 border-transparent hover:bg-zinc-100`
    }`}
  >
    <div className={`mb-1 transition-colors ${isActive ? 'text-white' : 'text-zinc-300'}`}>{icon}</div>
    <span className={`text-[8px] font-bold ${isActive ? 'text-white' : 'text-zinc-400'}`}>{label}</span>
    {isActive && (
      <div className="absolute -top-1 -right-1 bg-white rounded-full text-blue-600 border border-blue-600 shadow-sm flex items-center justify-center p-0.5">
        <CheckCircle2 size={8} className="fill-current text-white" />
      </div>
    )}
  </button>
);
