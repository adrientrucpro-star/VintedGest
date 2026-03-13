import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { InventoryItem } from '../types';
import { Search, Filter, SearchX, X, Save, Check } from 'lucide-react';
import { getOptimizedImageUrl, formatPrice, parseDate } from '../constants';
import { LazyImage } from './LazyImage';

interface SalesViewProps {
  inventory: InventoryItem[];
  onItemClick: (item: InventoryItem) => void;
  onImageFetch: (sku: string, urls: string[]) => void;
  isLoading?: boolean;
}

const SalesItemCard = React.memo(({ item, onClick }: { item: InventoryItem; onClick: (item: InventoryItem) => void }) => {
  const image = item.images?.[0] || item.Images?.[0];
  const totalCost = (item.PricePurchase || 0) + (item.PriceTransport || 0) + (item.PriceTaxes || 0);
  const profit = (item.PriceSold || 0) - totalCost;

  return (
    <div onClick={() => onClick(item)} className="bg-white p-3 rounded-2xl border border-zinc-100 shadow-sm flex flex-col gap-2 hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]">
      <div className="aspect-square w-full rounded-xl overflow-hidden bg-zinc-50 flex items-center justify-center relative">
        <LazyImage src={image} thumbnail={item.thumbnail} />
        <div className="absolute top-2 left-2 bg-blue-600/90 h-5 px-1.5 rounded-md flex items-center justify-center">
          <span className="text-xs font-bold text-white tracking-wider">#{item.sku}</span>
        </div>
      </div>
      <div className="px-0.5">
        <div className="flex items-center justify-between h-[34px]">
          <div className="flex flex-col justify-center">
            <span className="text-[9px] font-bold text-zinc-400 leading-tight">Vendu</span>
            <span className="text-xs font-bold text-zinc-900 leading-tight">{formatPrice(item.PriceSold || 0)}€</span>
          </div>
          <div className="flex flex-col items-end justify-center">
            <span className="text-[9px] font-bold text-zinc-400 leading-tight">Profit</span>
            <span className={`text-xs font-bold leading-tight ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {profit >= 0 ? '+' : ''}{formatPrice(profit)}€
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

SalesItemCard.displayName = 'SalesItemCard';

const chevronSvg = (
  <svg width="8" height="5" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
);

export const SalesView: React.FC<SalesViewProps> = ({ inventory, onItemClick, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [sortOrder, setSortOrder] = useState<'date_desc' | 'date_asc' | 'sku_asc' | 'sku_desc'>('date_desc');
  const [showFilters, setShowFilters] = useState(false);
  const [saveDefaultSuccess, setSaveDefaultSuccess] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('vinted_sales_filters') || '{}');
      if (saved.filterBrand) setFilterBrand(saved.filterBrand);
      if (saved.sortOrder) setSortOrder(saved.sortOrder);
    } catch {}
  }, []);

  const saveAsDefault = useCallback(() => {
    localStorage.setItem('vinted_sales_filters', JSON.stringify({ filterBrand, sortOrder }));
    setSaveDefaultSuccess(true);
    setTimeout(() => setSaveDefaultSuccess(false), 2000);
  }, [filterBrand, sortOrder]);

  const resetFilters = useCallback(() => { setSearchTerm(''); setFilterBrand(''); setSortOrder('date_desc'); }, []);

  const brands = useMemo(() => Array.from(new Set(inventory.map(i => i.brand).filter(Boolean))).sort(), [inventory]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return inventory
      .filter(item => {
        if (filterBrand && item.brand !== filterBrand) return false;
        if (q && !item.headline?.toLowerCase().includes(q) && !item.brand?.toLowerCase().includes(q) && !item.sku?.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sortOrder) {
          case 'date_asc': return parseDate(a.soldDate || a.date) - parseDate(b.soldDate || b.date);
          case 'date_desc': return parseDate(b.soldDate || b.date) - parseDate(a.soldDate || a.date);
          case 'sku_asc': return (a.sku || '').localeCompare(b.sku || '');
          case 'sku_desc': return (b.sku || '').localeCompare(a.sku || '');
          default: return parseDate(b.soldDate || b.date) - parseDate(a.soldDate || a.date);
        }
      });
  }, [inventory, searchTerm, filterBrand, sortOrder]);

  return (
    <div className="animate-in fade-in duration-300">
      <div className="px-1 flex items-center justify-between mb-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-800">Ventes</h2>
          <span className="text-xs font-medium text-gray-400">{filtered.length} ventes trouvées</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-medium outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm placeholder:text-zinc-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"><X size={16} /></button>
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
                      <option value="sku_asc">SKU A-Z</option>
                      <option value="sku_desc">SKU Z-A</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">{chevronSvg}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Marque</label>
                  <div className="relative">
                    <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-lg text-[11px] font-bold text-zinc-700 outline-none appearance-none cursor-pointer">
                      <option value="">Toutes</option>
                      {brands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">{chevronSvg}</div>
                  </div>
                </div>
              </div>
              <div className="pt-1 flex justify-between items-center border-t border-zinc-100 mt-1">
                <button onClick={saveAsDefault}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-colors active:scale-95 ${saveDefaultSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filtered.length > 0 ? (
          filtered.map(item => <SalesItemCard key={item.sku} item={item} onClick={onItemClick} />)
        ) : !isLoading && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 mb-6"><SearchX size={32} /></div>
            <h3 className="text-base font-bold text-zinc-900 mb-2">Aucun résultat</h3>
            <p className="text-zinc-400 text-[10px] font-bold max-w-[200px] leading-relaxed mb-8">Aucune vente pour ces filtres.</p>
            <button onClick={resetFilters} className="px-6 py-3 bg-white border border-zinc-200 text-zinc-600 rounded-xl text-[10px] font-bold shadow-sm active:scale-95">Réinitialiser</button>
          </div>
        )}
      </div>
    </div>
  );
};
