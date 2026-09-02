'use client';

import React, { useState } from 'react';
import { Appointment } from '@/lib/types';
import { formatArabicDate, formatArabicTime } from '@/lib/utils';
import { CheckCircle2, Copy, Check, Zap, AlertTriangle, Calendar, Phone, User, X } from 'lucide-react';

interface SuccessModalProps {
  appointment: Appointment;
  onClose: () => void;
}

export default function SuccessModal({ appointment, onClose }: SuccessModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appointment.booking_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const isFlash = appointment.is_flash_booking;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-7 overflow-hidden animate-slide-up">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header Badge & Icon */}
        <div className="flex flex-col items-center text-center">
          <div
            className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 shadow-lg ${
              isFlash
                ? 'bg-rose-500 text-white shadow-rose-500/30'
                : 'bg-emerald-500 text-white shadow-emerald-500/30'
            }`}
          >
            {isFlash ? <Zap className="w-9 h-9 fill-white" /> : <CheckCircle2 className="w-9 h-9" />}
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-800">
            {isFlash ? 'تم الحجز الفوري بنجاح!' : 'تم تقديم طلب الحجز بنجاح!'}
          </h3>
          
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {isFlash
              ? 'موعدك فوري وعاجل، تم تأكيد الحضور مباشرة دون الحاجة لخطوة تأكيد رمز الحجز.'
              : 'تم تسجيل تفاصيل موعدك بنجاح، يُرجى الحفاظ على رمز الحجز للتأكيد.'}
          </p>
        </div>

        {/* Details Card */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2.5 text-xs sm:text-sm">
          <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <User className="w-4 h-4 text-teal-600" />
              <span>اسم المريض:</span>
            </span>
            <span className="font-bold text-slate-800">{appointment.full_name}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <Phone className="w-4 h-4 text-teal-600" />
              <span>رقم الهاتف:</span>
            </span>
            <span className="font-bold text-slate-800">{appointment.phone_number}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span>تاريخ وتوقيت الموعد:</span>
            </span>
            <span className="font-bold text-teal-800">
              {formatArabicDate(appointment.appointment_time)} | {formatArabicTime(appointment.appointment_time)}
            </span>
          </div>
        </div>

        {/* Regular Booking Code Box */}
        {!isFlash && (
          <div className="mt-5 flex flex-col gap-3">
            <div className="p-4 rounded-2xl bg-teal-50 border-2 border-dashed border-teal-300 flex flex-col items-center gap-2">
              <span className="text-xs text-teal-800 font-semibold">رمز الحجز الخاص بك (Booking Code):</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl font-black text-teal-900 tracking-wider">
                  {appointment.booking_code}
                </span>
                <button
                  onClick={handleCopyCode}
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all active:scale-95 shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ رمز الحجز</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Instruction Warning Box */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>تعليمات هامة:</strong> احفظ هذا الرمز. يجب عليك تأكيد حضورك من قسم (تأكيد الحجز) قبل الموعد بـ 3 ساعات على الأقل وإلا سيتم إلغاء الحجز تلقائياً.
              </p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md transition-all active:scale-98"
          >
            فهمت، حسناً
          </button>
        </div>

      </div>
    </div>
  );
}
