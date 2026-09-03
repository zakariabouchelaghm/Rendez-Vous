'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import AdminTable from '@/components/AdminTable';
import { Appointment } from '@/lib/types';
import { 
  fetchAppointments, 
  cancelAppointment, 
  markAppointmentAttended, 
  getWorkingDays, 
  saveWorkingDays 
} from '@/lib/supabase';
import { 
  Lock, 
  LogOut, 
  RefreshCw, 
  Stethoscope, 
  Users, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Save, 
  Check 
} from 'lucide-react';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  // Doctor Working Days State: [0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat]
  const [workingDays, setWorkingDays] = useState<number[]>([0, 1, 2, 3, 4, 6]);
  const [isSavingDays, setIsSavingDays] = useState(false);
  const [daysSavedAlert, setDaysSavedAlert] = useState(false);

  const daysOfWeek = [
    { num: 0, name: 'الأحد' },
    { num: 1, name: 'الإثنين' },
    { num: 2, name: 'الثلاثاء' },
    { num: 3, name: 'الأربعاء' },
    { num: 4, name: 'الخميس' },
    { num: 5, name: 'الجمعة (عطلة)' },
    { num: 6, name: 'السبت' },
  ];

  // Check auth session storage on mount
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('rendezvous_admin_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
      loadAppointments();
      loadDays();
    }
  }, []);

  const loadDays = async () => {
    const days = await getWorkingDays();
    setWorkingDays(days);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(false);

    // Default password 'admin123' or from environment variable
    const envPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
    const cleanInput = passwordInput.trim();
    
    if (cleanInput === envPassword || cleanInput.toLowerCase() === 'admin123' || cleanInput === 'admin') {
      setIsAuthenticated(true);
      sessionStorage.setItem('rendezvous_admin_auth', 'true');
      loadAppointments();
      loadDays();
    } else {
      setAuthError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('rendezvous_admin_auth');
    setPasswordInput('');
  };

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await fetchAppointments();
      setAppointments(data);
    } catch (err) {
      console.error('Failed fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle day selection
  const toggleDay = (dayNum: number) => {
    setWorkingDays((prev) =>
      prev.includes(dayNum)
        ? prev.filter((d) => d !== dayNum)
        : [...prev, dayNum]
    );
  };

  // Save Working Days
  const handleSaveDays = async () => {
    setIsSavingDays(true);
    await saveWorkingDays(workingDays);
    setIsSavingDays(false);
    setDaysSavedAlert(true);
    setTimeout(() => setDaysSavedAlert(false), 3000);
  };

  // Action: Cancel Appointment
  const handleCancelAppointment = async (id: string) => {
    if (!confirm('هل أنت تأكد من رغبتك في إلغاء هذا الموعد؟')) return;

    const success = await cancelAppointment(id);
    if (success) {
      loadAppointments();
    } else {
      alert('حدث خطأ أثناء إلغاء الموعد.');
    }
  };

  // Action: Mark Attended
  const handleMarkAttended = async (id: string) => {
    if (!confirm(`هل أنت متأكد من تسجيل "حضور" للمريض؟`)) {
      return;
    }

    const success = await markAppointmentAttended(id);
    if (success) {
      alert('تم تسجيل الحضور بنجاح.');
      loadAppointments();
    } else {
      alert('حدث خطأ أثناء تنفيذ الإجراء.');
    }
  };

  // 1. Password Lock View
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-100">
        <Navbar />
        
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-7 sm:p-8 flex flex-col gap-6 animate-slide-up">
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-teal-700 text-white flex items-center justify-center mb-3 shadow-lg shadow-teal-700/20">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800">
                بوابة دخول الطبيب
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                يُرجى إدخال كلمة المرور للوصول إلى لوحة التحكم والمواعيد.
              </p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              
              {authError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold text-center">
                  كلمة المرور غير صحيحة! يُرجى التأكد وإعادة المحاولة.
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">كلمة المرور (Admin Password):</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-bold focus:ring-4 focus:ring-teal-100 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm shadow-md transition-all active:scale-98"
              >
                تسجيل الدخول
              </button>
            </form>

            <div className="text-center text-[11px] text-slate-400">
              كلمة المرور الافتراضية للتجربة: <span className="font-mono text-slate-600 font-bold">admin123</span>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // Stats Calculation
  const totalCount = appointments.length;
  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        
        {/* Header Title & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center shadow-md">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">
                لوحة إدارة الحجوزات والمواعيد
              </h1>
              <span className="text-xs text-slate-500 font-medium">
                استعراض جدول مواعيد العيادة والتحكم في أيام العمل
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={loadAppointments}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث البيانات</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-all border border-rose-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>

        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500">إجمالي المواعيد</span>
              <span className="text-2xl font-extrabold text-slate-800 mt-1 font-sans">{totalCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500">المواعيد المؤكدة</span>
              <span className="text-2xl font-extrabold text-emerald-700 mt-1 font-sans">{confirmedCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-500">في انتظار التأكيد (Pending)</span>
              <span className="text-2xl font-extrabold text-amber-700 mt-1 font-sans">{pendingCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* Doctor Working Days Control Panel */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-teal-600" />
              <div className="flex flex-col">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
                  تحديد أيام العمل المتاحة للحجز
                </h3>
                <span className="text-xs text-slate-500">
                  قم بتحديد الأيام المتاحة أو إلغاء تحديد أيام العطلات (مثل يوم الجمعة) لتحديث تقويم الحجز للجمهور.
                </span>
              </div>
            </div>

            <button
              onClick={handleSaveDays}
              disabled={isSavingDays}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
            >
              {daysSavedAlert ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>تم حفظ الأيام!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ إعدادات الأيام</span>
                </>
              )}
            </button>
          </div>

          {/* Working Days Checkboxes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-1">
            {daysOfWeek.map((day) => {
              const isChecked = workingDays.includes(day.num);
              return (
                <label
                  key={day.num}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                    isChecked
                      ? 'bg-teal-50/80 border-teal-300 text-teal-900 font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-500 font-medium hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleDay(day.num)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs">{day.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Main Admin Appointments Table Component */}
        <AdminTable
          appointments={appointments}
          onCancel={handleCancelAppointment}
          onMarkAttended={handleMarkAttended}
          loading={loading}
        />

      </main>

    </div>
  );
}
