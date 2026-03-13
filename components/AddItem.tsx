import React, { useState, useRef, useMemo, useEffect } from 'react';
import { analyzeProductImages } from '../services/geminiService';
import { saveItem } from '../services/inventoryService';
import { auth } from '../services/firebase';
import { InventoryItem, GeminiAnalysis } from '../types';
import { 
  COLORS, POPULAR_BRANDS, SIZE_MAP, CATEGORY_TREE, ARTICLE_STATUS_OPTIONS, VINTED_STATUS_OPTIONS, formatDateToDDMMYYYY 
, VINTED_MATERIALS } from '../constants';
import { Upload, Sparkles, Check, X, RefreshCcw, Camera, ChevronRight, ChevronLeft, AlertCircle, ReceiptText, Truck, Loader2, CheckCircle2, Layers, Euro, CreditCard, Store, Plus, FileText, Package, Save, AlignLeft } from 'lucide-react';

interface AddItemProps {
  onSave: (item: InventoryItem, stayOnPage?: boolean) => void;
  onCancel: () => void;
  onGoToStock: () => void;
  nextSku: string;
}

type Step = 'photos' | 'confirmation' | 'finances' | 'saving' | 'success';

const optimizeImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
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
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
  });
};

export const AddItem: React.FC<AddItemProps> = ({ onSave, onCancel, onGoToStock, nextSku }) => {
  const [step, setStep] = useState<Step>('photos');
  const [images, setImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
  const [isAddingCustomBrand, setIsAddingCustomBrand] = useState(false);
  const [customBrandName, setCustomBrandName] = useState("");
  const [customBrandsList, setCustomBrandsList] = useState<string[]>([]);
  
  const [articleStatus, setArticleStatus] = useState<'En stock' | 'À traiter' | 'À envoyer' | 'Expédié'>('En stock');
  const [vintedStatus, setVintedStatus] = useState<'Publie' | 'Apublier' | 'Arepublier' | 'Enattente'>('Apublier');
  
  const [estPriceStr, setEstPriceStr] = useState<string>("");
  const [purchasePriceStr, setPurchasePriceStr] = useState<string>("");
  const [shippingFeesStr, setShippingFeesStr] = useState<string>("");
  const [taxesStr, setTaxesStr] = useState<string>("");
  const [catLevels, setCatLevels] = useState<string[]>([]);
  const [vendor, setVendor] = useState<string>('Vinted');
  const [error, setError] = useState<string | null>(null);
  const [lastSavedItem, setLastSavedItem] = useState<InventoryItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [step]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vinted_custom_brands');
      if (saved) setCustomBrandsList(JSON.parse(saved));
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (analysis?.category) {
      let parts = analysis.category.split(' - ').map(p => p.trim());
      if (parts[0]?.toLowerCase() === 'homme') parts[0] = 'Hommes';
      if (parts[0]?.toLowerCase() === 'femme') parts[0] = 'Femmes';
      if (parts[0]?.toLowerCase() === 'enfant') parts[0] = 'Enfants';
      setCatLevels(parts);
    }
    if (analysis?.estimatedPrice !== undefined) setEstPriceStr(analysis.estimatedPrice.toString());
  }, [analysis]);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const draftStr = localStorage.getItem('vinted_add_item_draft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft.step && draft.step !== 'success' && draft.step !== 'saving') {
          setStep(draft.step);
          if (draft.images !== undefined) setImages(draft.images);
          if (draft.analysis !== undefined) setAnalysis(draft.analysis);
          if (draft.articleStatus !== undefined) setArticleStatus(draft.articleStatus);
          if (draft.vintedStatus !== undefined) setVintedStatus(draft.vintedStatus);
          if (draft.estPriceStr !== undefined) setEstPriceStr(draft.estPriceStr);
          if (draft.purchasePriceStr !== undefined) setPurchasePriceStr(draft.purchasePriceStr);
          if (draft.shippingFeesStr !== undefined) setShippingFeesStr(draft.shippingFeesStr);
          if (draft.taxesStr !== undefined) setTaxesStr(draft.taxesStr);
          if (draft.catLevels !== undefined) setCatLevels(draft.catLevels);
          if (draft.vendor !== undefined) setVendor(draft.vendor);
        }
      }
    } catch (e) {
      console.error("Failed to load draft", e);
    }
  }, []);

  // Save draft to localStorage when state changes
  useEffect(() => {
    if (step === 'success' || step === 'saving') return;
    try {
      const draft = {
        step,
        images,
        analysis,
        articleStatus,
        vintedStatus,
        estPriceStr,
        purchasePriceStr,
        shippingFeesStr,
        taxesStr,
        catLevels,
        vendor
      };
      localStorage.setItem('vinted_add_item_draft', JSON.stringify(draft));
    } catch (e) {
      console.error("Failed to save draft", e);
      // If quota exceeded, try saving without images
      try {
        const draftWithoutImages = {
          step,
          images: [],
          analysis,
          articleStatus,
          vintedStatus,
          estPriceStr,
          purchasePriceStr,
          shippingFeesStr,
          taxesStr,
          catLevels,
          vendor
        };
        localStorage.setItem('vinted_add_item_draft', JSON.stringify(draftWithoutImages));
      } catch (e2) {
        console.error("Failed to save draft even without images", e2);
      }
    }
  }, [step, images, analysis, articleStatus, vintedStatus, estPriceStr, purchasePriceStr, shippingFeesStr, taxesStr, catLevels, vendor]);

  const allBrands = useMemo(() => Array.from(new Set([...POPULAR_BRANDS, ...customBrandsList])).sort(), [customBrandsList]);

  const parseToNumber = (val: string): number => {
    if (!val) return 0;
    const cleaned = val.replace(/[^0-9.,]/g, '').replace(',', '.');
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
      const optimized = await Promise.all(files.map(file => optimizeImage(file)));
      setImages(prev => [...prev, ...optimized]);
    } catch (err) { setError("Erreur photos."); }
    finally { setIsOptimizing(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleMoveImage = (idx: number, direction: number) => {
    setImages(prev => {
      const newImages = [...prev];
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= newImages.length) return prev;
      
      const temp = newImages[idx];
      newImages[idx] = newImages[targetIdx];
      newImages[targetIdx] = temp;
      return newImages;
    });
  };

  const handleAnalyze = async () => {
    if (images.length === 0) {
      // If no images, just skip to confirmation with empty analysis
      setAnalysis({
        headline: "",
        description: "",
        brand: "",
        size: "",
        color: "",
        condition: "Très bon état",
        material: "",
        category: "",
        PriceEstimated: 0
      });
      setStep('confirmation');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeProductImages(images, nextSku);
      if (!result.condition) {
        result.condition = "Très bon état";
      }
      if (!result.material) {
        result.material = "Autre";
      }
      setAnalysis(result);
      setStep('confirmation');
    } catch (err: any) { setError(err.message || "Erreur IA."); }
    finally { setIsAnalyzing(false); }
  };

  const handleSaveFinal = async () => {
    if (!analysis || step === 'saving') return;
    setStep('saving');
    setError(null);
    
    const finalCategory = catLevels.filter(Boolean).join(' - ');
    const cleanSku = String(nextSku).replace(/['#]/g, "").trim().padStart(4, '0');
    
    try {
      const { uploadImageToStorage } = await import('../services/storageService');
      const uploadedUrls: string[] = [];
      const uid = auth.currentUser?.uid || '';
      
      if (!uid) {
        setError("Utilisateur non authentifié.");
        setStep('finances');
        return;
      }
      
      for (let i = 0; i < images.length; i++) {
        try {
          const url = await uploadImageToStorage(uid, cleanSku, images[i], i);
          uploadedUrls.push(url);
        } catch (uploadErr) {
          console.error(`Failed to upload image ${i}:`, uploadErr);
        }
      }

      // Génère la vignette depuis la première photo locale (base64 disponible avant upload)
      const { generateThumbnail } = await import('../services/thumbnail');
      const thumbnail = images[0] ? await generateThumbnail(images[0]) : '';

      const newItem: InventoryItem = {
        userId: auth.currentUser?.uid || '',
        sku: cleanSku,
        headline: analysis.headline,
        description: analysis.description,
        brand: analysis.brand,
        size: analysis.size,
        color: analysis.color,
        category: finalCategory,
        categoryLevels: catLevels.filter(Boolean),
        condition: analysis.condition,
        material: analysis.material,
        PriceEstimated: parseToNumber(estPriceStr),
        PricePurchase: parseToNumber(purchasePriceStr),
        PriceTransport: parseToNumber(shippingFeesStr),
        PriceTaxes: parseToNumber(taxesStr),
        PriceSold: 0,
        vendor: vendor,
        articleStatus: articleStatus as any,
        vintedStatus: vintedStatus as any,
        images: [],
        Images: uploadedUrls,
        thumbnail,
        date: formatDateToDDMMYYYY(),
        isSold: false,
      };

      // 2. Save to Firestore
      await saveItem(newItem.userId, newItem);
      
      setImages([]); 
      setLastSavedItem(newItem);
      setStep('success');
      localStorage.removeItem('vinted_add_item_draft');
      onSave(newItem, true); 
    } catch (err) {
      console.error(err);
      setError("Erreur enregistrement.");
      setStep('finances');
    }
  };

  const resetForm = () => {
    setStep('photos'); setImages([]); setAnalysis(null); setCatLevels([]);
    setEstPriceStr(""); setPurchasePriceStr(""); setShippingFeesStr("");
    setTaxesStr(""); setError(null); setLastSavedItem(null);
    setArticleStatus('En stock'); setVintedStatus('À publier');
    setVendor('Vinted');
    localStorage.removeItem('vinted_add_item_draft');
  };

  const renderPhotoStep = () => (
    <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative">
        {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-xs font-bold"><AlertCircle size={20} />{error}</div>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {images.map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden shadow-sm group">
              <img src={img} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {idx > 0 && (
                  <button onClick={() => handleMoveImage(idx, -1)} className="bg-white/90 text-zinc-900 p-1 rounded-full shadow-sm hover:bg-white transition-colors">
                    <ChevronLeft size={12} />
                  </button>
                )}
                {idx < images.length - 1 && (
                  <button onClick={() => handleMoveImage(idx, 1)} className="bg-white/90 text-zinc-900 p-1 rounded-full shadow-sm hover:bg-white transition-colors">
                    <ChevronRight size={12} />
                  </button>
                )}
              </div>
              <button onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"><X size={12} /></button>
            </div>
          ))}
          <button onClick={() => fileInputRef.current?.click()} className={`aspect-square border-2 border-dashed border-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-400 ${isOptimizing ? 'animate-pulse' : ''}`}>
            {isOptimizing ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} className="mb-2" />}
            <span className="text-[9px] font-bold">{isOptimizing ? 'Optimisation...' : 'Ajouter'}</span>
          </button>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || isOptimizing} 
            className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-base ${isAnalyzing || isOptimizing ? 'bg-zinc-100 text-zinc-400' : 'bg-blue-600 text-white shadow-lg shadow-blue-200'}`}
          >
            {isAnalyzing ? <><RefreshCcw size={20} className="animate-spin" /> Analyse...</> : images.length > 0 ? <><Sparkles size={20} /> Analyser avec Gemini</> : <><Plus size={20} /> Saisir manuellement</>}
          </button>
        </div>
      </div>
    </div>
  );

  const renderSavingStep = () => (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center pt-32 min-h-[50vh] animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-900 mb-8">
        <Loader2 size={40} className="animate-spin" />
      </div>
      <h2 className="text-3xl font-bold text-zinc-900 mb-2">Sauvegarde...</h2>
      <p className="text-zinc-400 font-bold text-[10px]">Synchronisation avec le cloud</p>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center pt-24 min-h-[60vh] animate-in zoom-in duration-500 px-6">
      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-8">
        <CheckCircle2 size={40} strokeWidth={2} />
      </div>
      <div className="text-center space-y-2 mb-12">
        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">C'est en ligne !</h2>
        <p className="text-zinc-400 font-bold text-[10px]">Article #{lastSavedItem?.sku} enregistré</p>
      </div>
      <div className="w-full flex flex-col gap-3">
        <button onClick={onGoToStock} className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-3 text-xs shadow-lg shadow-blue-100">
          <Store size={18} /> Stock
        </button>
        <button onClick={resetForm} className="w-full py-4 bg-white text-zinc-600 font-bold rounded-2xl border border-zinc-200 flex items-center justify-center gap-3 text-xs">
          <Plus size={18} /> Nouvel Article
        </button>
      </div>
    </div>
  );

  const renderCategorySelectors = () => {
    const selectors = [];
    let currentOptions = CATEGORY_TREE;
    selectors.push(
      <select key="level-0" value={catLevels[0] || ""} onChange={(e) => {
          const newLevels = [e.target.value]; setCatLevels(newLevels);
          if (analysis) setAnalysis({ ...analysis, category: newLevels.join(' - ') });
        }}
        className="w-full px-4 py-3 bg-[#EEF2F6] border-none rounded-2xl font-black text-gray-700 outline-none appearance-none cursor-pointer shadow-sm">
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
            <select key={`level-${i + 1}`} value={catLevels[i + 1] || ""} onChange={(e) => {
                const newLevels = [...catLevels.slice(0, i + 1), e.target.value];
                setCatLevels(newLevels);
                if (analysis) setAnalysis({ ...analysis, category: newLevels.join(' - ') });
              }}
              className="w-full px-4 py-3 bg-[#EEF2F6] border-none rounded-2xl font-black text-gray-700 outline-none appearance-none cursor-pointer shadow-sm">
              <option value=""></option>
              {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          );
        }
      }
    }
    return <div className="flex flex-col gap-3">{selectors}</div>;
  };

  const renderConfirmationStep = () => {
    if (!analysis) return null;
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-500">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          {/* Image Preview in Confirmation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Photos ({images.length})</label>
              <button 
                onClick={() => setStep('photos')}
                className="text-[10px] font-bold text-blue-600 hover:underline"
              >
                Modifier les photos
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 shadow-sm border border-slate-100">
                  <img src={img} className="w-full h-full object-cover" alt="" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Titre de l'annonce</label>
            <textarea value={analysis.headline} onChange={(e) => setAnalysis({...analysis, headline: e.target.value})} 
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all shadow-sm min-h-[60px] outline-none" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1 flex items-center gap-2">
              <AlignLeft size={12} /> Description
            </label>
            <textarea 
              value={analysis.description || ""} 
              onChange={(e) => setAnalysis({...analysis, description: e.target.value})} 
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all shadow-sm min-h-[120px] outline-none leading-relaxed" 
              placeholder="Détails de l'article pour Vinted..."
            />
          </div>

          <div className="pb-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Marque</label>
            {isAddingCustomBrand ? (
              <div className="flex items-center gap-2">
                <input type="text" autoFocus value={customBrandName} onChange={(e) => setCustomBrandName(e.target.value)} 
                  className="flex-1 px-0 py-2 bg-transparent border-b border-blue-600 font-bold text-base text-slate-800 outline-none" placeholder="Marque..." />
                <button onClick={() => { if (customBrandName.trim()) { const updated = [...customBrandsList, customBrandName.trim()]; setCustomBrandsList(updated); localStorage.setItem('vinted_custom_brands', JSON.stringify(updated)); if (analysis) setAnalysis({ ...analysis, brand: customBrandName.trim() }); setCustomBrandName(""); setIsAddingCustomBrand(false); } }} className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center"><Check size={16} /></button>
                <button onClick={() => setIsAddingCustomBrand(false)} className="w-8 h-8 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center"><X size={16} /></button>
              </div>
            ) : (
              <div className="relative border-b border-slate-100">
                <select value={allBrands.includes(analysis.brand) ? analysis.brand : ""} onChange={(e) => e.target.value === "ADD_NEW" ? setIsAddingCustomBrand(true) : setAnalysis({ ...analysis, brand: e.target.value })} 
                  className="w-full px-0 py-2 bg-transparent font-bold text-base text-slate-800 outline-none appearance-none cursor-pointer">
                  <option value=""></option>
                  {allBrands.map(b => <option key={b} value={b}>{b}</option>)}
                  <option value="ADD_NEW" className="text-blue-600 font-bold">+ Nouvelle marque...</option>
                </select>
                <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 rotate-90 text-slate-300 pointer-events-none" size={16} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Couleur</label>
              <div className="relative">
                <select value={analysis.color} onChange={(e) => setAnalysis({...analysis, color: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-xs text-slate-800 appearance-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all shadow-sm">
                  <option value=""></option>
                  {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Taille</label>
              <div className="relative">
                <select value={analysis.size} onChange={(e) => setAnalysis({...analysis, size: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-xs text-slate-800 appearance-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all shadow-sm">
                  <option value=""></option>
                  {availableSizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">État de l'article</label>
            <div className="relative">
              <select value={analysis.condition || ""} onChange={(e) => setAnalysis({...analysis, condition: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-xs text-slate-800 appearance-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all shadow-sm">
                <option value=""></option>
                <option value="Neuf avec étiquette">Neuf avec étiquette</option>
                <option value="Neuf sans étiquette">Neuf sans étiquette</option>
                <option value="Très bon état">Très bon état</option>
                <option value="Bon état">Bon état</option>
                <option value="Satisfaisant">Satisfaisant</option>
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Matière principale</label>
            <div className="relative">
              <select value={analysis.material || ""} onChange={(e) => setAnalysis({...analysis, material: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold text-xs text-slate-800 appearance-none outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all shadow-sm">
                <option value=""></option>
                {VINTED_MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-50 space-y-4">
            <div className="bg-blue-50/20 p-4 rounded-2xl border border-blue-50 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-wider ml-1"><Layers size={14} /> Catégories</div>
              {renderCategorySelectors()}
            </div>

            <div className="space-y-2 px-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Choix du Vendeur</label>
              <div className="grid grid-cols-2 gap-2 max-w-sm">
                <button 
                  type="button"
                  onClick={() => setVendor('Vinted')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[10px] transition-all border ${
                    vendor === 'Vinted' 
                    ? 'bg-[#09B1BA] border-[#09B1BA] text-white shadow-sm' 
                    : 'bg-white border-slate-100 text-slate-400'
                  }`}
                >
                  <Store size={12} /> VINTED
                </button>
                <button 
                  type="button"
                  onClick={() => setVendor('Whatnot')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[10px] transition-all border ${
                    vendor === 'Whatnot' 
                    ? 'bg-[#F5D211] border-[#F5D211] text-slate-900 shadow-sm' 
                    : 'bg-white border-slate-100 text-slate-400'
                  }`}
                >
                  <Store size={12} /> WHATNOT
                </button>
              </div>
            </div>
          </div>
          <div className="pt-2 flex gap-3">
            <button onClick={() => setStep('photos')} className="flex-1 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Retour</button>
            <button onClick={() => setStep('finances')} className="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 uppercase tracking-wider text-xs">Suivant <ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    );
  };

  const renderFinancesStep = () => {
    if (!analysis) return null;
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-500">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Prix de revente</label>
              <div className="relative w-full">
                <input type="text" inputMode="decimal" value={estPriceStr} onChange={(e) => setEstPriceStr(e.target.value)} className="w-full py-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xl font-bold text-blue-600 text-center outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-blue-200">€</span>
              </div>
            </div>
            <div className="text-center">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Coût Total</label>
              <div className="w-full py-3 bg-slate-50 border border-slate-100 rounded-xl text-xl font-bold text-slate-700 text-center flex items-center justify-center h-[54px]">
                {(parseToNumber(purchasePriceStr) + parseToNumber(shippingFeesStr) + parseToNumber(taxesStr)).toFixed(2)} €
              </div>
            </div>
          </div>
          <div className="space-y-3 max-w-sm mx-auto w-full">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0"><CreditCard size={16} /></div>
              <div className="flex-1">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Prix d'achat</label>
                <input type="text" inputMode="decimal" value={purchasePriceStr} onChange={(e) => setPurchasePriceStr(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg font-bold text-slate-900 outline-none text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0"><Truck size={16} /></div>
              <div className="flex-1">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Livraison</label>
                <input type="text" inputMode="decimal" value={shippingFeesStr} onChange={(e) => setShippingFeesStr(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg font-bold text-slate-900 outline-none text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 shrink-0"><ReceiptText size={16} /></div>
              <div className="flex-1">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Taxes</label>
                <input type="text" inputMode="decimal" value={taxesStr} onChange={(e) => setTaxesStr(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg font-bold text-slate-900 outline-none text-sm" />
              </div>
            </div>
          </div>
          <div className="pt-2 flex gap-3">
            <button onClick={() => setStep('confirmation')} className="flex-1 py-4 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Retour</button>
            <button onClick={handleSaveFinal} className="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 uppercase tracking-wider text-xs"><Save size={18} /> Enregistrer</button>
          </div>
        </div>
      </div>
    );
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'photos', label: 'Photos', icon: <Camera size={16} /> },
      { id: 'confirmation', label: 'Détails', icon: <FileText size={16} /> },
      { id: 'finances', label: 'Finance', icon: <Euro size={16} /> }
    ];

    if (step === 'saving' || step === 'success') return null;

    return (
      <div className="flex justify-center mb-6">
        <div className="flex items-center bg-white rounded-full p-1 border border-zinc-100 shadow-sm">
          {steps.map((s, idx) => {
            const isActive = s.id === step;
            const isCompleted = steps.findIndex(st => st.id === step) > idx;
            
            return (
              <div key={s.id} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-sm' : 
                  isCompleted ? 'text-blue-600' : 'text-zinc-400'
                }`}>
                  {s.icon}
                  <span className="text-[10px] font-bold uppercase">{s.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="w-4 h-px bg-zinc-100 mx-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-12">
      <div className="px-1 flex items-center justify-between mb-6 relative">
        <button onClick={() => {
          localStorage.removeItem('vinted_add_item_draft');
          onCancel();
        }} className="w-8 h-8 bg-white border border-zinc-200 text-zinc-600 rounded-full shadow-sm flex items-center justify-center hover:bg-zinc-50 active:scale-95 transition-all z-10">
          <ChevronLeft size={18} />
        </button>
        
        <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
          <h2 className="text-2xl font-bold text-gray-800">Nouvel Article</h2>
        </div>
        
        <div className="w-8" />
      </div>

      {renderStepIndicator()}
      
      {(step === 'photos' || step === 'confirmation' || step === 'finances') && (
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-full shadow-md transition-transform hover:scale-105">
            <Package size={18} />
            <span className="text-sm font-bold tracking-wide">SKU : #{nextSku}</span>
          </div>
        </div>
      )}

      {step === 'photos' && renderPhotoStep()}
      {step === 'confirmation' && renderConfirmationStep()}
      {step === 'finances' && renderFinancesStep()}
      {step === 'saving' && renderSavingStep()}
      {step === 'success' && renderSuccessStep()}
    </div>
  );
};