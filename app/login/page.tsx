'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  BadgeCheck, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Key,
  Badge,
  Headphones
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [crm, setCrm] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect to main page for demo
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans">
      {/* Header */}
      <header className="w-full px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#00478d] rounded-lg flex items-center justify-center text-white">
            <ShieldCheck size={20} />
          </div>
          <span className="text-xl font-extrabold text-[#00478d] tracking-tight font-headline">Clinical Conductor</span>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <span className="text-[10px] font-bold text-[#424752] uppercase tracking-widest">Secure Clinical Access</span>
          <div className="h-4 w-[1px] bg-[#c2c6d4]/30" />
          <Lock size={16} className="text-[#727783]" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-[#c2c6d4]/10">
            {/* Card Header */}
            <div className="bg-[#00478d] px-8 py-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_20%_150%,_#ffffff_0%,_transparent_50%)]" />
              <div className="relative z-10">
                <h1 className="text-white text-3xl font-extrabold font-headline tracking-tight mb-2">Welcome Back</h1>
                <p className="text-[#d6e3ff]/80 text-sm font-medium">Clinical Conductor Diagnostic Portal</p>
              </div>
            </div>

            {/* Form */}
            <div className="p-8 md:p-10">
              <form onSubmit={handleLogin} className="space-y-6">
                {/* CRM Field */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-[#424752] uppercase tracking-wider" htmlFor="crm">
                    Professional ID (CRM)
                  </label>
                  <div className="relative group bg-[#e1e3e4] rounded-t-lg border-b-2 border-transparent focus-within:border-[#00478d] transition-all">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Badge size={18} className="text-[#727783]" />
                    </div>
                    <input 
                      id="crm"
                      type="text"
                      value={crm}
                      onChange={(e) => setCrm(e.target.value)}
                      placeholder="Enter CRM number"
                      className="block w-full pl-10 pr-3 py-4 bg-transparent border-none focus:ring-0 text-[#191c1d] font-sans placeholder:text-[#727783]/60"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-[#424752] uppercase tracking-wider" htmlFor="password">
                      Password
                    </label>
                    <button type="button" className="text-[10px] font-bold text-[#00478d] hover:underline">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative group bg-[#e1e3e4] rounded-t-lg border-b-2 border-transparent focus-within:border-[#00478d] transition-all">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key size={18} className="text-[#727783]" />
                    </div>
                    <input 
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-3 py-4 bg-transparent border-none focus:ring-0 text-[#191c1d] font-sans placeholder:text-[#727783]/60"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#727783] hover:text-[#191c1d]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button 
                  type="submit"
                  className="w-full bg-[#00478d] text-white font-headline font-bold py-4 rounded-xl flex items-center justify-center gap-2 group hover:bg-[#005eb8] active:scale-[0.98] transition-all duration-150 shadow-lg shadow-[#00478d]/20"
                >
                  Secure Login
                  <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-[#c2c6d4]/10 text-center">
                <p className="text-[10px] text-[#424752] leading-relaxed font-medium">
                  Access restricted to authorized medical personnel. All sessions are monitored and encrypted.
                </p>
              </div>
            </div>
          </div>

          {/* Support Info */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-[#f3f4f5] p-4 rounded-xl flex flex-col items-center text-center">
              <BadgeCheck size={20} className="text-[#00478d] mb-2" />
              <span className="text-[9px] font-bold text-[#424752] uppercase tracking-tighter">HIPAA Compliant</span>
            </div>
            <div className="bg-[#f3f4f5] p-4 rounded-xl flex flex-col items-center text-center">
              <Headphones size={20} className="text-[#005412] mb-2" />
              <span className="text-[9px] font-bold text-[#424752] uppercase tracking-tighter">IT Support</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[#424752]">
        <div className="text-[10px] font-medium">
          © 2024 Clinical Conductor Systems. All rights reserved.
        </div>
        <div className="flex gap-6">
          <button className="text-[10px] font-bold hover:text-[#00478d]">Privacy Policy</button>
          <button className="text-[10px] font-bold hover:text-[#00478d]">System Status</button>
          <button className="text-[10px] font-bold hover:text-[#00478d]">Version 4.2.0</button>
        </div>
      </footer>
    </div>
  );
}
