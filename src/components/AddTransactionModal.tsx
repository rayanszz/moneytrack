/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Plus, Minus, CreditCard, Save, Camera, Loader2 } from "lucide-react";
import { Transaction, User } from "../types";
import { t } from "../i18n";
import { preprocessReceiptImage } from "../utils/imagePreprocessor";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (tx: Omit<Transaction, "id">) => void;
  defaultType?: "income" | "expense";
  user: User;
}

export default function AddTransactionModal({ isOpen, onClose, onAdd, defaultType = "expense", user }: AddTransactionModalProps) {
  const [type, setType] = useState<"income" | "expense">(defaultType);
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Chase Visa");
  const [notes, setNotes] = useState("");

  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      // Preprocess image with resizing, grayscaling, and contrast boosting (CV-like system)
      const { base64 } = await preprocessReceiptImage(file);
      
      const response = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg" }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to scan receipt");
      }

      const data = await response.json();
      
      if (data.merchant) setMerchant(data.merchant);
      if (data.amount) setAmount(data.amount.toString());
      if (data.category) setCategory(data.category);
      if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
      if (data.items && data.items.length > 0) setNotes("Items:\n" + data.items.join("\n"));
      setType("expense");
    } catch (error: any) {
      console.error("Error scanning receipt:", error);
      alert(`Error scanning receipt: ${error.message || 'Please try again.'}`);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const categories = type === "income" 
    ? ["Salary", "Investments", "Gifts", "Miscellaneous"]
    : ["Food & Dining", "Rent", "Travel", "Shopping", "Utilities", "Miscellaneous"];

  const paymentMethods = ["Chase Visa", "Amex Platinum", "Checking Acct", "Cash"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant || !amount || !category) return;

    onAdd({
      merchant,
      amount: type === "income" ? Math.abs(Number(amount)) : -Math.abs(Number(amount)),
      category,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      paymentMethod,
      type,
      notes: notes.trim() || undefined
    });

    // Reset fields
    setMerchant("");
    setAmount("");
    setCategory("");
    setPaymentMethod("Chase Visa");
    setNotes("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
                <span>{t(user.language, "addTransaction")}</span>
              </h3>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-200 text-outline hover:text-on-surface transition-colors focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Scan Receipt Button */}
              <div className="flex justify-center mb-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  ref={fileInputRef}
                  className="hidden" 
                  onChange={handleScanReceipt}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-indigo-100 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                  <span>{isScanning ? "Scanning with AI..." : "Scan Receipt (AI)"}</span>
                </button>
              </div>

              {/* Type selector toggle */}
              <div className="flex gap-2 p-1 bg-[#F3F4F6] rounded-xl select-none">
                <button
                  type="button"
                  onClick={() => {
                    setType("expense");
                    setCategory("");
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 focus:outline-none cursor-pointer ${
                    type === "expense" ? "bg-white text-red-600 shadow-sm" : "text-outline hover:text-on-surface"
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>{t(user.language, "expense")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType("income");
                    setCategory("");
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 focus:outline-none cursor-pointer ${
                    type === "income" ? "bg-white text-primary shadow-sm" : "text-outline hover:text-on-surface"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t(user.language, "income")}</span>
                </button>
              </div>

              {/* Merchant / Description */}
              <div>
                <label className="text-xs font-bold text-outline uppercase tracking-wider mb-1 block ml-0.5">Merchant / Payee</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Starbucks, Salary Deposit"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full bg-[#F3F4F6] text-on-surface rounded-xl px-4 py-2.5 border-none focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all text-sm font-medium"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-bold text-outline uppercase tracking-wider mb-1 block ml-0.5">Amount ({user.currency})</label>
                <div className="flex items-center bg-[#F3F4F6] rounded-xl focus-within:ring-2 focus-within:ring-primary focus-within:bg-white transition-all overflow-hidden">
                  <span className="pl-4 font-bold text-outline select-none">{user.currency === 'IDR' ? 'Rp' : '$'}</span>
                  <input 
                    type="text"
                    required
                    placeholder="0"
                    value={amount === "" || amount === "0" ? "" : new Intl.NumberFormat(user.currency === 'IDR' ? 'id-ID' : 'en-US').format(Number(amount))}
                    onChange={(e) => {
                      const val = parseInt(e.target.value.replace(/\D/g, ''));
                      setAmount(isNaN(val) ? "" : val.toString());
                    }}
                    className="w-full bg-transparent px-3 py-2.5 border-none focus:outline-none text-sm font-bold tracking-tight"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="text-xs font-bold text-outline uppercase tracking-wider mb-1 block ml-0.5">{t(user.language, "category")}</label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#F3F4F6] text-on-surface rounded-xl px-3 py-2.5 border-none focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all text-xs font-bold"
                  >
                    <option value="" disabled>Choose...</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-xs font-bold text-outline uppercase tracking-wider mb-1 block ml-0.5">{t(user.language, "paymentMethod")}</label>
                  <select
                    required
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-[#F3F4F6] text-on-surface rounded-xl px-3 py-2.5 border-none focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all text-xs font-bold"
                  >
                    {paymentMethods.map(pm => (
                      <option key={pm} value={pm}>{pm}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-outline uppercase tracking-wider mb-1 block ml-0.5">{t(user.language, "notes")}</label>
                <textarea 
                  placeholder="Additional transaction info..."
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#F3F4F6] text-on-surface rounded-xl px-4 py-2 border-none focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all text-xs font-medium resize-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-primary hover:bg-primary-container text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-1.5 transition-all text-sm mt-4 cursor-pointer"
              >
                <Save className="w-4.5 h-4.5" />
                <span>{t(user.language, "save")}</span>
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
