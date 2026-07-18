/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { TrendingUp, ChevronRight, TrendingDown, CircleDollarSign, Coins, Building, Landmark, Award } from "lucide-react";
import { Asset, User } from "../types";

interface PortfolioProps {
  user: User;
  assets: Asset[];
}

export default function Portfolio({ user, assets }: PortfolioProps) {
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);

  // Total value calculation
  const totalValue = assets.reduce((acc, ast) => acc + ast.value, 0);

  // Format currency
  const formatValue = (val: number, isCompact = false) => {
    if (isCompact) {
      if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
      if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: user.currency,
      maximumFractionDigits: 2,
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
        <h1 className="text-sm font-semibold uppercase text-on-surface-variant tracking-wider">My Portfolio</h1>
        <div className="text-4xl md:text-5xl font-bold text-primary tracking-tight font-sans select-none">
          {formatValue(totalValue)}
        </div>
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-4 py-1.5 rounded-full text-sm font-semibold border border-emerald-100 shadow-sm">
          <TrendingUp className="w-4 h-4" />
          <span>+$12,450.00 (1.02%) Today</span>
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
          <h2 className="text-lg font-bold text-primary border-b border-gray-100 pb-2">Asset Allocation</h2>
          <div className="space-y-3.5">
            {assets.map(asset => (
              <div 
                key={asset.id}
                onMouseEnter={() => setHoveredAsset(asset.name)}
                onMouseLeave={() => setHoveredAsset(null)}
                className={`flex items-center justify-between p-1.5 rounded-xl transition-all duration-200 ${
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
                <div className="text-right">
                  <div className="text-sm font-bold text-on-surface tabular-nums">{asset.allocationPercent}%</div>
                  <div className="text-xs font-semibold text-on-surface-variant mt-0.5 tabular-nums">
                    {formatValue(asset.value)}
                  </div>
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
                    <div className="font-bold text-sm text-on-surface">{asset.name === "Stocks" ? "Apple Inc." : asset.name === "Crypto" ? "Bitcoin" : "Vanguard Real Estate"}</div>
                    <div className="text-xs font-semibold text-on-surface-variant mt-0.5">
                      {asset.countLabel}
                    </div>
                  </div>
                </div>

                {/* SPARKLINE CHART - Interactive CSS/SVG Render */}
                <div className="hidden md:flex w-24 h-8 items-end gap-[3px] opacity-85 select-none">
                  {asset.sparkline?.map((val, i) => {
                    const max = Math.max(...(asset.sparkline || []));
                    const min = Math.min(...(asset.sparkline || []));
                    const heightPercent = max === min ? 50 : ((val - min) / (max - min)) * 100;
                    return (
                      <div 
                        key={i} 
                        className={`w-full rounded-t-[1px] transition-all duration-300`}
                        style={{ 
                          height: `${Math.max(heightPercent, 15)}%`,
                          backgroundColor: isUp ? "#003527" : "#ba1a1a",
                          opacity: 0.3 + (i * 0.15)
                        }}
                      ></div>
                    );
                  })}
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-on-surface tabular-nums">{formatValue(asset.value)}</div>
                  <div className={`text-xs font-bold flex items-center justify-end gap-0.5 mt-0.5 tabular-nums ${
                    isUp ? "text-primary" : "text-red-600"
                  }`}>
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{isUp ? "+" : "-"}{asset.changePercent}%</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
