/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TrendingUp, Percent, Landmark, Calendar, Lightbulb, Save, Trash2, CheckCircle } from "lucide-react";
import { ForecastScenario, User } from "../types";
import { t } from "../i18n";

interface ForecastProps {
  user: User;
  initialPrincipal: number;
  savedScenarios: ForecastScenario[];
  onSaveScenario: (scenario: Omit<ForecastScenario, "id" | "dateCreated">) => void;
  onDeleteScenario: (id: string) => void;
}

export default function Forecast({ user, initialPrincipal, savedScenarios, onSaveScenario, onDeleteScenario }: ForecastProps) {
  const [principal, setPrincipal] = useState(initialPrincipal);
  const [monthlyContribution, setMonthlyContribution] = useState(1500);
  const [expectedYield, setExpectedYield] = useState(7.5);

  // Sync initial principal if it changes from props (only once or if they reset)
  useEffect(() => {
    setPrincipal(initialPrincipal);
  }, [initialPrincipal]);

  const [timeHorizon, setTimeHorizon] = useState(20);
  const [scenarioName, setScenarioName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Growth projection calculations
  const [results, setResults] = useState({
    totalContributions: 0,
    estimatedReturns: 0,
    estimatedFutureWealth: 0,
    yearlyPath: [] as { year: number; value: number }[]
  });

  // Calculate compound interest path
  useEffect(() => {
    const P = principal; // Principal
    const PMT = monthlyContribution; // Monthly contribution
    const r = expectedYield / 100; // Monthly yield
    const t = timeHorizon; // Time horizon in years
    const n = 12; // Compounded monthly

    const path: { year: number; value: number }[] = [];
    let currentBalance = P;

    // Year 0
    path.push({ year: 0, value: P });

    for (let year = 1; year <= t; year++) {
      let balanceForYear = currentBalance;
      for (let month = 1; month <= 12; month++) {
        balanceForYear = (balanceForYear + PMT) * (1 + r);
      }
      currentBalance = balanceForYear;
      path.push({ year, value: currentBalance });
    }

    const totalContribs = P + (PMT * 12 * t);
    const estimatedReturns = Math.max(0, currentBalance - totalContribs);

    setResults({
      totalContributions: totalContribs,
      estimatedReturns,
      estimatedFutureWealth: currentBalance,
      yearlyPath: path
    });
  }, [principal, monthlyContribution, expectedYield, timeHorizon]);

  // Dynamic Insight Calculation (master level details)
  const [insightDiff, setInsightDiff] = useState(0);
  const insightIncreaseAmount = user.currency === 'IDR' ? 500000 : 200;
  
  useEffect(() => {
    // Calculate final value with additional contribution
    const PMT_more = monthlyContribution + insightIncreaseAmount;
    const P = principal;
    const r = expectedYield / 100;
    const t = timeHorizon;

    let currentBalance = P;
    for (let year = 1; year <= t; year++) {
      for (let month = 1; month <= 12; month++) {
        currentBalance = (currentBalance + PMT_more) * (1 + r);
      }
    }

    setInsightDiff(Math.max(0, currentBalance - results.estimatedFutureWealth));
  }, [principal, monthlyContribution, expectedYield, timeHorizon, results.estimatedFutureWealth, insightIncreaseAmount]);

  // Format currencies
  const formatValue = (val: number, isCompact = false) => {
    const locale = user.currency === 'IDR' ? 'id-ID' : 'en-US';
    if (isCompact) {
      if (val >= 1000000) {
        return new Intl.NumberFormat(locale, { style: "currency", currency: user.currency, maximumFractionDigits: 2 }).format(val / 1000000) + 'M';
      }
      if (val >= 1000) {
        return new Intl.NumberFormat(locale, { style: "currency", currency: user.currency, maximumFractionDigits: 0 }).format(val / 1000) + 'K';
      }
    }
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: user.currency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenarioName.trim()) return;

    onSaveScenario({
      name: scenarioName,
      monthlyContribution,
      expectedYield,
      timeHorizon,
      totalContributions: results.totalContributions,
      estimatedReturns: results.estimatedReturns,
      estimatedFutureWealth: results.estimatedFutureWealth
    });

    setScenarioName("");
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowSaveModal(false);
    }, 1500);
  };

  const loadScenario = (sc: ForecastScenario) => {
    setMonthlyContribution(sc.monthlyContribution);
    setExpectedYield(sc.expectedYield);
    setTimeHorizon(sc.timeHorizon);
    alert(`Loaded scenario "${sc.name}" successfully!`);
  };

  // Generate SVG area chart coordinates dynamically based on the yearlyPath
  const chartHeight = 160;
  const chartWidth = 500;
  const maxVal = Math.max(...results.yearlyPath.map(d => d.value), 1000);
  const minVal = principal;

  const points = results.yearlyPath.map((d, index) => {
    const x = (index / timeHorizon) * chartWidth;
    // Map value to coordinate, higher value means smaller Y (since Y goes down in SVG)
    const yPercent = maxVal === minVal ? 50 : ((d.value - minVal) / (maxVal - minVal));
    const y = chartHeight - (yPercent * (chartHeight - 10)) - 5;
    return `${x},${y}`;
  });

  const pathD = `M0,${chartHeight} L${points.join(" L")} L${chartWidth},${chartHeight} Z`;
  const strokeD = `M${points.join(" L")}`;

  return (
    <div className="space-y-6">
      {/* TITLE CONTAINER */}
      <div>
        <h1 className="text-3xl font-bold text-primary tracking-tight" id="forecast-title">{t(user.language, "futureWealthForecast")}</h1>
        <p className="text-sm font-semibold text-outline mt-0.5">Visualize your compound wealth generation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT AREA: CHART & SLIDERS */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* CHART CONTAINER */}
          <div className="bg-white rounded-3xl p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 relative overflow-hidden">
            <div className="flex justify-between items-start mb-6 z-10 relative">
              <div>
                <h2 className="text-lg font-bold text-on-surface">Projected Growth</h2>
                <p className="text-xs font-semibold text-outline">Trajectory over {timeHorizon} years</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-primary block tracking-tight tabular-nums">
                  {formatValue(results.estimatedFutureWealth, true)}
                </span>
                <span className="text-xs font-bold text-secondary-container flex items-center justify-end gap-0.5 mt-0.5">
                  <TrendingUp className="w-3.5 h-3.5" /> +{expectedYield}% avg/yr
                </span>
              </div>
            </div>

            {/* HIGH-FIDELITY DYNAMIC SVG CHART */}
            <div className="h-44 w-full relative mt-4 select-none">
              <svg 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#003527" stopOpacity="0.25"></stop>
                    <stop offset="100%" stopColor="#003527" stopOpacity="0"></stop>
                  </linearGradient>
                </defs>

                {/* SVG Area Grid Lines */}
                <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4,4" />
                <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4,4" />
                <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4,4" />

                {/* Path Area */}
                <path d={pathD} fill="url(#chartGrad)"></path>

                {/* Path Stroke */}
                <path d={strokeD} fill="none" stroke="#003527" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"></path>

                {/* Pulse dot at the end */}
                {points.length > 0 && (
                  <g>
                    <circle cx={chartWidth} cy={points[points.length-1].split(",")[1]} r="7" fill="#003527" opacity="0.3" className="animate-ping" style={{ transformOrigin: `${chartWidth}px ${points[points.length-1].split(",")[1]}px` }} />
                    <circle cx={chartWidth} cy={points[points.length-1].split(",")[1]} r="4" fill="#003527" />
                  </g>
                )}
              </svg>

              {/* X AXIS LABELS */}
              <div className="absolute -bottom-1 w-full flex justify-between text-[10px] font-bold text-outline uppercase tracking-wider px-1">
                <span>Year 1</span>
                <span>Year {Math.round(timeHorizon * 0.25)}</span>
                <span>Year {Math.round(timeHorizon * 0.5)}</span>
                <span>Year {Math.round(timeHorizon * 0.75)}</span>
                <span>Year {timeHorizon}</span>
              </div>
            </div>
          </div>

          {/* SLIDER CONTROLS BENTO GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* INITIAL PRINCIPAL */}
            <div className="bg-white rounded-3xl p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 flex flex-col justify-between gap-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <Landmark className="w-4 h-4 text-primary" />
                  Initial Principal
                </label>
              </div>
              <div className="flex items-center bg-surface-container-lowest border border-gray-200 rounded-xl overflow-hidden focus-within:border-primary transition-colors">
                <span className="pl-3 font-bold text-outline select-none">{user.currency === 'IDR' ? 'Rp' : '$'}</span>
                <input 
                  type="text"
                  value={principal === 0 ? '' : new Intl.NumberFormat(user.currency === 'IDR' ? 'id-ID' : 'en-US').format(principal)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value.replace(/\D/g, ''));
                    setPrincipal(isNaN(val) ? 0 : val);
                  }}
                  className="w-full text-lg font-bold text-primary font-sans tabular-nums bg-transparent p-2 outline-none"
                />
              </div>
            </div>

            {/* MONTHLY CONTRIBUTION */}
            <div className="bg-white rounded-3xl p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 flex flex-col justify-between gap-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <Landmark className="w-4 h-4 text-primary" />
                  Monthly Savings
                </label>
              </div>
              <div className="flex items-center bg-surface-container-lowest border border-gray-200 rounded-xl overflow-hidden focus-within:border-primary transition-colors">
                <span className="pl-3 font-bold text-outline select-none">{user.currency === 'IDR' ? 'Rp' : '$'}</span>
                <input 
                  type="text"
                  value={monthlyContribution === 0 ? '' : new Intl.NumberFormat(user.currency === 'IDR' ? 'id-ID' : 'en-US').format(monthlyContribution)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value.replace(/\D/g, ''));
                    setMonthlyContribution(isNaN(val) ? 0 : val);
                  }}
                  className="w-full text-lg font-bold text-primary font-sans tabular-nums bg-transparent p-2 outline-none"
                />
              </div>
            </div>

            {/* EXPECTED YIELD */}
            <div className="bg-white rounded-3xl p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 flex flex-col justify-between gap-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <Percent className="w-4 h-4 text-[#fe932c]" />
                  Expected Yield / Month
                </label>
              </div>
              <div className="flex items-center bg-surface-container-lowest border border-gray-200 rounded-xl overflow-hidden focus-within:border-primary transition-colors">
                <input 
                  type="number"
                  step="0.01"
                  value={expectedYield}
                  onChange={(e) => setExpectedYield(Number(e.target.value))}
                  className="w-full text-lg font-bold text-primary font-sans tabular-nums p-2 outline-none bg-transparent"
                />
                <span className="pr-3 font-bold text-outline">%</span>
              </div>
            </div>

            {/* TIME HORIZON */}
            <div className="bg-white rounded-3xl p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 flex flex-col justify-between gap-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <Calendar className="w-4 h-4 text-[#2b6954]" />
                  Time Horizon
                </label>
              </div>
              <div className="flex items-center bg-surface-container-lowest border border-gray-200 rounded-xl overflow-hidden focus-within:border-primary transition-colors">
                <input 
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  value={timeHorizon}
                  onChange={(e) => setTimeHorizon(Number(e.target.value))}
                  className="w-full text-lg font-bold text-primary font-sans tabular-nums p-2 outline-none bg-transparent"
                />
                <span className="pr-3 font-bold text-outline">Yrs</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT AREA: BREAKDOWN SIDEBAR */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-primary text-white rounded-3xl p-6 shadow-[0px_8px_30px_rgba(0,0,0,0.06)] flex flex-col justify-between min-h-[300px] border border-emerald-950 relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-44 h-44 bg-emerald-900/10 rounded-full blur-2xl"></div>
            <div className="space-y-4 relative z-10">
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-85">Estimated Future Wealth</h3>
              <div className="text-3xl md:text-4xl font-bold tracking-tight font-sans select-none tabular-nums">
                {formatValue(results.estimatedFutureWealth)}
              </div>
              
              <div className="space-y-3 border-t border-emerald-800/60 pt-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="opacity-75">Total Contributions</span>
                  <span className="font-bold tabular-nums">{formatValue(results.totalContributions)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-75">{t(user.language, "estimatedReturns")}</span>
                  <span className="font-bold text-emerald-300 tabular-nums">{formatValue(results.estimatedReturns)}</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowSaveModal(true)}
              className="w-full mt-6 bg-white hover:bg-emerald-50 text-primary font-bold py-3.5 rounded-xl transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2 cursor-pointer relative z-10 text-sm"
            >
              <Save className="w-4.5 h-4.5" />
              <span>{t(user.language, "saveScenario")}</span>
            </button>
          </div>

          {/* ACTIONABLE INSIGHT CARD */}
          <div className="bg-emerald-50/40 rounded-3xl p-4 border border-emerald-100 flex gap-3.5 items-start">
            <div className="bg-secondary-container/10 p-2.5 rounded-xl text-secondary-container shrink-0 shadow-sm border border-orange-100">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-on-surface mb-0.5">{t(user.language, "actionableInsight")}</h4>
              <p className="text-xs font-medium text-on-surface-variant leading-relaxed">
                {t(user.language, "insightDescription").replace("{amount}", formatValue(insightIncreaseAmount))} <strong className="text-primary font-bold">{formatValue(insightDiff)}</strong> {t(user.language, "insightDescriptionEnd")}
              </p>
            </div>
          </div>

          {/* SAVED SCENARIOS TABLE */}
          {savedScenarios.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] space-y-3.5">
              <h3 className="text-sm font-bold text-primary pl-0.5">Saved Scenarios</h3>
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {savedScenarios.map(sc => (
                  <div 
                    key={sc.id} 
                    className="flex justify-between items-center p-2.5 rounded-xl hover:bg-gray-50 border border-gray-50 transition-colors cursor-pointer text-xs"
                    onClick={() => loadScenario(sc)}
                  >
                    <div>
                      <span className="font-bold text-on-surface block mb-0.5">{sc.name}</span>
                      <span className="text-outline font-semibold">
                        {sc.timeHorizon}y • {sc.expectedYield}% • {formatValue(sc.monthlyContribution)}/mo
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary tabular-nums">{formatValue(sc.estimatedFutureWealth, true)}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteScenario(sc.id);
                        }}
                        className="p-1 rounded-full hover:bg-red-50 text-outline hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SAVE SCENARIO MODAL */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-gray-100 text-center space-y-5"
            >
              {saveSuccess ? (
                <div className="py-6 flex flex-col items-center gap-3">
                  <CheckCircle className="w-16 h-16 text-primary animate-bounce" />
                  <h3 className="text-lg font-bold text-primary">Scenario Saved Successfully!</h3>
                  <p className="text-xs text-outline font-medium">Your customized projection has been archived.</p>
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="text-left space-y-1">
                    <h3 className="text-lg font-bold text-primary">Save Projection Scenario</h3>
                    <p className="text-xs text-outline font-medium">Give this financial plan a custom label to compare later.</p>
                  </div>

                  <div>
                    <input 
                      type="text"
                      placeholder="e.g. Aggressive Growth Route, 15y Exit"
                      required
                      value={scenarioName}
                      onChange={(e) => setScenarioName(e.target.value)}
                      className="w-full bg-[#F3F4F6] text-on-surface rounded-xl px-4 py-3 border-2 border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all font-sans text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setShowSaveModal(false)}
                      className="flex-1 bg-gray-50 hover:bg-gray-100 text-on-surface border border-gray-200 font-semibold py-3 rounded-xl transition-all active:scale-[0.98] text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-primary hover:bg-primary-container text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] text-sm cursor-pointer"
                    >
                      Archive Scenario
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
