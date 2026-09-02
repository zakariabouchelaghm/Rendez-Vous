'use client';

import React from 'react';
import Link from 'next/link';
import { Stethoscope, ShieldCheck, Clock } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-teal-100/60 shadow-sm transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        
        {/* Clinic Brand & Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg text-slate-800 tracking-tight group-hover:text-teal-700 transition-colors">
              عيادة التخصصات الطبية
            </span>
            <span className="text-xs text-teal-600 font-medium">
              د. زكرياء بوشلاغم - استشاري الباطنة والقلب
            </span>
          </div>
        </Link>

        {/* Working Hours & Quick Badges (Doctor Admin button removed from header as requested) */}
        <div className="flex items-center gap-4 text-xs text-slate-600 bg-teal-50/70 border border-teal-100/80 px-4 py-2 rounded-full">
          <div className="flex items-center gap-1.5 text-teal-700 font-medium">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>مواعيد العمل: 09:00 صباحاً - 06:00 مساءً</span>
          </div>
          <span className="hidden sm:inline text-teal-300">|</span>
          <div className="hidden sm:flex items-center gap-1 text-emerald-700 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>حجز بدون تسجيل حساب</span>
          </div>
        </div>

      </div>
    </header>
  );
}
