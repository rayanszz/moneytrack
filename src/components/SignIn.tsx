/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { Mail, Lock, User as UserIcon, ArrowRight, ShieldCheck } from "lucide-react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

interface SignInProps {
  onSuccess: (email: string, uid: string) => void;
}

export default function SignIn({ onSuccess }: SignInProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (isSignUp && !name) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        onSuccess(email, userCredential.user.uid);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onSuccess(email, userCredential.user.uid);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        setError("Email belum terdaftar atau password salah.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("Email ini sudah terdaftar. Silakan Sign In.");
      } else if (err.code === "auth/weak-password") {
        setError("Password terlalu lemah, minimal 6 karakter.");
      } else {
        setError("Terjadi kesalahan saat autentikasi. Coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center items-center p-6" id="auth-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-white rounded-3xl p-8 shadow-[0px_8px_30px_rgba(0,0,0,0.04)] border border-gray-100"
      >
        {/* LOGO */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 relative flex items-center justify-center mb-3">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Moneytrack Hexagon/Growth Shape */}
              <path 
                d="M50,15 L80,32 L80,68 L50,85 L20,68 L20,32 Z" 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="7" 
                strokeLinejoin="round"
              />
              <path 
                d="M50,15 L80,32 L80,68 L50,85 L20,68 L20,32 Z" 
                fill="none" 
                stroke="#0284c7" 
                strokeWidth="3"
                className="opacity-70"
              />
              {/* Growth Arrow / Stacked coins representation */}
              <path 
                d="M35,60 L45,60 M35,60 L35,45 M35,45 L45,45 M45,45 L45,60 M55,60 L55,35 M55,35 L65,35 M65,35 L65,60" 
                fill="none" 
                stroke="#0f172a" 
                strokeWidth="5" 
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path 
                d="M30,50 L40,40 L50,45 L68,25 M60,25 L68,25 L68,33" 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Moneytrack</h1>
          <p className="text-sm text-on-surface-variant font-medium mt-1">
            {isSignUp ? "Create your investment account" : "Sign in to manage your wealth"}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2"
          >
            <ShieldCheck className="w-5 h-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <UserIcon className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  placeholder="Alex Carter"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#F3F4F6] text-on-surface rounded-2xl pl-11 pr-4 py-3.5 border-2 border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all font-sans text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 ml-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                placeholder="alex.carter@wealthflow.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F3F4F6] text-on-surface rounded-2xl pl-11 pr-4 py-3.5 border-2 border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all font-sans text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider ml-1">
                Password
              </label>
              {!isSignUp && (
                <button 
                  type="button"
                  onClick={() => alert("Demo Password is 'password'. Simply log in.")}
                  className="text-xs text-primary font-medium hover:underline focus:outline-none"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F3F4F6] text-on-surface rounded-2xl pl-11 pr-4 py-3.5 border-2 border-transparent focus:border-primary focus:bg-white focus:outline-none transition-all font-sans text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-container text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none mt-6 cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>{isSignUp ? "Create Account" : "Sign In"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col items-center gap-4">
          <p className="text-xs text-on-surface-variant font-medium">
            {isSignUp ? "Already have an account?" : "Don't have an account yet?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="text-primary font-semibold hover:underline focus:outline-none"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
