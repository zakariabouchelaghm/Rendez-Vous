'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import SlotPicker from '@/components/SlotPicker';
import SuccessModal from '@/components/SuccessModal';
import { TimeSlot, Appointment } from '@/lib/types';
import { 
  generateDayTimeSlots, 
  generateBookingCode, 
  getHoursUntilAppointment,
  formatArabicTime,
  formatArabicDate
} from '@/lib/utils';
import { 
  createAppointment, 
  confirmAppointment, 
  fetchAppointments, 
  isPhoneBlacklisted,
  getWorkingDays
} from '@/lib/supabase';
import { 
  CalendarCheck, 
  CheckCircle, 
  User, 
  Phone, 
  KeyRound, 
  AlertCircle, 
  Sparkles, 
  ShieldAlert, 
  CheckCircle2, 
  Zap, 
  Clock,
  ArrowRight
} from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'book' | 'confirm'>('book');

  // Tab 1: Booking Form State
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null);
  const [workingDays, setWorkingDays] = useState<number[]>([0, 1, 2, 3, 4, 6]);

  // Tab 2: Confirm Visit Form State
  const [confirmCode, setConfirmCode] = useState('');
  const [confirmPhone, setConfirmPhone] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<{ success: boolean; message: string } | null>(null);

  // Existing booked times to disable slots
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);

  // Set selectedDate on client only (avoids SSR timezone mismatch)
  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  // Load existing booked appointments and doctor working days configuration
  const loadSlotsAndBookings = async (dateOverride?: Date) => {
    const date = dateOverride ?? selectedDate;
    if (!date) return;

    const days = await getWorkingDays();
    setWorkingDays(days);

    const allAppts = await fetchAppointments();
    // Active bookings that occupy slots
    const activeTimes = allAppts
      .filter(a => a.status === 'pending' || a.status === 'confirmed')
      .map(a => a.appointment_time);

    setBookedTimes(activeTimes);

    const generated = generateDayTimeSlots(date, activeTimes, days);
    setSlots(generated);
  };

  useEffect(() => {
    if (selectedDate) loadSlotsAndBookings(selectedDate);
  }, [selectedDate]);

  // Handle Booking Submit
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    if (!selectedSlot) {
      setBookingError('يُرجى اختيار توقيت الكشف المناسب من الأوقات المتاحة.');
      return;
    }

    if (!fullName.trim() || fullName.trim().length < 3) {
      setBookingError('يُرجى إدخال الاسم الكامل بوضوح (3 حروف على الأقل).');
      return;
    }

    if (!phoneNumber.trim() || phoneNumber.trim().length < 8) {
      setBookingError('يُرجى إدخال رقم هاتف صحيح للتواصل.');
      return;
    }

    setIsSubmitting(true);
    setDebugError(null);

    try {
      // 1. Blacklist Check
      const blacklisted = await isPhoneBlacklisted(phoneNumber.trim());
      if (blacklisted) {
        setBookingError('عذراً، هذا الرقم محظور من إجراء الحجوزات بسبب سجل سابق من عدم الحضور.');
        setIsSubmitting(false);
        return;
      }

      // 2. Calculate hours until appointment
      const hoursUntil = getHoursUntilAppointment(selectedSlot.time);
      const isFlash = hoursUntil > 0 && hoursUntil < 3;

      const code = generateBookingCode();
      const status = isFlash ? 'confirmed' : 'pending';

      const res = await createAppointment({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        appointment_time: selectedSlot.time.toISOString(),
        booking_code: code,
        status: status,
        is_flash_booking: isFlash,
      });

      if (!res.success || !res.appointment) {
        const errMsg = res.error || 'خطأ غير محدد';
        setBookingError(errMsg);
        setDebugError(`[DEBUG] code=${code} | error=${errMsg}`);
        setIsSubmitting(false);
        return;
      }

      // Success: Show modal & reset inputs
      setCreatedAppointment(res.appointment);
      setFullName('');
      setPhoneNumber('');
      setSelectedSlot(null);
      await loadSlotsAndBookings();
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      setBookingError('حدث خطأ غير متوقع في النظام، يُرجى إعادة المحاولة.');
      setDebugError(`[DEBUG EXCEPTION] ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Confirmation Submit
  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmResult(null);

    if (!confirmCode.trim() || !confirmPhone.trim()) {
      setConfirmResult({
        success: false,
        message: 'يُرجى كتابة رمز الحجز ورقم الهاتف بالكامل.'
      });
      return;
    }

    setIsConfirming(true);

    try {
      const res = await confirmAppointment(confirmCode, confirmPhone);
      setConfirmResult(res);
      if (res.success) {
        setConfirmCode('');
        setConfirmPhone('');
        loadSlotsAndBookings();
      }
    } catch (err) {
      setConfirmResult({
        success: false,
        message: 'رمز الحجز غير صحيح أو انتهت صلاحيته بسبب التأخر في التأكيد.'
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-teal-50/50 via-slate-50 to-teal-50/30">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-6">
        
        {/* Banner Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 text-white p-6 sm:p-8 shadow-xl shadow-teal-900/10 border border-teal-600/30">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5 max-w-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-600/60 border border-teal-400/40 w-fit text-teal-100 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-teal-200" />
                حجز موعد طبي بدون حساب وبشكل فوري
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                احجز استشارتك الطبية بسهولة وأمان
              </h1>
              <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed mt-1">
                اختر التوقيت المناسب، أدخل معلوماتك، وقم بتأكيد حضورك بضغطة زر دون الحاجة للانتظار.
              </p>
            </div>

            <div className="hidden sm:flex flex-col items-center justify-center p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-center shrink-0">
              <Clock className="w-7 h-7 text-teal-200 mb-1" />
              <span className="text-[11px] font-bold text-teal-100">تأكيد الموعد</span>
              <span className="text-xs font-extrabold text-white font-sans">قبل 3 ساعات</span>
            </div>
          </div>
        </div>

        {/* Main Tab Navigation Container */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-card p-4 sm:p-7 flex flex-col gap-6">
          
          {/* Tabs Control */}
          <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-100/80 border border-slate-200/60 font-bold text-sm">
            <button
              onClick={() => setActiveTab('book')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
                activeTab === 'book'
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>1. حجز موعد جديد</span>
            </button>

            <button
              onClick={() => setActiveTab('confirm')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
                activeTab === 'confirm'
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>2. تأكيد الحجز</span>
            </button>
          </div>

          {/* TAB 1: BOOK NEW APPOINTMENT */}
          {activeTab === 'book' && (
            <form onSubmit={handleBookingSubmit} className="flex flex-col gap-6 animate-fade-in">
              
              {/* Error Alert */}
              {bookingError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-start gap-2.5 shadow-sm">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Debug Panel - shows raw error for troubleshooting */}
              {debugError && (
                <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-300 text-yellow-900 text-[10px] font-mono break-all">
                  {debugError}
                </div>
              )}

              {/* 5-Day Slot Picker Component */}
              <SlotPicker
                slots={slots}
                selectedSlot={selectedSlot}
                onSelectSlot={(slot) => {
                  setSelectedSlot(slot);
                  setBookingError(null);
                }}
                selectedDate={selectedDate ?? new Date()}
                onDateChange={(date) => {
                  setSelectedDate(date);
                  setSelectedSlot(null);
                }}
                workingDays={workingDays}
              />

              {/* Selected Slot Summary Banner */}
              {selectedSlot && (
                <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs sm:text-sm transition-all ${
                  selectedSlot.isFlashSlot
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-teal-50 border-teal-200 text-teal-900'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {selectedSlot.isFlashSlot ? (
                      <Zap className="w-5 h-5 text-rose-600 fill-rose-500 animate-bounce" />
                    ) : (
                      <Clock className="w-5 h-5 text-teal-600" />
                    )}
                    <span>
                      التوقيت المختار: {formatArabicDate(selectedSlot.time)} الساعة {selectedSlot.formattedTime}
                    </span>
                  </div>
                  {selectedSlot.isFlashSlot && (
                    <span className="bg-rose-600 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-full shadow-sm">
                      حجز فوري عاجل
                    </span>
                  )}
                </div>
              )}

              {/* Patient Form Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                {/* Full Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="full_name" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-600" />
                    <span>الاسم الكامل للمريض:</span>
                  </label>
                  <input
                    id="full_name"
                    type="text"
                    required
                    placeholder="مثال: محمد عبد الله علي"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-100 focus:outline-none transition-all"
                  />
                </div>

                {/* Phone Input */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="phone_number" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                    <span>رقم الهاتف:</span>
                  </label>
                  <input
                    id="phone_number"
                    type="tel"
                    required
                    dir="ltr"
                    placeholder="01012345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-100 focus:outline-none transition-all font-sans text-left"
                  />
                </div>

              </div>

              {/* Form Submission Button */}
              <button
                type="submit"
                disabled={isSubmitting || !selectedSlot}
                className={`w-full py-4 px-6 rounded-2xl text-base font-extrabold text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 ${
                  !selectedSlot
                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                    : selectedSlot.isFlashSlot
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                    : 'bg-teal-700 hover:bg-teal-800 shadow-teal-700/25'
                }`}
              >
                {isSubmitting ? (
                  <span>جاري تسجيل الحجز...</span>
                ) : (
                  <>
                    <span>{selectedSlot?.isFlashSlot ? 'تأكيد الحجز الفوري العاجل' : 'تأكيد طلب الحجز'}</span>
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </>
                )}
              </button>

            </form>
          )}

          {/* TAB 2: CONFIRM VISIT */}
          {activeTab === 'confirm' && (
            <form onSubmit={handleConfirmSubmit} className="flex flex-col gap-6 animate-fade-in">
              
              <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-100 text-xs sm:text-sm text-teal-900 leading-relaxed flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <strong>تأكيد الحضور للموعد:</strong> يُرجى إدخال رمز الحجز (المكون من 6 خانات مثل MED-4921) ورقم الهاتف المُسجل لتأكيد حضورك قبل الموعد بـ 3 ساعات على الأقل.
                </div>
              </div>

              {/* Confirmation Alert Result */}
              {confirmResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs sm:text-sm font-bold flex items-start gap-2.5 ${
                    confirmResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  {confirmResult.success ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{confirmResult.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Booking Code Input */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm_code" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                    <span>رمز الحجز (Booking Code):</span>
                  </label>
                  <input
                    id="confirm_code"
                    type="text"
                    required
                    dir="ltr"
                    placeholder="MED-8K2P"
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 font-mono font-bold text-sm text-slate-800 uppercase focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-100 focus:outline-none transition-all text-left"
                  />
                </div>

                {/* Phone Number Input */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm_phone" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                    <span>رقم الهاتف المسجل:</span>
                  </label>
                  <input
                    id="confirm_phone"
                    type="tel"
                    required
                    dir="ltr"
                    placeholder="01012345678"
                    value={confirmPhone}
                    onChange={(e) => setConfirmPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-medium focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-100 focus:outline-none transition-all font-sans text-left"
                  />
                </div>

              </div>

              {/* Confirm Button */}
              <button
                type="submit"
                disabled={isConfirming}
                className="w-full py-4 px-6 rounded-2xl text-base font-extrabold text-white bg-teal-700 hover:bg-teal-800 shadow-lg shadow-teal-700/25 transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                {isConfirming ? (
                  <span>جاري التحقق من الحجز...</span>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>تأكيد حضور الموعد الآن</span>
                  </>
                )}
              </button>

            </form>
          )}

        </div>

      </main>

      {/* Success Modal Popup */}
      {createdAppointment && (
        <SuccessModal
          appointment={createdAppointment}
          onClose={() => setCreatedAppointment(null)}
        />
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 mt-10 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© 2026 عيادة التخصصات الطبية - جميع الحقوق محفوظة</span>
          <span className="text-slate-500">نظام الحجز الطبي الذكي الخالي من الحسابات</span>
        </div>
      </footer>
    </div>
  );
}
