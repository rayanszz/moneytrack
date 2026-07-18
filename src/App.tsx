/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { t } from "./i18n";
import { 
  Home as HomeIcon, 
  Wallet, 
  PieChart, 
  TrendingUp, 
  Bell, 
  Settings as SettingsIcon, 
  Menu, 
  X,
  Plus,
  ReceiptText
} from "lucide-react";

import { User, Transaction, Asset, ForecastScenario, Budget } from "./types";
import { 
  loadUserDataFromFirestore, 
  saveUserSettingToFirestore, 
  addTransactionToFirestore, 
  updateTransactionInFirestore,
  deleteTransactionFromFirestore,
  updateAssetInFirestore,
  deleteAssetFromFirestore,
  addScenarioToFirestore,
  deleteScenarioFromFirestore
} from "./firestoreApi";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

// Import custom views
import SignIn from "./components/SignIn";
import Dashboard from "./components/Dashboard";
import Transactions from "./components/Transactions";
import Portfolio from "./components/Portfolio";
import Forecast from "./components/Forecast";
import Settings from "./components/Settings";
import AddTransactionModal from "./components/AddTransactionModal";

export default function App() {
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Core application states
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [budget, setBudget] = useState<Budget>({ limit: 5000, spent: 4200 });
  const [scenarios, setScenarios] = useState<ForecastScenario[]>([]);

  // Navigation and Modals state
  const [activeTab, setActiveTab] = useState<"home" | "transactions" | "portfolio" | "forecast" | "settings">("home");
  const [isAddTxOpen, setIsAddTransactionOpen] = useState(false);
  const [addTxDefaultType, setAddTxDefaultType] = useState<"income" | "expense">("expense");

  // Check login on startup
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        await handleLoginSuccess(firebaseUser.email, firebaseUser.uid);
      } else {
        setLoggedInEmail(null);
        setUserId(null);
        setUser(null);
        setIsInitializing(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = async (email: string, uid: string) => {
    try {
      const data = await loadUserDataFromFirestore(uid, email);
      setUser(data.user);
      setTransactions(data.transactions);
      setAssets(data.assets);
      setBudget(data.budget);
      setScenarios(data.scenarios);
      setLoggedInEmail(email);
      setUserId(uid);
      setActiveTab("home");
    } catch (e) {
      console.error("Failed to load user data from Firestore", e);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setLoggedInEmail(null);
    setUserId(null);
    setUser(null);
  };

  // Sync settings updates to Firestore
  const syncSettings = async (
    updatedUser: User,
    updatedBudget: Budget
  ) => {
    if (userId) {
      await saveUserSettingToFirestore(userId, updatedUser, updatedBudget);
    }
  };

  // Budget Updater
  const handleUpdateBudget = async (newBudget: Budget) => {
    if (!userId || !user) return;
    setBudget(newBudget);
    await saveUserSettingToFirestore(userId, user, newBudget);
  };

  // Add Transaction Handler
  const handleAddTransaction = async (newTx: Omit<Transaction, "id">) => {
    if (!user || !userId) return;
    const txWithId: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}`
    };

    const updatedTxs = [txWithId, ...transactions];
    setTransactions(updatedTxs);

    // Save to Firestore
    await addTransactionToFirestore(userId, txWithId);

    // Update dynamic budget spent if it's an expense
    let updatedBudget = { ...budget };
    if (newTx.type === "expense") {
      updatedBudget.spent = Math.min(budget.spent + Math.abs(newTx.amount), budget.limit);
      setBudget(updatedBudget);
      await saveUserSettingToFirestore(userId, user, updatedBudget);
    }

    // Dynamic asset distribution recalculation: Update Cash Asset or allocation value based on transaction
    const updatedAssets = [...assets];
    let cashAsset = updatedAssets.find(a => a.type === "Cash");
    if (cashAsset) {
      const newCashValue = Math.max(0, cashAsset.value + (newTx.type === "income" ? Math.abs(newTx.amount) : -Math.abs(newTx.amount)));
      cashAsset.value = newCashValue;
    }

    // Recompute total allocations percentages
    const totalAssetVal = updatedAssets.reduce((acc, a) => acc + a.value, 0);
    const fullyUpdatedAssets = updatedAssets.map(asset => {
      const newAllocation = totalAssetVal > 0 ? Math.round((asset.value / totalAssetVal) * 100) : 0;
      if (asset.allocationPercent !== newAllocation || (cashAsset && asset.id === cashAsset.id)) {
         const updatedAsset = { ...asset, allocationPercent: newAllocation };
         updateAssetInFirestore(userId, updatedAsset).catch(console.error);
         return updatedAsset;
      }
      return asset;
    });
    setAssets(fullyUpdatedAssets);
  };

  // Update Transaction Handler
  const handleUpdateTransaction = async (updatedTx: Transaction) => {
    if (!user || !userId) return;

    // Find the old transaction to compute differential values
    const oldTx = transactions.find(t => t.id === updatedTx.id);
    if (!oldTx) return;

    // Replace the transaction in local state
    const updatedTxs = transactions.map(t => t.id === updatedTx.id ? updatedTx : t);
    setTransactions(updatedTxs);

    // Save to Firestore
    await updateTransactionInFirestore(userId, updatedTx);

    // Calculate budget adjustment
    let updatedBudget = { ...budget };
    const oldExpenseAmt = oldTx.type === "expense" ? Math.abs(oldTx.amount) : 0;
    const newExpenseAmt = updatedTx.type === "expense" ? Math.abs(updatedTx.amount) : 0;
    const diffExpense = newExpenseAmt - oldExpenseAmt;

    if (diffExpense !== 0) {
      updatedBudget.spent = Math.max(0, Math.min(budget.spent + diffExpense, budget.limit));
      setBudget(updatedBudget);
      await saveUserSettingToFirestore(userId, user, updatedBudget);
    }

    // Calculate cash asset adjustment
    const oldCashEffect = oldTx.type === "income" ? Math.abs(oldTx.amount) : -Math.abs(oldTx.amount);
    const newCashEffect = updatedTx.type === "income" ? Math.abs(updatedTx.amount) : -Math.abs(updatedTx.amount);
    const diffCash = newCashEffect - oldCashEffect;

    const updatedAssets = [...assets];
    let cashAsset = updatedAssets.find(a => a.type === "Cash");
    if (cashAsset && diffCash !== 0) {
      const newCashValue = Math.max(0, cashAsset.value + diffCash);
      cashAsset.value = newCashValue;
    }

    // Recompute total allocations percentages
    const totalAssetVal = updatedAssets.reduce((acc, a) => acc + a.value, 0);
    const fullyUpdatedAssets = updatedAssets.map(asset => {
      const newAllocation = totalAssetVal > 0 ? Math.round((asset.value / totalAssetVal) * 100) : 0;
      if (asset.allocationPercent !== newAllocation || (cashAsset && asset.id === cashAsset.id)) {
        const updatedAsset = { ...asset, allocationPercent: newAllocation };
        updateAssetInFirestore(userId, updatedAsset).catch(console.error);
        return updatedAsset;
      }
      return asset;
    });
    setAssets(fullyUpdatedAssets);
  };

  // Delete Transaction Handler
  const handleDeleteTransaction = async (txId: string) => {
    if (!user || !userId) return;

    // Find the transaction to reverse its effect
    const txToDelete = transactions.find(t => t.id === txId);
    if (!txToDelete) return;

    // Remove from local state
    const updatedTxs = transactions.filter(t => t.id !== txId);
    setTransactions(updatedTxs);

    // Delete from Firestore
    await deleteTransactionFromFirestore(userId, txId);

    // Update dynamic budget spent if it's an expense
    let updatedBudget = { ...budget };
    if (txToDelete.type === "expense") {
      updatedBudget.spent = Math.max(0, budget.spent - Math.abs(txToDelete.amount));
      setBudget(updatedBudget);
      await saveUserSettingToFirestore(userId, user, updatedBudget);
    }

    // Revert Cash Asset value
    const updatedAssets = [...assets];
    let cashAsset = updatedAssets.find(a => a.type === "Cash");
    if (cashAsset) {
      const reversedAmount = txToDelete.type === "income" ? -Math.abs(txToDelete.amount) : Math.abs(txToDelete.amount);
      const newCashValue = Math.max(0, cashAsset.value + reversedAmount);
      cashAsset.value = newCashValue;
    }

    // Recompute total allocations percentages
    const totalAssetVal = updatedAssets.reduce((acc, a) => acc + a.value, 0);
    const fullyUpdatedAssets = updatedAssets.map(asset => {
      const newAllocation = totalAssetVal > 0 ? Math.round((asset.value / totalAssetVal) * 100) : 0;
      if (asset.allocationPercent !== newAllocation || (cashAsset && asset.id === cashAsset.id)) {
        const updatedAsset = { ...asset, allocationPercent: newAllocation };
        updateAssetInFirestore(userId, updatedAsset).catch(console.error);
        return updatedAsset;
      }
      return asset;
    });
    setAssets(fullyUpdatedAssets);
  };

  // Asset Handlers
  const handleAddAsset = async (newAsset: Omit<Asset, "id">) => {
    if (!user || !userId) return;
    const asset: Asset = { ...newAsset, id: `ast-${Date.now()}` };
    const updatedAssets = [...assets, asset];
    // Recompute allocations
    const total = updatedAssets.reduce((acc, a) => acc + a.value, 0);
    const finalAssets = updatedAssets.map(a => ({
      ...a,
      allocationPercent: total > 0 ? Math.round((a.value / total) * 100) : 0
    }));
    setAssets(finalAssets);
    await updateAssetInFirestore(userId, asset);
    // Note: We should ideally update all allocations in firestore too, but for now we just save the new one and compute dynamically
  };

  const handleUpdateAsset = async (updatedAsset: Asset) => {
    if (!user || !userId) return;
    const idx = assets.findIndex(a => a.id === updatedAsset.id);
    if (idx === -1) return;
    const newAssets = [...assets];
    newAssets[idx] = updatedAsset;
    const total = newAssets.reduce((acc, a) => acc + a.value, 0);
    const finalAssets = newAssets.map(a => ({
      ...a,
      allocationPercent: total > 0 ? Math.round((a.value / total) * 100) : 0
    }));
    setAssets(finalAssets);
    await updateAssetInFirestore(userId, updatedAsset);
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!user || !userId) return;
    const newAssets = assets.filter(a => a.id !== assetId);
    const total = newAssets.reduce((acc, a) => acc + a.value, 0);
    const finalAssets = newAssets.map(a => ({
      ...a,
      allocationPercent: total > 0 ? Math.round((a.value / total) * 100) : 0
    }));
    setAssets(finalAssets);
    await deleteAssetFromFirestore(userId, assetId);
  };

  // Save scenario Forecast handler
  const handleSaveScenario = async (sc: Omit<ForecastScenario, "id" | "dateCreated">) => {
    if (!user || !userId) return;
    const newSc: ForecastScenario = {
      ...sc,
      id: `sc-${Date.now()}`,
      dateCreated: new Date().toISOString().split("T")[0]
    };
    const updatedSc = [newSc, ...scenarios];
    setScenarios(updatedSc);
    await addScenarioToFirestore(userId, newSc);
  };

  // Delete scenario Forecast handler
  const handleDeleteScenario = async (id: string) => {
    if (!user || !userId) return;
    const updatedSc = scenarios.filter(sc => sc.id !== id);
    setScenarios(updatedSc);
    await deleteScenarioFromFirestore(userId, id);
  };

  // User Settings update handler
  const handleUpdateUser = async (updatedUser: User) => {
    setUser(updatedUser);
    await syncSettings(updatedUser, budget);
  };

  // Pre-calculated principal value for dynamic forecast
  const portfolioPrincipal = assets.reduce((acc, a) => acc + a.value, 0);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center items-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not logged in, render authentication flow first (requested feature)
  if (!loggedInEmail || !userId || !user) {
    return <SignIn onSuccess={handleLoginSuccess} />;
  }

  // Active view rendering mapper
  const renderActiveView = () => {
    switch (activeTab) {
      case "home":
        return (
          <Dashboard 
            user={user}
            transactions={transactions}
            budget={budget}
            assets={assets}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onOpenAddTransaction={(type) => {
              setAddTxDefaultType(type);
              setIsAddTransactionOpen(true);
            }}
            onUpdateBudget={handleUpdateBudget}
          />
        );
      case "transactions":
        return (
          <Transactions 
            user={user}
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onOpenAddTransaction={(type) => {
              setAddTxDefaultType(type);
              setIsAddTransactionOpen(true);
            }}
          />
        );
      case "portfolio":
        return (
          <Portfolio 
            user={user}
            assets={assets}
            transactions={transactions}
            onAddAsset={handleAddAsset}
            onUpdateAsset={handleUpdateAsset}
            onDeleteAsset={handleDeleteAsset}
          />
        );
      case "forecast":
        return (
          <Forecast 
            user={user}
            initialPrincipal={portfolioPrincipal}
            savedScenarios={scenarios}
            onSaveScenario={handleSaveScenario}
            onDeleteScenario={handleDeleteScenario}
          />
        );
      case "settings":
        return (
          <Settings 
            user={user}
            onUpdateUser={handleUpdateUser}
            onLogout={handleLogout}
            onBack={() => setActiveTab("home")}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen ${user.theme === "Dark" ? "dark bg-gray-950 text-gray-100" : "bg-[#F9FAFB] text-on-background"} font-sans pb-24 md:pb-6`}>
      {/* DESKTOP TOP BAR (image responsive rule) */}
      <header className="hidden md:flex fixed top-0 w-full z-40 justify-between items-center px-10 py-3.5 bg-white shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("home")}>
          <div className="w-8 h-8 text-primary flex items-center justify-center">
            {/* SVG Logo in Header */}
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path d="M50,15 L80,32 L80,68 L50,85 L20,68 L20,32 Z" fill="none" stroke="#10b981" strokeWidth="10" strokeLinejoin="round" />
              <path d="M30,50 L40,40 L50,45 L68,25 M60,25 L68,25 L68,33" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-primary">Moneytrack</h1>
        </div>

        {/* Desktop Nav Items */}
        <nav className="flex items-center gap-6 select-none">
          <button 
            onClick={() => setActiveTab("home")}
            className={`font-semibold text-sm rounded-xl px-4 py-2 transition-all cursor-pointer ${
              activeTab === "home" ? "bg-emerald-50 text-primary" : "text-on-surface-variant hover:bg-gray-50"
            }`}
          >
            {t(user.language, "dashboard")}
          </button>
          <button 
            onClick={() => setActiveTab("transactions")}
            className={`font-semibold text-sm rounded-xl px-4 py-2 transition-all cursor-pointer ${
              activeTab === "transactions" ? "bg-emerald-50 text-primary" : "text-on-surface-variant hover:bg-gray-50"
            }`}
          >
            {t(user.language, "transactions")}
          </button>
          <button 
            onClick={() => setActiveTab("portfolio")}
            className={`font-semibold text-sm rounded-xl px-4 py-2 transition-all cursor-pointer ${
              activeTab === "portfolio" ? "bg-emerald-50 text-primary" : "text-on-surface-variant hover:bg-gray-50"
            }`}
          >
            {t(user.language, "portfolio")}
          </button>
          <button 
            onClick={() => setActiveTab("forecast")}
            className={`font-semibold text-sm rounded-xl px-4 py-2 transition-all cursor-pointer ${
              activeTab === "forecast" ? "bg-emerald-50 text-primary" : "text-on-surface-variant hover:bg-gray-50"
            }`}
          >
            {t(user.language, "forecast")}
          </button>
        </nav>

        {/* Right Info area */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => alert("Notification panel: No new announcements today.")}
            className="p-2 rounded-full hover:bg-gray-50 text-on-surface-variant transition-colors active:scale-95 focus:outline-none cursor-pointer"
          >
            <Bell className="w-5.5 h-5.5" />
          </button>

          <button 
            onClick={() => setActiveTab("settings")}
            className="flex items-center gap-2 focus:outline-none cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 group-hover:border-primary transition-all">
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            </div>
            <span className="font-semibold text-sm text-on-surface group-hover:text-primary transition-colors">{user.name}</span>
          </button>
        </div>
      </header>

      {/* MOBILE HEADER (MOBILE ONLY, STICKY HEADER) */}
      {activeTab !== "settings" && (
        <header className="md:hidden fixed top-0 w-full z-30 flex justify-between items-center px-5 py-3 bg-white/90 backdrop-blur-md border-b border-gray-100">
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setActiveTab("home")}>
            <div className="w-6 h-6 text-primary flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M50,15 L80,32 L80,68 L50,85 L20,68 L20,32 Z" fill="none" stroke="#10b981" strokeWidth="12" strokeLinejoin="round" />
                <path d="M30,50 L40,40 L50,45 L68,25" fill="none" stroke="#10b981" strokeWidth="10" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-extrabold text-base tracking-tight text-primary uppercase">Moneytrack</span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab("settings")}
              className="p-1.5 rounded-full hover:bg-gray-100 text-on-surface-variant transition-colors focus:outline-none cursor-pointer"
            >
              <SettingsIcon className="w-5.5 h-5.5" />
            </button>
            <div 
              className="w-8.5 h-8.5 rounded-full overflow-hidden border border-gray-200 cursor-pointer shadow-sm active:scale-95 transition-all"
              onClick={() => setActiveTab("settings")}
            >
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            </div>
          </div>
        </header>
      )}

      {/* MAIN VIEW CANVAS STAGE */}
      <main className="max-w-4xl mx-auto px-5 pt-18 md:pt-28 pb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
          >
            {renderActiveView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (Tall device bottom padding compliant) */}
      <nav className="md:hidden fixed bottom-0 w-full z-40 flex justify-around items-center px-4 pb-6 pt-3 bg-white/90 backdrop-blur-md rounded-t-3xl border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] select-none">
        
        {/* Tab 1: Home */}
        <button 
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center justify-center transition-all duration-200 focus:outline-none cursor-pointer ${
            activeTab === "home" 
              ? "bg-primary text-white rounded-2xl px-5 py-2 scale-105 shadow-sm" 
              : "text-outline hover:text-on-surface px-4 py-2"
          }`}
        >
          <HomeIcon className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">{t(user.language, "dashboard")}</span>
        </button>

        {/* Tab 2: Transactions */}
        <button 
          onClick={() => setActiveTab("transactions")}
          className={`flex flex-col items-center justify-center transition-all duration-200 focus:outline-none cursor-pointer ${
            activeTab === "transactions" 
              ? "bg-primary text-white rounded-2xl px-5 py-2 scale-105 shadow-sm" 
              : "text-outline hover:text-on-surface px-4 py-2"
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">{t(user.language, "transactions")}</span>
        </button>

        {/* Tab 3: Portfolio */}
        <button 
          onClick={() => setActiveTab("portfolio")}
          className={`flex flex-col items-center justify-center transition-all duration-200 focus:outline-none cursor-pointer ${
            activeTab === "portfolio" 
              ? "bg-primary text-white rounded-2xl px-5 py-2 scale-105 shadow-sm" 
              : "text-outline hover:text-on-surface px-4 py-2"
          }`}
        >
          <PieChart className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">{t(user.language, "portfolio")}</span>
        </button>

        {/* Tab 4: Forecast */}
        <button 
          onClick={() => setActiveTab("forecast")}
          className={`flex flex-col items-center justify-center transition-all duration-200 focus:outline-none cursor-pointer ${
            activeTab === "forecast" 
              ? "bg-primary text-white rounded-2xl px-5 py-2 scale-105 shadow-sm" 
              : "text-outline hover:text-on-surface px-4 py-2"
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">{t(user.language, "forecast")}</span>
        </button>
      </nav>

      {/* FAB (Floating Action Button) on Desktop for Quick Addition */}
      <button 
        onClick={() => {
          setAddTxDefaultType("expense");
          setIsAddTransactionOpen(true);
        }}
        className="hidden md:flex fixed bottom-8 right-8 z-40 bg-primary hover:bg-primary-container text-white w-14 h-14 rounded-full items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer focus:outline-none border border-emerald-950"
        title="Add Transaction"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* REUSABLE ADD TRANSACTION FORM MODAL */}
      <AddTransactionModal 
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTransactionOpen(false)}
        onAdd={handleAddTransaction}
        defaultType={addTxDefaultType}
        user={user}
      />
    </div>
  );
}
