
import React, { useMemo, useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { TrendingUp, Euro, Package, Banknote, BarChart3, PieChart, LayoutGrid, ChevronDown, Bot } from 'lucide-react';
import { formatPrice, parseDate as sharedParseDate } from '../constants';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Pie,
  Cell,
  PieChart as RechartsPieChart
} from 'recharts';

interface DashboardProps {
  inventory: InventoryItem[];
  onRefresh?: () => void;
}

const parseDate = (dateStr: string | undefined): Date => {
  const t = sharedParseDate(dateStr);
  return t === 0 ? new Date() : new Date(t);
};

export const Dashboard: React.FC<DashboardProps> = ({ inventory, onRefresh }) => {
  const [distributionTab, setDistributionTab] = useState<'brand' | 'category'>('brand');
  const [selectedYear, setSelectedYear] = useState<string>('tout');
  const [isPublisherRunning, setIsPublisherRunning] = useState<boolean>(true);
  const [isPublisherLoading, setIsPublisherLoading] = useState<boolean>(true);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchPublisherConfig = async () => {
      try {
        const docRef = doc(db, 'config', 'publisher');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (typeof data.running === 'boolean') {
            setIsPublisherRunning(data.running);
          }
        }
      } catch (err) {
        // Handle silently
      } finally {
        setIsPublisherLoading(false);
      }
    };
    fetchPublisherConfig();
  }, []);

  const togglePublisher = async () => {
    const newState = !isPublisherRunning;
    setIsPublisherRunning(newState);
    try {
      const docRef = doc(db, 'config', 'publisher');
      await setDoc(docRef, { running: newState }, { merge: true });
    } catch (err) {
      // Handle silently
    }
  };

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    inventory.filter(i => i.isSold).forEach(item => {
      const dateStr = item.soldDate || item.date;
      if (dateStr) {
        try {
          const year = parseDate(dateStr).getFullYear().toString();
          if (!isNaN(parseInt(year))) years.add(year);
        } catch (e) {}
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [inventory]);

  const stats = useMemo(() => {
    // Filtrage strict : Uniquement les articles physiquement en stock
    const inStockItems = inventory.filter(i => i.articleStatus === 'En stock');
    let soldItems = inventory.filter(i => i.isSold);
    
    if (selectedYear !== 'tout') {
      soldItems = soldItems.filter(item => {
        const dateStr = item.soldDate || item.date;
        return parseDate(dateStr).getFullYear().toString() === selectedYear;
      });
    }

    const totalInStock = inStockItems.length;
    const totalStockValue = inStockItems.reduce((sum, item) => 
      sum + (item.PricePurchase || 0) + (item.PriceTransport || 0) + (item.PriceTaxes || 0), 0
    );

    const totalRevenue = soldItems.reduce((sum, item) => sum + (item.PriceSold || 0), 0);
    const totalSalesProfit = soldItems.reduce((sum, item) => {
        const cost = (item.PricePurchase || 0) + (item.PriceTransport || 0) + (item.PriceTaxes || 0);
        return sum + (item.PriceSold || 0) - cost;
    }, 0);

    return { totalInStock, totalStockValue, totalRevenue, totalSalesProfit };
  }, [inventory, selectedYear]);

  const chartData = useMemo(() => {
    let soldItems = inventory.filter(i => i.isSold && (i.soldDate || i.date));
    
    if (selectedYear !== 'tout') {
      soldItems = soldItems.filter(item => {
        const dateStr = item.soldDate || item.date;
        return parseDate(dateStr).getFullYear().toString() === selectedYear;
      });
    }

    const aggregatedData: Record<string, { revenue: number; profit: number; timestamp: number }> = {};

    soldItems.forEach(item => {
      const dateStr = item.soldDate || item.date;
      const date = parseDate(dateStr);
      let key: string;
      let timestamp: number;

      if (selectedYear === 'tout') {
        key = date.getFullYear().toString();
        timestamp = new Date(date.getFullYear(), 0, 1).getTime();
      } else {
        key = date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
        timestamp = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
      }
        
      const cost = (item.PricePurchase || 0) + (item.PriceTransport || 0) + (item.PriceTaxes || 0);
      const revenue = item.PriceSold || 0;
      const profit = revenue - cost;

      if (!aggregatedData[key]) {
        aggregatedData[key] = { revenue: 0, profit: 0, timestamp: timestamp };
      }
      aggregatedData[key].revenue += revenue;
      aggregatedData[key].profit += profit;
    });

    return Object.entries(aggregatedData)
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .map(([name, data]) => ({
        name: name.toUpperCase(),
        Revenue: parseFloat(data.revenue.toFixed(2)),
        Profit: parseFloat(data.profit.toFixed(2))
      }));
  }, [inventory, selectedYear]);

  const processDistribution = (counts: Record<string, number>) => {
    const raw = Object.entries(counts)
      .map(([name, count]) => ({ name: name.toUpperCase(), value: count }))
      .sort((a, b) => b.value - a.value);

    if (raw.length <= 10) return raw;

    const top9 = raw.slice(0, 9);
    const othersValue = raw.slice(9).reduce((sum, item) => sum + item.value, 0);
    return [...top9, { name: "AUTRES", value: othersValue }];
  };

  const brandData = useMemo(() => {
    const brands: Record<string, number> = {};
    // On ne compte que les articles dont le statut est explicitement 'En stock'
    inventory.filter(i => i.articleStatus === 'En stock').forEach(item => {
      const b = item.brand || "Inconnue";
      brands[b] = (brands[b] || 0) + 1;
    });
    return processDistribution(brands);
  }, [inventory]);

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    // On ne compte que les articles dont le statut est explicitement 'En stock'
    inventory.filter(i => i.articleStatus === 'En stock').forEach(item => {
      const catParts = item.category.split(' - ');
      const name = catParts[catParts.length - 1] || "Autre";
      categories[name] = (categories[name] || 0) + 1;
    });
    return processDistribution(categories);
  }, [inventory]);

  const activeData = distributionTab === 'brand' ? brandData : categoryData;
  const totalInStockReal = useMemo(() => inventory.filter(i => i.articleStatus === 'En stock').length, [inventory]);

  const THEME_COLORS = distributionTab === 'brand' 
    ? ['#1e3a8a', '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#94a3b8']
    : ['#1e3a8a', '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#94a3b8'];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="px-1">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-400">Suivi financier de votre activité</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-1">
        <KpiCard title="En stock" value={stats.totalInStock.toString()} icon={<Package size={14} className="text-blue-600" />} iconBg="bg-blue-50" hoverBorder="hover:border-blue-200" />
        <KpiCard title="Valeur stock" value={`${formatPrice(stats.totalStockValue)}€`} icon={<Euro size={14} className="text-violet-600" />} iconBg="bg-violet-50" hoverBorder="hover:border-violet-200" />
        <KpiCard title="Bénéfice" value={`${formatPrice(stats.totalSalesProfit)}€`} icon={<TrendingUp size={14} className="text-emerald-600" />} iconBg="bg-emerald-50" hoverBorder="hover:border-emerald-200" />
        <KpiCard title="CA total" value={`${formatPrice(stats.totalRevenue)}€`} icon={<Banknote size={14} className="text-amber-600" />} iconBg="bg-amber-50" hoverBorder="hover:border-amber-200" />
      </div>

      <div className="px-1">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPublisherRunning ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-400'}`}>
              <Bot size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 tracking-tight">Publication auto Vinted</h3>
              <p className="text-xs font-medium text-zinc-500 mt-0.5">
                {isPublisherLoading ? 'Chargement...' : (isPublisherRunning ? 'Activée — script en écoute' : 'En pause')}
              </p>
            </div>
          </div>
          <button 
            onClick={togglePublisher}
            disabled={isPublisherLoading}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${isPublisherRunning ? 'bg-emerald-500' : 'bg-zinc-200'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isPublisherRunning ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="px-1">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
          <div className="flex items-center justify-between gap-4 mb-8">
            <h3 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-600" /> Performance
            </h3>
            <div className="relative inline-flex items-center bg-zinc-50 border border-zinc-100 px-3 py-1.5 rounded-xl shadow-sm hover:bg-white transition-colors">
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] font-bold text-zinc-900 appearance-none pr-5 cursor-pointer text-center"
                style={{ width: selectedYear === 'tout' ? '54px' : '50px' }}
              >
                <option value="tout">TOUT</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 pointer-events-none text-zinc-400" />
            </div>
          </div>
          
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#a1a1aa' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#a1a1aa' }} tickFormatter={(val) => `${formatPrice(val)}€`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 700, padding: '2px 0' }}
                  labelStyle={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: '#a1a1aa', marginBottom: '4px' }}
                  formatter={(value: number) => [`${formatPrice(value)}€`]}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} />
                <Area type="monotone" dataKey="Revenue" name="CA" stroke="#2563eb" strokeWidth={3} fill="url(#colorRevenue)" animationDuration={1000} activeDot={{ r: 6, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="Profit" name="Bénéfice" stroke="#60a5fa" strokeWidth={3} fill="url(#colorProfit)" animationDuration={1200} activeDot={{ r: 6, strokeWidth: 0 }} />
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="px-1">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <h3 className="text-base font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <LayoutGrid size={20} className="text-blue-600" /> Répartition
            </h3>
            <div className="flex bg-zinc-100 p-1 rounded-xl self-start">
              <button onClick={() => setDistributionTab('brand')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${distributionTab === 'brand' ? 'bg-white text-blue-600 shadow-sm' : 'text-zinc-400'}`}>Marque</button>
              <button onClick={() => setDistributionTab('category')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${distributionTab === 'category' ? 'bg-white text-blue-600 shadow-sm' : 'text-zinc-400'}`}>Catégorie</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 relative h-[220px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie data={activeData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                    {activeData.map((entry, index) => <Cell key={`cell-${index}`} fill={THEME_COLORS[index % THEME_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-zinc-900 tracking-tight">{totalInStockReal}</span>
                <span className="text-[10px] font-bold text-zinc-400">Articles</span>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-2">
              {activeData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: THEME_COLORS[index % THEME_COLORS.length] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="truncate text-zinc-700">{item.name}</span>
                      <span className="text-zinc-400 ml-2">{item.value}</span>
                    </div>
                    <div className="mt-1.5 h-1 w-full bg-zinc-50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full opacity-80 transition-all duration-1000" style={{ width: `${(item.value / totalInStockReal * 100)}%`, backgroundColor: THEME_COLORS[index % THEME_COLORS.length] }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const KpiCard: React.FC<{title: string, value: string, icon: React.ReactNode, iconBg?: string, hoverBorder?: string}> = ({ title, value, icon, iconBg = "bg-white", hoverBorder = "hover:border-blue-100" }) => (
  <div className={`bg-white p-4 rounded-3xl shadow-sm border border-zinc-100 flex items-center justify-between gap-2 ${hoverBorder} hover:shadow-md transition-shadow duration-300`}>
    <div className="flex flex-col gap-1">
      <p className="text-[11px] font-bold text-zinc-400">{title}</p>
      <p className="text-lg font-bold text-zinc-900 tracking-tight leading-tight">{value}</p>
    </div>
    <div className={`${iconBg} w-8 h-8 rounded-xl flex items-center justify-center shrink-0`}>
      {React.cloneElement(icon as React.ReactElement, { size: 14 })}
    </div>
  </div>
);
