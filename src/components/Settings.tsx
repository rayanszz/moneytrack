/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, User as UserIcon, Lock, Globe, Coins, Palette, Bell, Mail, HelpCircle, ShieldAlert, Info, LogOut, ExternalLink, Check, Save, ChevronRight } from "lucide-react";
import { User } from "../types";

interface SettingsProps {
  user: User;
  onUpdateUser: (updated: User) => void;
  onLogout: () => void;
  onBack: () => void;
}

export default function Settings({ user, onUpdateUser, onLogout, onBack }: SettingsProps) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);
  const [avatarInput, setAvatarInput] = useState(user.avatarUrl || "");

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      ...user,
      name: editName,
      email: editEmail,
      avatarUrl: avatarInput || undefined
    });
    setIsEditingProfile(false);
    alert("Profile settings updated successfully!");
  };

  const togglePush = () => {
    onUpdateUser({
      ...user,
      pushNotifications: !user.pushNotifications
    });
  };

  const toggleEmailAlerts = () => {
    onUpdateUser({
      ...user,
      emailAlerts: !user.emailAlerts
    });
  };

  const handleCurrencyChange = (curr: string) => {
    onUpdateUser({ ...user, currency: curr });
  };

  const handleThemeChange = (theme: 'Light' | 'Dark') => {
    onUpdateUser({ ...user, theme });
  };

  const handleLanguageChange = (lang: string) => {
    onUpdateUser({ ...user, language: lang });
  };

  return (
    <div className="space-y-6">
      {/* CONTEXTUAL HEADER */}
      <header className="flex justify-between items-center -mx-4 px-4 py-2 bg-white border-b border-gray-100 sticky top-0 z-20">
        <button 
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-gray-100 text-on-surface hover:scale-105 active:scale-95 transition-all focus:outline-none cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-on-surface">Settings</h1>
        <div className="w-9"></div> {/* balance spacer */}
      </header>

      {/* USER PROFILE CARD */}
      <section className="bg-white rounded-3xl p-5 border border-gray-100 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-surface-container-high shadow-sm">
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-on-surface leading-tight">{user.name}</h2>
            <p className="text-xs font-semibold text-outline leading-tight mt-1">{user.email}</p>
          </div>
        </div>

        <button 
          onClick={() => {
            setEditName(user.name);
            setEditEmail(user.email);
            setAvatarInput(user.avatarUrl || "");
            setIsEditingProfile(!isEditingProfile);
          }}
          className="text-primary font-bold text-sm hover:underline focus:outline-none cursor-pointer"
        >
          {isEditingProfile ? "Cancel" : "Edit Profile"}
        </button>
      </section>

      {/* INLINE PROFILE EDIT PANEL */}
      <AnimatePresence>
        {isEditingProfile && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleUpdateProfile} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] space-y-4">
              <h3 className="text-sm font-bold text-primary pl-0.5">Edit Profile Info</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-xs font-bold text-outline uppercase tracking-wider mb-1 block ml-0.5">Full Name</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full bg-[#F3F4F6] text-on-surface rounded-xl px-4 py-2.5 border-none focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-outline uppercase tracking-wider mb-1 block ml-0.5">Email Address</label>
                  <input 
                    type="email" 
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="w-full bg-[#F3F4F6] text-on-surface rounded-xl px-4 py-2.5 border-none focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-outline uppercase tracking-wider mb-1 block ml-0.5">Avatar Image URL</label>
                  <input 
                    type="url" 
                    value={avatarInput}
                    onChange={(e) => setAvatarInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#F3F4F6] text-on-surface rounded-xl px-4 py-2.5 border-none focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary hover:bg-primary-container text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-sm cursor-pointer"
              >
                <Save className="w-4.5 h-4.5" />
                <span>Save Changes</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACCOUNT GROUP */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-outline uppercase tracking-wider pl-2">Account</h3>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
          {/* Edit Profile row */}
          <div 
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="flex items-center justify-between p-4 hover:bg-gray-50/50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-primary flex items-center justify-center shadow-sm">
                <UserIcon className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-on-surface">Edit Profile Info</span>
            </div>
            <ChevronRight className="w-5 h-5 text-outline" />
          </div>

          {/* Security */}
          <div 
            onClick={() => alert("Security settings: Biometric Face ID login configured on this client.")}
            className="flex items-center justify-between p-4 hover:bg-gray-50/50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-primary flex items-center justify-center shadow-sm">
                <Lock className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-on-surface">Security (Face ID)</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-primary mr-1">
              <span>Active</span>
              <Check className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* PREFERENCES GROUP */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-outline uppercase tracking-wider pl-2">Preferences</h3>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] overflow-hidden divide-y divide-gray-100">
          
          {/* Currency */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-primary flex items-center justify-center shadow-sm">
                <Coins className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-on-surface">Currency</span>
            </div>
            <select 
              value={user.currency} 
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="bg-[#F3F4F6] text-on-surface font-semibold text-xs px-3 py-1.5 rounded-xl border-none focus:ring-1 focus:ring-primary focus:bg-white focus:outline-none transition-all"
            >
              <option value="USD">USD ($)</option>
              <option value="IDR">IDR (Rp)</option>
            </select>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-primary flex items-center justify-center shadow-sm">
                <Globe className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-on-surface">Language</span>
            </div>
            <select 
              value={user.language} 
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-[#F3F4F6] text-on-surface font-semibold text-xs px-3 py-1.5 rounded-xl border-none focus:ring-1 focus:ring-primary focus:bg-white focus:outline-none transition-all"
            >
              <option value="English">English</option>
              <option value="Indonesia">Bahasa Indonesia</option>
            </select>
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-primary flex items-center justify-center shadow-sm">
                <Palette className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-on-surface">Theme</span>
            </div>
            <select 
              value={user.theme} 
              onChange={(e) => handleThemeChange(e.target.value as 'Light' | 'Dark')}
              className="bg-[#F3F4F6] text-on-surface font-semibold text-xs px-3 py-1.5 rounded-xl border-none focus:ring-1 focus:ring-primary focus:bg-white focus:outline-none transition-all"
            >
              <option value="Light">Light Theme</option>
              <option value="Dark">Dark Theme</option>
            </select>
          </div>
        </div>
      </section>

      {/* NOTIFICATIONS GROUP */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-outline uppercase tracking-wider pl-2">Notifications</h3>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] overflow-hidden divide-y divide-gray-100">
          
          {/* Push */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-primary flex items-center justify-center shadow-sm">
                <Bell className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-on-surface">Push Notifications</span>
            </div>
            
            {/* Custom Toggle Switch (compliant styling) */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={user.pushNotifications}
                onChange={togglePush}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-outline-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Email Alerts */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-primary flex items-center justify-center shadow-sm">
                <Mail className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-on-surface">Email Alerts</span>
            </div>
            
            {/* Custom Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={user.emailAlerts}
                onChange={toggleEmailAlerts}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-outline-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </section>

      {/* SUPPORT GROUP */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-outline uppercase tracking-wider pl-2">Support</h3>
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] overflow-hidden divide-y divide-gray-100">
          
          {/* Help Center */}
          <div 
            onClick={() => alert("Redirecting to help center database.")}
            className="flex items-center justify-between p-4 hover:bg-gray-50/50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-primary flex items-center justify-center shadow-sm">
                <HelpCircle className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-on-surface">Help Center</span>
            </div>
            <ChevronRight className="w-5 h-5 text-outline" />
          </div>

          {/* Privacy Policy */}
          <div 
            onClick={() => alert("Privacy policy page.")}
            className="flex items-center justify-between p-4 hover:bg-gray-50/50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-primary flex items-center justify-center shadow-sm">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-on-surface">Privacy Policy</span>
            </div>
            <ExternalLink className="w-4 h-4 text-outline mr-1" />
          </div>

          {/* About */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-primary flex items-center justify-center shadow-sm">
                <Info className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-on-surface">About FinTrack Pro</span>
            </div>
            <span className="text-xs font-bold text-on-surface-variant bg-surface-container-highest px-2.5 py-1 rounded-lg">
              v2.4.1
            </span>
          </div>
        </div>
      </section>

      {/* LOG OUT BUTTON */}
      <section className="pt-2">
        <button 
          onClick={onLogout}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 bg-red-50 text-red-700 border border-red-100 hover:bg-red-100/70 transition-all duration-200 active:scale-98 font-bold text-sm cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span>Log Out</span>
        </button>
      </section>
    </div>
  );
}
