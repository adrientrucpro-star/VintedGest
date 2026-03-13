import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { InventoryItem } from '../types';
import { Plus, Globe, Package, RefreshCcw, Loader2, SearchX, Check, Search, Filter, X, ChevronDown, Clock, Save } from 'lucide-react';
import { getOptimizedImageUrl, formatPrice, VINTED_STATUS_OPTIONS, VINTED_STATUS_LABELS, parseDate } from '../constants';
import { LazyImage } from './LazyImage';

interface StockViewProps {
  inventory: InventoryItem[];
  onAddClick: () => void;
  onItemClick: (item: InventoryItem) => void;
  onImageFetch: (sku: string, urls: string[]) => void;
  onBulkUpdate: (skus: string[], updates: Partial<InventoryItem>) => Promise<void>;
  isLoading?: boolean;
}

// Extracted outside component to avoid re-creation on every render
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Publie': case 'Publié': return <Globe size={12} className="text-white" />;
    case 'Apublier': case 'À publier': return <Package size={12} className="text-white" />;
    case 'Arepublier': case 'À republier': return <RefreshCcw size={12} className="text-white" />;
    case 'Enattente': case 'En attente': return <Clock size={12} className="text-white" />;
    case 'Vendu': return <Check size={12} className="text-white" strokeWidth={3} />;
    default: return null;
  }
};

const getStatusBg = (status: string) => {
  switch (status) {
    case 'Publie': case 'Publié': case 'Vendu': return 'bg-emerald-500';
    case 'Apublier': case 'À publier': return 'bg-orange-500';
    case 'Arepublier': case 'À republier': return 'bg-amber-500';
    case 'Enattente': case 'En attente': return 'bg-zinc-500';
    default: return 'bg-zinc-400';
  }
};

