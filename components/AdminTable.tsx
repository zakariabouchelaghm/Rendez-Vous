'use client';

import React, { useState } from 'react';
import { Appointment, AppointmentStatus } from '@/lib/types';
import { formatArabicDate, formatArabicTime } from '@/lib/utils';
import { 
  XCircle, 
  UserX, 
  Search, 
  Calendar, 
  Filter, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Zap
} from 'lucide-react';

interface AdminTableProps {
  appointments: Appointment[];
  onCancel: (id: string) => Promise<void>;
  onMarkNoShow: (id: string, phone: string) => Promise<void>;
  loading: boolean;
}

export default function AdminTable({
  appointments,
  onCancel,
  onMarkNoShow,
  loading,
}: AdminTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Filter Logic
  const filteredAppointments = appointments.filter((appt) => {
    // Search
    const matchesSearch =
      appt.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appt.phone_number.includes(searchTerm) ||
      appt.booking_code.toLowerCase().includes(searchTerm.toLowerCase());

    // Status
    const matchesStatus =
      selectedStatus === 'all' || appt.status === selectedStatus;

    // Date
    const apptDateStr = new Date(appt.appointment_time).toISOString().split('T')[0];
    const matchesDate = !selectedDate || apptDateStr === selectedDate;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: AppointmentStatus, isFlash: boolean) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>مؤكد</span>
            {isFlash && <span className="text-[10px] text-emerald-700 font-bold">(فوري)</span>}
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>معلق</span>
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>ملغى</span>
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-200 text-slate-700 border border-slate-300">
            <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>منتهي</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث بالمريض، الهاتف أو الرمز..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none appearance-none"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">معلق (Pending)</option>
            <option value="confirmed">مؤكد (Confirmed)</option>
            <option value="canceled">ملغى (Canceled)</option>
            <option value="expired">منتهي (Expired)</option>
          </select>
        </div>

        {/* Date Filter */}
        <div className="relative">
          <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="px-4 py-3.5">الوقت والتاريخ</th>
                <th className="px-4 py-3.5">اسم المريض</th>
                <th className="px-4 py-3.5">رقم الهاتف</th>
                <th className="px-4 py-3.5">رمز الحجز</th>
                <th className="px-4 py-3.5">الحالة</th>
                <th className="px-4 py-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    جاري تحميل المواعيد...
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    لا توجد مواعيد مطابقة للبحث أو الفلتر المختار.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Time */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-teal-800">
                          {formatArabicTime(appt.appointment_time)}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {formatArabicDate(appt.appointment_time)}
                        </span>
                      </div>
                    </td>

                    {/* Patient Name */}
                    <td className="px-4 py-3.5 font-bold text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{appt.full_name}</span>
                        {appt.is_flash_booking && (
                          <span className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.5 rounded font-extrabold flex items-center gap-0.5" title="حجز فوري عاجل">
                            <Zap className="w-3 h-3 fill-rose-600" />
                            فوري
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3.5 text-slate-700 font-mono dir-ltr text-right whitespace-nowrap">
                      {appt.phone_number}
                    </td>

                    {/* Booking Code */}
                    <td className="px-4 py-3.5 font-mono font-bold text-teal-700 whitespace-nowrap">
                      {appt.booking_code}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getStatusBadge(appt.status, appt.is_flash_booking)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        
                        {/* Cancel Appointment Button */}
                        {appt.status !== 'canceled' && appt.status !== 'expired' && (
                          <button
                            onClick={() => onCancel(appt.id)}
                            type="button"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all active:scale-95"
                            title="إلغاء الموعد بدون حظر"
                          >
                            <XCircle className="w-3.5 h-3.5 text-slate-600" />
                            <span>إلغاء الموعد</span>
                          </button>
                        )}

                        {/* Mark No-Show Button */}
                        {appt.status !== 'canceled' && (
                          <button
                            onClick={() => onMarkNoShow(appt.id, appt.phone_number)}
                            type="button"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-extrabold text-xs transition-all active:scale-95 border border-rose-200"
                            title="إلغاء الموعد وإضافة رقم المريض إلى القائمة السوداء"
                          >
                            <UserX className="w-3.5 h-3.5 text-rose-600" />
                            <span>تسجيل عدم حضور</span>
                          </button>
                        )}

                        {(appt.status === 'canceled' || appt.status === 'expired') && (
                          <span className="text-xs text-slate-400 italic">لا توجد إجراءات</span>
                        )}

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
