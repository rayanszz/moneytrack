/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { t } from "../i18n";
import { Search, SlidersHorizontal, ReceiptText, ArrowRight, X, Coffee, Home, Briefcase, CreditCard, ChevronRight, CheckCircle, AlertCircle, ShoppingBag, Car, FileUp, Plus, Minus, Save } from "lucide-react";
import { Transaction, User, Asset } from "../types";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { preprocessReceiptImage } from "../utils/imagePreprocessor";

interface TransactionsProps {
  user: User;
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, "id">) => void;
  onUpdateTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onOpenAddTransaction: (type: "income" | "expense") => void;
  assets: Asset[];
}

export default function Transactions({ 
  user, 
  transactions, 
  onAddTransaction, 
  onUpdateTransaction, 
  onDeleteTransaction, 
  onOpenAddTransaction,
  assets
}: TransactionsProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "Income" | "Expense">("All");
  const [showScanner, setShowScanner] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [scanError, setScanError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editing transaction states
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editMerchant, setEditMerchant] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editType, setEditType] = useState<"income" | "expense">("expense");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const startEditingTx = (tx: Transaction) => {
    setEditingTx(tx);
    setEditMerchant(tx.merchant);
    setEditAmount(Math.abs(tx.amount).toString());
    setEditCategory(tx.category);
    setEditType(tx.type);
    setEditDate(tx.date);
    setEditTime(tx.time);
    setEditAccountId(tx.accountId || "");
    setEditNotes(tx.notes || "");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    onUpdateTransaction({
      ...editingTx,
      merchant: editMerchant,
      amount: editType === "income" ? Math.abs(Number(editAmount)) : -Math.abs(Number(editAmount)),
      category: editCategory,
      type: editType,
      date: editDate,
      time: editTime,
      paymentMethod: assets.find(a => a.id === editAccountId)?.name || "Cash",
      accountId: editAccountId,
      notes: editNotes.trim() || undefined
    });

    setEditingTx(null);
  };

  const handleDeleteClick = () => {
    if (!editingTx) return;
    const confirmMsg = user.language === "Indonesia" 
      ? "Apakah Anda yakin ingin menghapus transaksi ini?" 
      : "Are you sure you want to delete this transaction?";
    
    if (window.confirm(confirmMsg)) {
      onDeleteTransaction(editingTx.id);
      setEditingTx(null);
    }
  };

  const editCategories = editType === "income"
    ? ["Salary", "Investments", "Gifts", "Miscellaneous"]
    : ["Food & Dining", "Rent", "Travel", "Shopping", "Utilities", "Miscellaneous"];

  const paymentMethods = ["Chase Visa", "Amex Platinum", "Checking Acct", "Cash"];

  // Calculations for charts
  const { totalIncome, totalExpense, expenseData } = React.useMemo(() => {
    let incomeSum = 0;
    let expenseSum = 0;
    const categoryExpenses: { [key: string]: number } = {};

    transactions.forEach(tx => {
      const amt = Math.abs(tx.amount);
      if (tx.type === "income") {
        incomeSum += amt;
      } else {
        expenseSum += amt;
        categoryExpenses[tx.category] = (categoryExpenses[tx.category] || 0) + amt;
      }
    });

    const expData = Object.keys(categoryExpenses).map(cat => ({
      name: cat,
      value: categoryExpenses[cat],
    })).sort((a, b) => b.value - a.value);

    return {
      totalIncome: incomeSum,
      totalExpense: expenseSum,
      expenseData: expData,
    };
  }, [transactions]);

  const COLORS = ["#10b981", "#3b82f6", "#ea580c", "#8b5cf6", "#e11d48", "#6b7280"];

  const getCategoryLabel = (cat: string) => {
    if (user.language === "Indonesia") {
      switch (cat) {
        case "Food & Dining": return "Makanan & Minuman";
        case "Rent": return "Sewa Rumah";
        case "Travel": return "Perjalanan & Mobil";
        case "Shopping": return "Belanja";
        case "Utilities": return "Tagihan & Utilitas";
        case "Miscellaneous": return "Lain-lain";
        default: return cat;
      }
    }
    return cat;
  };

  // Filter transactions
  const filtered = transactions.filter(tx => {
    const matchesSearch = tx.merchant.toLowerCase().includes(search.toLowerCase()) || 
                          tx.category.toLowerCase().includes(search.toLowerCase()) ||
                          (tx.paymentMethod && tx.paymentMethod.toLowerCase().includes(search.toLowerCase()));
    
    if (activeTab === "All") return matchesSearch;
    if (activeTab === "Income") return matchesSearch && tx.type === "income";
    return matchesSearch && tx.type === "expense";
  });

  // Group transactions by date
  const groupedTransactions: { [key: string]: Transaction[] } = {};
  filtered.forEach(tx => {
    const dateLabel = getFormattedDateLabel(tx.date);
    if (!groupedTransactions[dateLabel]) {
      groupedTransactions[dateLabel] = [];
    }
    groupedTransactions[dateLabel].push(tx);
  });

  function getFormattedDateLabel(dateStr: string) {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    if (dateStr === today) return "TODAY";
    if (dateStr === yesterday) return "YESTERDAY";

    // Format YYYY-MM-DD to readable e.g. "JULY 15, 2026"
    const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
    return new Date(dateStr).toLocaleDateString("en-US", options).toUpperCase();
  }

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
      case "Shopping":
        return <ShoppingBag className="w-5 h-5 text-on-surface-variant" />;
      case "Travel":
        return <Car className="w-5 h-5 text-on-surface-variant" />;
      default:
        return <CreditCard className="w-5 h-5 text-on-surface-variant" />;
    }
  };

  const getCategoryBg = (category: string) => {
    if (category === "Salary") return "bg-emerald-50 text-emerald-800";
    return "bg-surface-container-high text-on-surface-variant";
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Main Receipt Scanning Execution (with Server integration)
  const processFile = async (file: File) => {
    setScanError("");
    setScanLoading(true);
    setScanProgress("Applying computer vision preprocessing (Grayscale + Contrast enhancement)...");

    try {
      // Preprocess image with resizing, grayscaling, and contrast boosting (CV-like system)
      const { base64, originalSize, compressedSize } = await preprocessReceiptImage(file);
      
      const originalKB = Math.round(originalSize / 1024);
      const compressedKB = Math.round(compressedSize / 1024);
      setScanProgress(`CV Preprocessing done! Optimized size: ${compressedKB} KB (down from ${originalKB} KB). Uploading to AI...`);
      
      const response = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          imageBase64: base64,
          mimeType: "image/jpeg" 
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 503 || errData.isFallback) {
          triggerDemoScanning("Real server API is not configured (missing key). Running offline local AI analyzer demo instead...");
          return;
        }
        throw new Error(errData.error || "Server failed to scan receipt");
      }

      setScanProgress("AI is reading and parsing invoice elements...");
      const data = await response.json();
      
      setScanProgress("Transaction categorized successfully!");
      setScanResult({
        merchant: data.merchant || "Unknown Store",
        amount: Math.abs(data.amount) || 0,
        category: data.category || "Shopping",
        date: data.date || new Date().toISOString().split("T")[0],
        time: data.time || "12:00 PM",
        paymentMethod: data.paymentMethod || "Chase Visa",
        items: data.items || []
      });
      setScanLoading(false);
    } catch (err: any) {
      console.warn("Scan failed, falling back to local demo mode:", err);
      triggerDemoScanning(`Server connection limit or error: ${err.message}. Switching to local sandbox...`);
    }
  };

  // Demo fallback scanner
  const triggerDemoScanning = (progressMsg: string) => {
    setScanProgress(progressMsg);
    setScanLoading(true);
    
    // Simulate multi-stage AI analysis
    setTimeout(() => {
      setScanProgress("Extracting merchant lines and timestamp metadata...");
      setTimeout(() => {
        setScanProgress("Identifying total amount, tax rows, and payment cards...");
        setTimeout(() => {
          setScanProgress("Classifying transaction category based on items...");
          setTimeout(() => {
            setScanResult({
              merchant: "Whole Foods Market",
              amount: 84.50,
              category: "Food & Dining",
              date: new Date().toISOString().split("T")[0],
              time: "02:45 PM",
              paymentMethod: "Amex Platinum",
              items: ["Organic Milk ($6.50)", "Avocado Pack ($8.00)", "Fresh Salmon Fillet ($32.00)", "Premium Roast Coffee ($18.00)", "Artisan Cheese ($20.00)"]
            });
            setScanLoading(false);
          }, 800);
        }, 800);
      }, 800);
    }, 800);
  };

  // Approve Scan result and insert into transactions list
  const handleApproveScan = () => {
    if (scanResult) {
      onAddTransaction({
        merchant: scanResult.merchant,
        amount: -Math.abs(scanResult.amount), // receipts are expenses
        category: scanResult.category,
        date: scanResult.date,
        time: scanResult.time,
        paymentMethod: scanResult.paymentMethod,
        type: "expense"
      });
      setShowScanner(false);
      setScanResult(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-primary tracking-tight" id="transactions-title">Transactions</h1>
        
        {/* Search and filter bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bfc9c3]">
              <Search className="w-5 h-5" />
            </span>
            <input 
              type="text"
              placeholder={t(user.language, "searchTransactions")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F3F4F6] text-on-surface rounded-2xl pl-12 pr-4 py-3 border-none focus:ring-2 focus:ring-primary focus:bg-white transition-all font-sans text-sm placeholder:text-outline"
            />
          </div>
          <button 
            onClick={() => alert("Category / account filter tools.")}
            className="h-11 w-11 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors active:scale-95 border border-transparent hover:border-outline-variant"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* SCAN RECEIPT ACTION - BENTO BOX */}
        <button 
          id="trigger-scan-receipt"
          onClick={() => {
            setShowScanner(true);
            setScanResult(null);
            setScanError("");
          }}
          className="group w-full bg-white rounded-3xl p-6 flex items-center justify-between shadow-[0px_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0px_8px_30px_rgba(0,0,0,0.06)] border border-gray-100 hover:border-emerald-200 transition-all duration-300 relative overflow-hidden active:scale-[0.99] text-left cursor-pointer"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-primary/2 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-125 duration-500"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-sm">
              <ReceiptText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-surface mb-0.5">Scan Receipt</h3>
              <p className="text-sm font-medium text-outline">Categorize with AI</p>
            </div>
          </div>
        </button>

        {/* ADD MANUAL TRANSACTION ACTION */}
        <button 
          onClick={() => onOpenAddTransaction("expense")}
          className="group w-full bg-white rounded-3xl p-6 flex items-center justify-between shadow-[0px_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0px_8px_30px_rgba(0,0,0,0.06)] border border-gray-100 hover:border-emerald-200 transition-all duration-300 relative overflow-hidden active:scale-[0.99] text-left cursor-pointer"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-primary/2 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-125 duration-500"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-sm">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-surface mb-0.5">Manual Entry</h3>
              <p className="text-sm font-medium text-outline">Type it yourself</p>
            </div>
          </div>
        </button>
      </div>

      {/* ANALYTICS BRIEF: PIE CHART & COMPARISON */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white rounded-3xl p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-gray-100">
        
        {/* PIE CHART - EXPENSE DISTRIBUTION */}
        <div className="flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-xs font-bold text-outline uppercase tracking-wider mb-1">
              {user.language === "Indonesia" ? "Distribusi Pengeluaran" : "Expense Distribution"}
            </h3>
            <h2 className="text-lg font-bold text-on-surface">
              {user.language === "Indonesia" ? "Kategori Pengeluaran Terbesar" : "Biggest Spending Categories"}
            </h2>
          </div>

          {expenseData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-center text-xs text-outline font-semibold bg-gray-50/50 rounded-2xl">
              {user.language === "Indonesia" ? "Belum ada data pengeluaran." : "No expense data recorded yet."}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Pie Chart Container */}
              <div className="w-36 h-36 shrink-0 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={58}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [formatValue(value), ""]}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center total label */}
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] uppercase font-bold text-outline leading-none">Total</span>
                  <span className="text-xs font-black text-on-surface tabular-nums mt-0.5 leading-none">
                    {formatValue(totalExpense)}
                  </span>
                </div>
              </div>

              {/* Slices legend list */}
              <div className="flex-1 space-y-1.5 w-full">
                {expenseData.slice(0, 4).map((entry, idx) => {
                  const pct = totalExpense > 0 ? Math.round((entry.value / totalExpense) * 100) : 0;
                  return (
                    <div key={entry.name} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        <span className="font-bold text-on-surface truncate max-w-[110px]">{getCategoryLabel(entry.name)}</span>
                      </div>
                      <div className="text-right font-semibold">
                        <span className="text-on-surface font-extrabold mr-1">{formatValue(entry.value)}</span>
                        <span className="text-[10px] text-outline">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
                {expenseData.length > 4 && (
                  <p className="text-[9px] text-outline text-right font-bold">
                    + {expenseData.length - 4} {user.language === "Indonesia" ? "kategori lainnya" : "more categories"}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* COMPARISON CARD - INCOME VS EXPENSE */}
        <div className="flex flex-col justify-between space-y-4 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-6">
          <div>
            <h3 className="text-xs font-bold text-outline uppercase tracking-wider mb-1">
              {user.language === "Indonesia" ? "Arus Kas & Perbandingan" : "Cash Flow & Comparison"}
            </h3>
            <h2 className="text-lg font-bold text-on-surface">
              {user.language === "Indonesia" ? "Pendapatan vs Pengeluaran" : "Income vs Expenses"}
            </h2>
          </div>

          <div className="space-y-3.5">
            {/* Income Metric Row */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {user.language === "Indonesia" ? "Total Pendapatan" : "Total Income"}
                </span>
                <span className="font-bold text-emerald-800 tabular-nums">{formatValue(totalIncome)}</span>
              </div>
              <div className="h-2 w-full bg-emerald-50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${totalIncome + totalExpense > 0 ? (totalIncome / (totalIncome + totalExpense)) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Expense Metric Row */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-rose-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  {user.language === "Indonesia" ? "Total Pengeluaran" : "Total Expenses"}
                </span>
                <span className="font-bold text-rose-800 tabular-nums">{formatValue(totalExpense)}</span>
              </div>
              <div className="h-2 w-full bg-rose-50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${totalIncome + totalExpense > 0 ? (totalExpense / (totalIncome + totalExpense)) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Net Cash Flow Box */}
            <div className={`p-3 rounded-2xl flex justify-between items-center ${totalIncome >= totalExpense ? "bg-emerald-50/40 border border-emerald-100" : "bg-rose-50/40 border border-rose-100"}`}>
              <div>
                <span className="text-[9px] font-bold text-outline uppercase tracking-wider block leading-none mb-1">
                  {user.language === "Indonesia" ? "Sisa Arus Kas Bersih" : "Net Cash Flow Balance"}
                </span>
                <span className={`text-sm font-black ${totalIncome >= totalExpense ? "text-emerald-800" : "text-rose-800"}`}>
                  {totalIncome >= totalExpense ? "+" : "-"}{formatValue(Math.abs(totalIncome - totalExpense))}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-outline uppercase tracking-wider block leading-none mb-1">
                  {user.language === "Indonesia" ? "Rasio Menabung" : "Savings Rate"}
                </span>
                <span className={`text-xs font-extrabold ${totalIncome >= totalExpense ? "text-emerald-700" : "text-rose-700"}`}>
                  {totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TABS */}
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        {(["All", "Income", "Expense"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-semibold text-sm transition-all focus:outline-none relative ${
              activeTab === tab ? "text-primary border-b-2 border-primary" : "text-outline hover:text-on-surface"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TRANSACTION LIST */}
      <div className="space-y-6 pb-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 p-8">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-on-surface">No transactions found</h3>
            <p className="text-sm text-on-surface-variant mt-1">Try modifying your search or filter options.</p>
          </div>
        ) : (
          Object.keys(groupedTransactions).map(dateGroup => (
            <div key={dateGroup} className="space-y-2.5">
              <h2 className="text-xs font-semibold text-outline uppercase tracking-wider pl-2">{dateGroup}</h2>
              <div className="bg-white rounded-3xl p-2.5 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 divide-y divide-gray-100">
                {groupedTransactions[dateGroup].map(tx => (
                  <div 
                    key={tx.id}
                    className="flex items-center justify-between p-3.5 hover:bg-gray-50/50 rounded-2xl transition-colors cursor-pointer group"
                    onClick={() => startEditingTx(tx)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getCategoryBg(tx.category)}`}>
                        {getCategoryIcon(tx.category)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-on-surface leading-snug">{tx.merchant}</span>
                        <span className="text-xs text-on-surface-variant font-medium leading-snug">
                          {tx.time} • {assets.find(a => a.id === tx.accountId)?.name || tx.paymentMethod}
                        </span>
                      </div>
                    </div>
                    <div className={`text-sm font-bold tabular-nums ${tx.type === "income" ? "text-primary" : "text-on-surface"}`}>
                      {tx.type === "income" ? "+" : "-"}{formatValue(Math.abs(tx.amount))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* SCANNING MODAL */}
      <AnimatePresence>
        {showScanner && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-2 text-primary">
                  <ReceiptText className="w-5 h-5" />
                  <h3 className="text-lg font-bold">AI Receipt Scanner</h3>
                </div>
                <button 
                  onClick={() => setShowScanner(false)}
                  className="p-1.5 rounded-full hover:bg-gray-200 text-outline hover:text-on-surface transition-colors focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {!scanLoading && !scanResult && (
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-3 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      dragActive ? "border-primary bg-emerald-50/30" : "border-gray-200 hover:border-emerald-200 hover:bg-gray-50/40"
                    }`}
                  >
                    <FileUp className="w-12 h-12 text-outline mb-4" />
                    <h4 className="text-sm font-bold text-on-surface">{t(user.language, "uploadReceiptPhoto")}</h4>
                    <p className="text-xs text-outline font-semibold mt-1">{t(user.language, "dragDrop")}</p>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    <div className="relative flex py-3 items-center w-full mt-6">
                      <div className="flex-grow border-t border-gray-100"></div>
                      <span className="flex-shrink mx-4 text-xs font-bold text-outline uppercase tracking-wider">or</span>
                      <div className="flex-grow border-t border-gray-100"></div>
                    </div>

                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerDemoScanning("Booting local OCR sandbox pipeline...");
                      }}
                      className="mt-2 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-primary-container px-4 py-2.5 rounded-xl border border-emerald-100 transition-colors"
                    >
                      Instant Demo Mock Scan
                    </button>
                  </div>
                )}

                {scanLoading && (
                  <div className="py-12 flex flex-col items-center text-center gap-6">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <div className="absolute inset-0 border-4 border-emerald-100 rounded-full animate-pulse"></div>
                      <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <ReceiptText className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-on-surface animate-pulse">Processing Receipt...</h4>
                      <p className="text-xs text-outline font-semibold max-w-sm">{scanProgress}</p>
                    </div>
                  </div>
                )}

                {scanResult && !scanLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-2xl flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-primary">AI Classification Complete!</h4>
                        <p className="text-xs text-emerald-800 font-semibold mt-0.5">Please review the parsed details before saving.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-gray-50/50 rounded-2xl p-5 border border-gray-100 text-sm font-sans">
                      <div>
                        <span className="text-xs font-bold text-outline uppercase tracking-wider block mb-0.5">Store / Merchant</span>
                        <span className="font-bold text-on-surface">{scanResult.merchant}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-outline uppercase tracking-wider block mb-0.5">Total Amount</span>
                        <span className="font-bold text-on-surface">{formatValue(scanResult.amount)}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-outline uppercase tracking-wider block mb-0.5">Category</span>
                        <span className="font-semibold text-primary">{scanResult.category}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-outline uppercase tracking-wider block mb-0.5">Payment Method</span>
                        <span className="font-medium text-on-surface">{scanResult.paymentMethod}</span>
                      </div>
                      <div className="col-span-2 border-t border-gray-100 pt-3">
                        <span className="text-xs font-bold text-outline uppercase tracking-wider block mb-1">Items Scanned</span>
                        {scanResult.items && scanResult.items.length > 0 ? (
                          <ul className="list-disc pl-4 text-xs font-medium text-on-surface-variant space-y-1">
                            {scanResult.items.map((it: string, i: number) => (
                              <li key={i}>{it}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-xs text-outline font-semibold">No distinct items scanned.</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button 
                        onClick={() => setScanResult(null)}
                        className="flex-1 bg-gray-50 hover:bg-gray-100 text-on-surface border border-gray-200 font-semibold py-3 rounded-xl transition-all active:scale-[0.98] text-sm cursor-pointer"
                      >
                        Scan New
                      </button>
                      <button 
                        onClick={handleApproveScan}
                        className="flex-1 bg-primary hover:bg-primary-container text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Approve & Save</span>
                        <ArrowRight className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDITING MODAL */}
      <AnimatePresence>
        {editingTx && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100"
            >
              {/* Header */}
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-bold text-primary flex items-center gap-1.5">
                  <CreditCard className="w-5 h-5" />
                  <span>{user.language === "Indonesia" ? "Edit Transaksi" : "Edit Transaction"}</span>
                </h3>
                <button 
                  onClick={() => setEditingTx(null)}
                  className="p-1.5 rounded-full hover:bg-gray-200 text-outline hover:text-on-surface transition-colors focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form body */}
              <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                
                {/* Type selector toggle */}
                <div className="flex gap-2 p-1 bg-[#F3F4F6] rounded-xl select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setEditType("expense");
                      setEditCategory("");
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 focus:outline-none cursor-pointer ${
                      editType === "expense" ? "bg-white text-red-600 shadow-sm" : "text-outline hover:text-on-surface"
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>{t(user.language, "expense")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditType("income");
                      setEditCategory("");
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 focus:outline-none cursor-pointer ${
                      editType === "income" ? "bg-white text-primary shadow-sm" : "text-outline hover:text-on-surface"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t(user.language, "income")}</span>
                  </button>
                </div>

                {/* Merchant / Description */}
                <div>
                  <label className="text-xs font-bold text-outline uppercase tracking-wider mb-1 block ml-0.5">
                    {user.language === "Indonesia" ? "Nama Merchant / Penerima" : "Merchant / Payee"}
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Starbucks, Salary Deposit"
                    value={editMerchant}
                    onChange={(e) => setEditMerchant(e.target.value)}
                    className="w-full bg-[#F3F4F6] text-on-surface rounded-xl px-4 py-2.5 border-none focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all text-sm font-medium"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs font-bold text-outline uppercase tracking-wider mb-1 block ml-0.5">
                    {user.language === "Indonesia" ? `Jumlah (${user.currency})` : `Amount (${user.currency})`}
                  </label>
                  <div className="flex items-center bg-[#F3F4F6] rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:bg-white transition-all overflow-hidden">
                    <span className="pl-4 font-bold text-outline select-none">{user.currency === 'IDR' ? 'Rp' : '$'}</span>
                    <input 
                      type="number"
                      required
                      placeholder="0"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full bg-transparent px-3 py-2.5 border-none focus:outline-none text-sm font-bold tracking-tight"
                    />
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-outline uppercase tracking-wider mb-1 block ml-0.5">
                      {user.language === "Indonesia" ? "Tanggal" : "Date"}
                    </label>
                    <input 
                      type="date"
                      required
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full bg-[#F3F4F6] text-on-surface rounded-xl px-3 py-2 border-none focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-outline uppercase tracking-wider mb-1 block ml-0.5">
                      {user.language === "Indonesia" ? "Waktu" : "Time"}
                    </label>
                    <input 
                      type="text"
                      required
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      placeholder="12:00 PM"
                      className="w-full bg-[#F3F4F6] text-on-surface rounded-xl px-3 py-2.5 border-none focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="text-xs font-bold text-outline uppercase tracking-wider mb-1 block ml-0.5">
                      {t(user.language, "category")}
                    </label>
                    <select
                      required
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full bg-[#F3F4F6] text-on-surface rounded-xl px-3 py-2.5 border-none focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all text-xs font-bold"
                    >
                      <option value="" disabled>Choose...</option>
                      {editCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Account / Asset */}
                  <div>
                    <label className="text-xs font-bold text-outline uppercase tracking-wider mb-1 block ml-0.5">
                      {user.language === "Indonesia" ? "Akun Sumber/Tujuan" : "Account"}
                    </label>
                    <select
                      required
                      value={editAccountId}
                      onChange={(e) => setEditAccountId(e.target.value)}
                      className="w-full bg-[#F3F4F6] text-on-surface rounded-xl px-3 py-2.5 border-none focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all text-xs font-bold"
                    >
                      <option value="" disabled>Choose...</option>
                      {assets.map(ast => (
                        <option key={ast.id} value={ast.id}>{ast.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-outline uppercase tracking-wider mb-1 block ml-0.5">
                    {t(user.language, "notes")}
                  </label>
                  <textarea 
                    placeholder="Additional transaction info..."
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-[#F3F4F6] text-on-surface rounded-xl px-4 py-2 border-none focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all text-xs font-medium resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={handleDeleteClick}
                    className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-3.5 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs border border-rose-100 cursor-pointer"
                  >
                    <span>{user.language === "Indonesia" ? "Hapus" : "Delete"}</span>
                  </button>

                  <button 
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-container text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-1.5 transition-all text-sm cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{t(user.language, "save")}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