const StockItemCard = React.memo(({ item, onClick, isSelectionMode, isSelected, onToggleSelect, onUpdatePrice }: {
  item: InventoryItem;
  onClick: (item: InventoryItem) => void;
  onImageFetch: (sku: string, urls: string[]) => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (sku: string) => void;
  onUpdatePrice: (sku: string, price: number) => void;
}) => {
  const image = item.images?.[0] || item.Images?.[0];
  const totalCost = (item.PricePurchase || 0) + (item.PriceTransport || 0) + (item.PriceTaxes || 0);
  const [tempPrice, setTempPrice] = useState(item.PriceEstimated?.toString() || '');
  const vStatus = (item.vintedStatus || 'Apublier') as string;

  useEffect(() => { setTempPrice(item.PriceEstimated?.toString() || ''); }, [item.PriceEstimated]);

  const handlePriceSubmit = useCallback(() => {
    const newPrice = parseFloat(tempPrice.replace(',', '.'));
    if (!isNaN(newPrice) && newPrice !== item.PriceEstimated) onUpdatePrice(item.sku, newPrice);
    else setTempPrice(item.PriceEstimated?.toString() || '');
  }, [tempPrice, item.PriceEstimated, item.sku, onUpdatePrice]);

  const handleCardClick = useCallback(() => {
    if (isSelectionMode) onToggleSelect(item.sku);
    else onClick(item);
  }, [isSelectionMode, item, onClick, onToggleSelect]);

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white p-3 rounded-2xl border flex flex-col gap-2 cursor-pointer active:scale-[0.98] relative transition-shadow ${
        isSelected ? 'border-blue-500 shadow-md ring-2 ring-blue-50' : 'border-zinc-100 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="aspect-square w-full rounded-xl overflow-hidden bg-zinc-50 flex items-center justify-center relative">
        <LazyImage src={image} thumbnail={item.thumbnail} />
        <div className="absolute top-2 left-2 z-20 flex gap-1.5">
          {isSelectionMode && (
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
              isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white/80 border-zinc-300'
            }`}>
              {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
            </div>
          )}
          <div className="bg-blue-600/90 h-5 px-1.5 rounded-md flex items-center justify-center">
            <span className="text-xs font-bold text-white tracking-wider">#{item.sku}</span>
          </div>
        </div>
        <div className={`absolute top-2 right-2 ${getStatusBg(vStatus)} h-5 w-5 rounded-md shadow-sm flex items-center justify-center`}>
          {getStatusIcon(vStatus)}
        </div>
      </div>

      <div className="px-0.5">
        <div className="flex items-center justify-between h-[34px]">
          <div className="flex flex-col justify-center">
            <span className="text-[9px] font-bold text-zinc-400 leading-tight">Achat</span>
            <span className="text-xs font-bold text-zinc-900 leading-tight">{formatPrice(totalCost)}€</span>
          </div>
          <div className="flex flex-col items-end justify-center">
            {!isSelectionMode && <span className="text-[9px] font-bold text-zinc-400 leading-tight">Est.</span>}
            {isSelectionMode ? (
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={tempPrice}
                  onChange={e => setTempPrice(e.target.value)}
                  onBlur={handlePriceSubmit}
                  onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                  className="w-16 h-[26px] px-2 bg-white border border-zinc-200 focus:border-blue-300 rounded-md text-[16px] font-bold text-blue-600 outline-none text-right transition-colors shadow-sm"
                />
                <span className="text-[12px] font-bold text-blue-600">€</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-blue-600 leading-tight">{formatPrice(item.PriceEstimated)}€</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

StockItemCard.displayName = 'StockItemCard';

export const StockView: React.FC<StockViewProps> = ({ inventory, onAddClick, onItemClick, onImageFetch, onBulkUpdate, isLoading }) => {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [saveDefaultSuccess, setSaveDefaultSuccess] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'date_desc' | 'date_asc' | 'price_desc' | 'price_asc' | 'sku_asc' | 'sku_desc'>('date_desc');

  // Load saved filters once on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('vinted_stock_filters') || '{}');
      if (saved.selectedStatuses) {
        setSelectedStatuses(saved.selectedStatuses.map((s: string) => ({
          'Publié': 'Publie', 'À publier': 'Apublier', 'À republier': 'Arepublier', 'En attente': 'Enattente'
        }[s] || s)));
      }
      if (saved.selectedBrand) setSelectedBrand(saved.selectedBrand);
      if (saved.sortOrder) setSortOrder(saved.sortOrder);
    } catch {}
  }, []);

  const saveAsDefault = useCallback(() => {
    localStorage.setItem('vinted_stock_filters', JSON.stringify({ selectedStatuses, selectedBrand, sortOrder }));
    setSaveDefaultSuccess(true);
    setTimeout(() => setSaveDefaultSuccess(false), 2000);
  }, [selectedStatuses, selectedBrand, sortOrder]);

  const toggleSelect = useCallback((sku: string) =>
    setSelectedSkus(prev => prev.includes(sku) ? prev.filter(s => s !== sku) : [...prev, sku]), []);

  const toggleStatus = useCallback((status: string) =>
    setSelectedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]), []);

  const uniqueBrands = useMemo(() =>
    Array.from(new Set(inventory.map(i => i.brand).filter(Boolean))).sort(), [inventory]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return inventory
      .filter(item => {
        if (selectedStatuses.length && !selectedStatuses.includes(item.vintedStatus)) return false;
        if (selectedBrand !== 'all' && item.brand !== selectedBrand) return false;
        if (q && !item.headline?.toLowerCase().includes(q) && !item.sku?.toLowerCase().includes(q) && !item.brand?.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sortOrder) {
          case 'date_asc': return parseDate(a.date) - parseDate(b.date);
          case 'date_desc': return parseDate(b.date) - parseDate(a.date);
          case 'price_asc': return (a.PriceEstimated || 0) - (b.PriceEstimated || 0);
          case 'price_desc': return (b.PriceEstimated || 0) - (a.PriceEstimated || 0);
          case 'sku_asc': return (a.sku || '').localeCompare(b.sku || '');
          case 'sku_desc': return (b.sku || '').localeCompare(a.sku || '');
          default: return parseDate(b.date) - parseDate(a.date);
        }
      });
  }, [inventory, selectedStatuses, searchQuery, selectedBrand, sortOrder]);

  const handleUpdatePrice = useCallback((sku: string, price: number) => {
    onBulkUpdate([sku], { PriceEstimated: price });
  }, [onBulkUpdate]);

  const handleBulkApply = useCallback(async () => {
    if (!bulkStatus || selectedSkus.length === 0) return;
    setIsBulkUpdating(true);
    try {
      await Promise.all(selectedSkus.map(sku => onBulkUpdate([sku], { vintedStatus: bulkStatus as any })));
      setIsSelectionMode(false);
      setSelectedSkus([]);
      setBulkStatus(null);
    } catch (err) { console.error('Bulk update failed:', err); }
    finally { setIsBulkUpdating(false); }
  }, [bulkStatus, selectedSkus, onBulkUpdate]);

  const resetFilters = useCallback(() => {
    setSelectedStatuses([]);
    setSelectedBrand('all');
    setSortOrder('date_desc');
    setSearchQuery('');
  }, []);

  const chevronSvg = (
    <svg width="8" height="5" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );

  return (
    <div className="animate-in fade-in duration-300">
      {/* Header */}
      <div className="px-1 flex items-center justify-between mb-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-800">Mon Stock</h2>
          <span className="text-xs font-medium text-gray-400">
            {isSelectionMode
              ? `${selectedSkus.length} article${selectedSkus.length > 1 ? 's' : ''} sélectionné${selectedSkus.length > 1 ? 's' : ''}`
              : `${inventory.length} articles en stock`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isSelectionMode && (
            <div className="flex items-center gap-2">
              {/* Bulk status dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsStatusDropdownOpen(o => !o)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold border bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                >
                  {bulkStatus === 'Publie' && <Globe size={14} className="text-emerald-500" />}
                  {bulkStatus === 'Apublier' && <Package size={14} className="text-orange-500" />}
                  {bulkStatus === 'Arepublier' && <RefreshCcw size={14} className="text-amber-500" />}
                  {bulkStatus === 'Enattente' && <Clock size={14} className="text-zinc-500" />}
                  {!bulkStatus && <span className="text-zinc-400">Statut...</span>}
                  <ChevronDown size={14} className="text-zinc-400 ml-1" />
                </button>
                {isStatusDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsStatusDropdownOpen(false)} />
                    <div className="absolute top-full right-0 mt-1 w-36 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden flex flex-col">
                      {VINTED_STATUS_OPTIONS.map(status => (
                        <button key={status} onClick={() => { setBulkStatus(status); setIsStatusDropdownOpen(false); }}
                          className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-zinc-700 hover:bg-zinc-50 text-left">
                          {status === 'Publie' && <Globe size={14} className="text-emerald-500" />}
                          {status === 'Apublier' && <Package size={14} className="text-orange-500" />}
                          {status === 'Arepublier' && <RefreshCcw size={14} className="text-amber-500" />}
                          {status === 'Enattente' && <Clock size={14} className="text-zinc-500" />}
                          {VINTED_STATUS_LABELS[status] || status}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button onClick={handleBulkApply} disabled={isBulkUpdating || !bulkStatus || selectedSkus.length === 0}
                className="p-2 bg-blue-600 text-white rounded-xl flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all">
                {isBulkUpdating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              </button>
            </div>
          )}
          <button onClick={() => { setIsSelectionMode(m => !m); setSelectedSkus([]); }}
            className={`px-3 py-2 rounded-xl text-[10px] font-bold border ${
              isSelectionMode ? 'bg-zinc-100 border-zinc-200 text-zinc-600' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}>
            {isSelectionMode ? 'Annuler' : 'Sélectionner'}
          </button>
          {!isSelectionMode && (
            <button onClick={onAddClick} className="w-8 h-8 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-colors">
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-medium outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm placeholder:text-zinc-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                <X size={16} />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`p-2.5 rounded-xl border flex items-center justify-center shadow-sm transition-colors ${showFilters ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}>
            <Filter size={20} />
          </button>
        </div>

        {showFilters && (
          <div className="bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Trier par</label>
                  <div className="relative">
                    <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-lg text-[11px] font-bold text-zinc-700 outline-none appearance-none cursor-pointer">
                      <option value="date_desc">Plus récents</option>
                      <option value="date_asc">Plus anciens</option>
                      <option value="price_desc">Prix décroissant</option>
                      <option value="price_asc">Prix croissant</option>
                      <option value="sku_asc">SKU (A-Z)</option>
                      <option value="sku_desc">SKU (Z-A)</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">{chevronSvg}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Marque</label>
                  <div className="relative">
                    <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-lg text-[11px] font-bold text-zinc-700 outline-none appearance-none cursor-pointer">
                      <option value="all">Toutes</option>
                      {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">{chevronSvg}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Statut Vinted</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Publie', 'Apublier', 'Arepublier', 'Enattente'].map(status => (
                    <button key={status} onClick={() => toggleStatus(status)}
                      className={`px-3 py-2 rounded-lg text-[10px] font-bold border flex-auto whitespace-nowrap flex justify-center items-center transition-colors ${
                        selectedStatuses.includes(status) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                      }`}>
                      {status === 'Publie' && <Globe size={16} className="mr-1.5" />}
                      {status === 'Apublier' && <Package size={16} className="mr-1.5" />}
                      {status === 'Arepublier' && <RefreshCcw size={16} className="mr-1.5" />}
                      {status === 'Enattente' && <Clock size={16} className="mr-1.5" />}
                      {VINTED_STATUS_LABELS[status] || status}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-1 flex justify-between items-center border-t border-zinc-100 mt-1">
                <button onClick={saveAsDefault}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-colors active:scale-95 ${
                    saveDefaultSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}>
                  {saveDefaultSuccess ? <Check size={12} /> : <Save size={12} />}
                  {saveDefaultSuccess ? 'Enregistré' : 'Enregistrer par défaut'}
                </button>
                <button onClick={resetFilters} className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg text-[10px] font-bold hover:bg-zinc-200 transition-colors active:scale-95">
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filtered.length > 0 ? (
          filtered.map(item => (
            <StockItemCard
              key={item.sku}
              item={item}
              onClick={onItemClick}
              onImageFetch={onImageFetch}
              isSelectionMode={isSelectionMode}
              isSelected={selectedSkus.includes(item.sku)}
              onToggleSelect={toggleSelect}
              onUpdatePrice={handleUpdatePrice}
            />
          ))
        ) : !isLoading && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mb-6">
              <SearchX size={32} />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-2">Aucun article</h3>
            <p className="text-zinc-400 text-[10px] font-bold max-w-[200px] leading-relaxed mb-8">
              Aucun article pour les filtres sélectionnés.
            </p>
            <button onClick={resetFilters} className="px-6 py-3 bg-white border border-zinc-200 text-zinc-600 rounded-xl text-[10px] font-bold shadow-sm active:scale-95">
              Voir tout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
