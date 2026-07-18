/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TrendingUp, ChevronRight, TrendingDown, CircleDollarSign, Coins, Building, Landmark, Award, Plus, Edit2, X, BarChart3 } from "lucide-react";
import { Asset, User, Transaction } from "../types";
import { t } from "../i18n";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";

interface PortfolioProps {
  user: User;
  assets: Asset[];
  transactions: Transaction[];
  onAddAsset: (asset: Omit<Asset, "id">) => void;
  onUpdateAsset: (asset: Asset) => void;
  onDeleteAsset: (id: string) => void;
}

export default function Portfolio({ user, assets, transactions, onAddAsset, onUpdateAsset, onDeleteAsset }: PortfolioProps) {
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Asset>>({
    name: "",
    ticker: "",
    type: "Stocks",
    value: 0
  });

  const handleOpenModal = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData(asset);
    } else {
      setEditingAsset(null);
      setFormData({ name: "", ticker: "", type: "Stocks", value: 0 });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAsset(null);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.type || formData.value === undefined) return;
    
    if (editingAsset) {
      onUpdateAsset({ ...editingAsset, ...formData } as Asset);
    } else {
      onAddAsset(formData as Omit<Asset, "id">);
    }
    handleCloseModal();
  };

  // Total value calculation
  const totalValue = assets.reduce((acc, ast) => acc + ast.value, 0);

  const [chartView, setChartView] = useState<"daily" | "monthly">("daily");
  const chartData = React.useMemo(() => {
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentIteratedValue = totalValue;

    if (chartView === "daily") {
      // 30 days lookback
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];

        data.unshift({
          name: d.toLocaleDateString(user.currency === 'IDR' ? 'id-ID' : 'en-US', { month: 'short', day: 'numeric' }),
          value: Math.max(0, currentIteratedValue)
        });

        const dailyTransactions = transactions.filter(t => t.date === dateStr);
        const dailyNet = dailyTransactions.reduce((acc, t) => acc + (t.type === 'income' ? Math.abs(t.amount) : -Math.abs(t.amount)), 0);
        currentIteratedValue -= dailyNet;
      }
    } else {
      // 12 months lookback
      for (let i = 0; i < 12; i++) {
        const d = new Date(today);
        d.setMonth(d.getMonth() - i);
        const monthPrefix = d.toISOString().slice(0, 7); // YYYY-MM

        data.unshift({
          name: d.toLocaleDateString(user.currency === 'IDR' ? 'id-ID' : 'en-US', { month: 'short', year: '2-digit' }),
          value: Math.max(0, currentIteratedValue)
        });

        const monthlyTransactions = transactions.filter(t => t.date.startsWith(monthPrefix));
        const monthlyNet = monthlyTransactions.reduce((acc, t) => acc + (t.type === 'income' ? Math.abs(t.amount) : -Math.abs(t.amount)), 0);
        currentIteratedValue -= monthlyNet;
      }
    }
    return data;
  }, [totalValue, transactions, user.currency, chartView]);

  // Format currency
  const formatValue = (val: number, isCompact = false) => {
    const locale = user.currency === 'IDR' ? 'id-ID' : 'en-US';
    if (isCompact) {
      if (Math.abs(val) >= 1000000) return new Intl.NumberFormat(locale, { style: "currency", currency: user.currency, maximumFractionDigits: 2 }).format(val / 1000000) + 'M';
      if (Math.abs(val) >= 1000) return new Intl.NumberFormat(locale, { style: "currency", currency: user.currency, maximumFractionDigits: 0 }).format(val / 1000) + 'K';
    }
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: user.currency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Color map for assets
  const assetColors: { [key: string]: string } = {
    "Stocks": "#003527", // Primary Deep Emerald
    "Crypto": "#fe932c", // Orange
    "Real Estate": "#95d3ba", // Soft Green
    "Cash": "#707974", // Gray
    "Gold": "#904d00" // Brown Gold
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "Stocks": return <CircleDollarSign className="w-5 h-5 text-primary" />;
      case "Crypto": return <Coins className="w-5 h-5 text-secondary-container" />;
      case "Real Estate": return <Building className="w-5 h-5 text-[#2b6954]" />;
      case "Cash": return <Landmark className="w-5 h-5 text-outline" />;
      case "Gold": return <Award className="w-5 h-5 text-[#904d00]" />;
      default: return <CircleDollarSign className="w-5 h-5" />;
    }
  };

  // SVG Donut calculation
  let cumulativePercent = 0;
  const donutSegments = assets.map(asset => {
    const startPercent = cumulativePercent;
    cumulativePercent += asset.allocationPercent;
    return {
      id: asset.id,
      name: asset.name,
      startPercent,
      endPercent: cumulativePercent,
      color: assetColors[asset.type],
      allocation: asset.allocationPercent,
      value: asset.value
    };
  });

  // Build conic gradient string for the donut
  const conicGradientParts = donutSegments.map(seg => {
    const startDeg = (seg.startPercent / 100) * 360;
    const endDeg = (seg.endPercent / 100) * 360;
    return `${seg.color} ${startDeg}deg ${endDeg}deg`;
  });
  const conicGradientStyle = {
    background: `conic-gradient(${conicGradientParts.join(", ")})`
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <section className="text-center space-y-2 py-4">
        <h1 className="text-sm font-semibold uppercase text-on-surface-variant tracking-wider">{t(user.language, "portfolio")}</h1>
        <div className="text-4xl md:text-5xl font-bold text-primary tracking-tight font-sans select-none">
          {formatValue(totalValue)}
        </div>
      </section>

      {/* HISTORICAL GROWTH CHART */}
      <section className="bg-white rounded-3xl p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 h-[380px] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-primary">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-primary">Portfolio Growth</h2>
          </div>
          <div className="flex bg-surface-container-lowest border border-gray-100 rounded-xl p-1">
            <button 
              onClick={() => setChartView("daily")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${chartView === "daily" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              30 Days
            </button>
            <button 
              onClick={() => setChartView("monthly")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${chartView === "monthly" ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              12 Months
            </button>
          </div>
        </div>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2b6954" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#2b6954" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} dy={10} minTickGap={20} />
              <Tooltip 
                formatter={(value: number) => [formatValue(value, false), "Net Worth"]}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
              />
              <Area type="monotone" dataKey="value" stroke="#2b6954" strokeWidth={3} fillOpacity={1} fill="url(#colorGrowth)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* DONUT CHART & LEGEND BENTO GRID */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CHART CARD */}
        <div className="bg-white rounded-3xl p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 flex flex-col items-center justify-center min-h-[300px]">
          <div 
            className="w-56 h-56 rounded-full flex items-center justify-center relative cursor-pointer shadow-lg transition-transform duration-300 hover:scale-[1.02]"
            style={conicGradientStyle}
          >
            {/* Center Donut Hole */}
            <div className="w-40 h-40 bg-white rounded-full flex flex-col items-center justify-center shadow-[inset_0px_4px_10px_rgba(0,0,0,0.03)] select-none">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                {hoveredAsset ? hoveredAsset : "Total Value"}
              </span>
              <span className="text-2xl font-bold text-primary font-sans mt-0.5">
                {hoveredAsset 
                  ? formatValue(assets.find(a => a.name === hoveredAsset)?.value || 0, true)
                  : formatValue(totalValue, true)
                }
              </span>
            </div>
          </div>
        </div>

        {/* LEGEND CARD */}
        <div className="bg-white rounded-3xl p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 flex flex-col justify-center space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h2 className="text-lg font-bold text-primary">Asset Allocation</h2>
            <button 
              onClick={() => handleOpenModal()}
              className="w-8 h-8 rounded-full bg-emerald-50 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3.5">
            {assets.map(asset => (
              <div 
                key={asset.id}
                onMouseEnter={() => setHoveredAsset(asset.name)}
                onMouseLeave={() => setHoveredAsset(null)}
                className={`flex items-center justify-between p-1.5 rounded-xl transition-all duration-200 group ${
                  hoveredAsset === asset.name ? "bg-gray-50 scale-[1.01]" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: assetColors[asset.type] }}
                  ></div>
                  <span className="font-semibold text-sm text-on-surface">{asset.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-bold text-on-surface tabular-nums">{asset.allocationPercent}%</div>
                    <div className="text-xs font-semibold text-on-surface-variant mt-0.5 tabular-nums">
                      {formatValue(asset.value)}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleOpenModal(asset)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-outline hover:text-primary transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DETAILED HOLDINGS */}
      <section className="space-y-4 pb-6">
        <div className="flex items-center justify-between pl-1">
          <h2 className="text-lg font-bold text-primary">Top Holdings</h2>
          <button 
            onClick={() => alert("Full asset holdings list.")}
            className="text-primary font-semibold text-sm flex items-center gap-1 hover:underline"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {assets.slice(0, 3).map((asset, index) => {
            const isUp = asset.changeType !== "down";
            return (
              <motion.div 
                key={asset.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer"
                onClick={() => alert(`Asset detailed performance metric:\nTicker: ${asset.ticker}\nHolding type: ${asset.type}\nAllocation contribution: ${asset.allocationPercent}%\nTotal Value: ${formatValue(asset.value)}`)}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center shadow-sm">
                    {getAssetIcon(asset.type)}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-on-surface">{asset.name}</div>
                    <div className="text-xs font-semibold text-on-surface-variant mt-0.5">
                      {asset.countLabel}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-on-surface tabular-nums">{formatValue(asset.value)}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ASSET MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-primary tracking-tight">
                  {editingAsset ? "Edit Asset" : "Add Asset"}
                </h3>
                <button 
                  onClick={handleCloseModal}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-outline transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAsset} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-1.5">{t(user.language, "assetName")}</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Apple Inc., Bitcoin, etc."
                    className="w-full bg-surface-container-lowest border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface outline-none focus:border-primary transition-colors"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-on-surface mb-1.5">Type</label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as any})}
                      className="w-full bg-surface-container-lowest border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface outline-none focus:border-primary transition-colors"
                    >
                      <option value="Stocks">Stocks</option>
                      <option value="Crypto">Crypto</option>
                      <option value="Real Estate">Real Estate</option>
                      <option value="Cash">Cash</option>
                      <option value="Gold">Gold</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-on-surface mb-1.5">Ticker (Optional)</label>
                    <input
                      type="text"
                      value={formData.ticker}
                      onChange={e => setFormData({...formData, ticker: e.target.value})}
                      placeholder="AAPL, BTC..."
                      className="w-full bg-surface-container-lowest border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface outline-none focus:border-primary transition-colors uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-1.5">{t(user.language, "currentValue")}</label>
                  <div className="flex items-center bg-surface-container-lowest border border-gray-200 rounded-xl overflow-hidden focus-within:border-primary transition-colors">
                    <span className="pl-4 font-semibold text-outline text-sm select-none">{user.currency === 'IDR' ? 'Rp' : '$'}</span>
                    <input
                      type="number"
                      required
                      value={formData.value === undefined ? "" : formData.value}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setFormData({...formData, value: isNaN(val) ? 0 : val});
                      }}
                      placeholder="0"
                      className="w-full bg-transparent px-2 py-3 text-sm font-semibold text-on-surface outline-none tabular-nums"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  {editingAsset && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteAsset(editingAsset.id);
                        handleCloseModal();
                      }}
                      className="px-4 py-3 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                    >
                      Delete
                    </button>
                  )}
                  <div className="flex gap-3 ml-auto">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-5 py-3 text-sm font-bold text-on-surface-variant hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-3 text-sm font-bold text-white bg-primary hover:bg-[#002a1f] rounded-xl transition-colors shadow-md"
                    >
                      Save Asset
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
