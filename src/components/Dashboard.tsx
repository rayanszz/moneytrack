/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff, TrendingUp, ArrowUp, ArrowDown, CreditCard, Coffee, Home, Briefcase, Plus, Minus, ReceiptText, ArrowRightLeft } from "lucide-react";
import { Transaction, Budget, User, Asset } from "../types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface DashboardProps {
  user: User;
  transactions: Transaction[];
  budget: Budget;
  assets: Asset[];
  onNavigateToTab: (tab: "home" | "transactions" | "portfolio" | "forecast") => void;
  onOpenAddTransaction: (type: "income" | "expense") => void;
  onUpdateBudget: (limit: number) => void;
}

export default function Dashboard({ user, transactions, budget, assets, onNavigateToTab, onOpenAddTransaction, onUpdateBudget }: DashboardProps) {
  const [showBalance, setShowBalance] = useState(true);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(budget.limit.toString());

  // Total balance / net worth calculation based on actual assets + cash flow
  const assetsTotal = assets.reduce((acc, a) => acc + a.value, 0);
  const netAdditions = transactions.reduce((acc, tx) => acc + (tx.type === "income" ? Math.abs(tx.amount) : -Math.abs(tx.amount)), 0);
  const currentNetWorth = assetsTotal + netAdditions;

  // Format currency
  const formatValue = (val: number) => {
    const locale = user.currency === 'IDR' ? 'id-ID' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: user.currency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Icon mapping for categories
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Food & Dining":
        return <Coffee className="w-5 h-5 text-on-surface-variant" />;
      case "Rent":
        return <Home className="w-5 h-5 text-on-surface-variant" />;
      case "Salary":
        return <Briefcase className="w-5 h-5 text-[#2b6954]" />;
      default:
        return <CreditCard className="w-5 h-5 text-on-surface-variant" />;
    }
  };

  // Background style for categories
  const getCategoryBg = (category: string) => {
    if (category === "Salary") return "bg-emerald-50 text-emerald-800";
    return "bg-surface-container-high text-on-surface-variant";
  };

  // Recent transactions list
  const recentTransactions = transactions.slice(0, 3);

  // Dynamic budget spent based on expenses of the current month
  const totalSpentInTransactions = transactions
    .filter(tx => tx.type === "expense" && tx.category !== "Rent") // filter out rent for standard monthly budget demo
    .reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
  
  // Base spent is calculated from transactions
  const budgetLimit = budget.limit;
  const budgetSpent = Math.min(budget.spent + totalSpentInTransactions, budgetLimit);
  const budgetUtilizedPercent = Math.round((budgetSpent / budgetLimit) * 100);

  // Generate chart data for last 7 days of expenses
  const chartData = React.useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const dailyExpenses = transactions
        .filter(t => t.type === 'expense' && t.date === dateStr)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      data.push({
        name: d.toLocaleDateString(user.currency === 'IDR' ? 'id-ID' : 'en-US', { weekday: 'short' }),
        expense: dailyExpenses
      });
    }
    return data;
  }, [transactions, user.currency]);

  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(budgetInput);
    if (!isNaN(val) && val > 0) {
      onUpdateBudget(val);
      setIsEditingBudget(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION (MOBILE ONLY IN APP SHELL - IN DEDICATED MOBILE CONTAINER HERE) */}
      <div className="md:hidden flex justify-between items-center mb-1">
        <div>
          <p className="text-sm font-medium text-on-surface-variant">Good Morning,</p>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">{user.name}</h1>
        </div>
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-surface-container-high shadow-sm cursor-pointer hover:opacity-95" onClick={() => onNavigateToTab("portfolio")}>
          <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
        </div>
      </div>

      {/* NET WORTH CARD */}
      <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/3 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-on-surface-variant flex items-center gap-1.5 select-none">
              Total Net Worth 
              <button 
                onClick={() => setShowBalance(!showBalance)}
                className="text-outline hover:text-on-surface transition-colors focus:outline-none"
              >
                {showBalance ? <Eye className="w-4.5 h-4.5" /> : <EyeOff className="w-4.5 h-4.5" />}
              </button>
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-on-surface tracking-tight font-sans select-none tabular-nums">
            {showBalance ? formatValue(currentNetWorth) : "••••••••"}
          </h2>
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="grid grid-cols-4 gap-3">
        <button 
          onClick={() => {
            onNavigateToTab("transactions");
            // Set flag in session/local state to auto-open scanner
            setTimeout(() => {
              const scanBtn = document.getElementById("trigger-scan-receipt");
              if (scanBtn) scanBtn.click();
            }, 100);
          }}
          className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100 hover:border-emerald-100 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] active:scale-95 transition-all text-center cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-primary transition-colors">
            <ReceiptText className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-on-surface-variant leading-tight">Scan<br/>Bill</span>
        </button>

        <button 
          onClick={() => onOpenAddTransaction("expense")}
          className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100 hover:border-red-100 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] active:scale-95 transition-all text-center cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-red-50 group-hover:bg-red-100 flex items-center justify-center text-red-600 transition-colors">
            <Minus className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-on-surface-variant leading-tight">Add<br/>Expense</span>
        </button>

        <button 
          onClick={() => onOpenAddTransaction("income")}
          className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100 hover:border-emerald-100 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] active:scale-95 transition-all text-center cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-primary transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-on-surface-variant leading-tight">Add<br/>Income</span>
        </button>

        <button 
          onClick={() => onNavigateToTab("portfolio")}
          className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100 hover:border-blue-100 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] active:scale-95 transition-all text-center cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-on-surface-variant leading-tight">Manage<br/>Portfolio</span>
        </button>
      </section>

      {/* SPENDING SUMMARY & RECENT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MONTHLY SPENDING & CHART */}
        <section className="bg-white rounded-3xl p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-on-surface">Monthly Spending</h3>
            <button 
              onClick={() => setIsEditingBudget(!isEditingBudget)}
              className="text-primary font-semibold text-sm hover:underline"
            >
              Edit Budget
            </button>
          </div>
          
          {isEditingBudget && (
            <form onSubmit={handleBudgetSubmit} className="mb-4 flex gap-2">
              <div className="flex-1 flex items-center bg-surface-container-lowest border border-gray-200 rounded-lg focus-within:border-primary transition-colors overflow-hidden">
                <span className="pl-3 font-semibold text-outline text-sm select-none">{user.currency === 'IDR' ? 'Rp' : '$'}</span>
                <input
                  type="text"
                  value={budgetInput === "" ? "" : new Intl.NumberFormat(user.currency === 'IDR' ? 'id-ID' : 'en-US').format(Number(budgetInput))}
                  onChange={e => {
                    const val = parseInt(e.target.value.replace(/\D/g, ''));
                    setBudgetInput(isNaN(val) ? "" : val.toString());
                  }}
                  className="w-full bg-transparent px-2 py-1.5 text-sm font-semibold outline-none tabular-nums"
                  placeholder="New limit..."
                  autoFocus
                />
              </div>
              <button type="submit" className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90">Save</button>
            </form>
          )}

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm font-semibold text-on-surface-variant">
              <span>{formatValue(budgetSpent)} Spent</span>
              <span>{formatValue(budgetLimit)} Budget</span>
            </div>
            <div className="h-3.5 w-full bg-surface-container rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${budgetUtilizedPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-secondary-container rounded-full"
              ></motion.div>
            </div>
            <p className="text-xs font-semibold text-outline text-right">
              {budgetUtilizedPercent}% of budget utilized
            </p>
          </div>
          
          {/* DAILY SPENDING CHART */}
          <div className="mt-2 flex-1">
            <h4 className="text-sm font-bold text-on-surface mb-2">Daily Expenses (Last 7 Days)</h4>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    formatter={(value: number) => [formatValue(value), "Expense"]}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="expense" radius={[4, 4, 4, 4]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.expense > 0 ? '#ff897d' : '#e5e7eb'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* RECENT TRANSACTIONS */}
        <section className="bg-white rounded-3xl p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-on-surface">Recent</h3>
            <button 
              onClick={() => onNavigateToTab("transactions")}
              className="text-primary font-semibold text-sm hover:underline"
            >
              View All
            </button>
          </div>
          
          <div className="divide-y divide-gray-100">
            {recentTransactions.map((tx, index) => (
              <motion.div 
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between py-3.5 hover:bg-gray-50/50 rounded-xl px-1.5 transition-colors cursor-pointer"
                onClick={() => onNavigateToTab("transactions")}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getCategoryBg(tx.category)}`}>
                    {getCategoryIcon(tx.category)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-on-surface">{tx.merchant}</p>
                    <p className="text-xs text-on-surface-variant font-medium">{tx.category}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold tabular-nums ${tx.type === "income" ? "text-primary" : "text-on-surface"}`}>
                  {tx.type === "income" ? "+" : "-"}{formatValue(Math.abs(tx.amount))}
                </span>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
