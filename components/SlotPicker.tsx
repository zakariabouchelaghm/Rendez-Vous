'use client';

import React from 'react';
import { TimeSlot } from '@/lib/types';
import { Zap, Clock, CalendarX, CheckCircle2 } from 'lucide-react';

interface SlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  workingDays?: number[];
}

export default function SlotPicker({
  slots,
  selectedSlot,
  onSelectSlot,
  selectedDate,
  onDateChange,
  workingDays = [0, 1, 2, 3, 4, 6], // Default Friday (5) closed
}: SlotPickerProps) {

  // Generate next 5 available days
  const dateTabs = Array.from({ length: 5 }).map((_, index) => {
    const d = new Date();
    d.setDate(d.getDate() + index);
    return d;
  });

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const getDayLabel = (d: Date, index: number) => {
    if (index === 0) return 'اليوم';
    if (index === 1) return 'غداً';
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'short' }).format(d);
  };

  const selectedDayOfWeek = selectedDate.getDay();
  const isOffDay = !workingDays.includes(selectedDayOfWeek);

  return (
    <div className="flex flex-col gap-5">
      {/* Date Tabs - 5 Days View */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {dateTabs.map((date, idx) => {
          const active = isSameDay(selectedDate, date);
          const dayNum = date.getDay();
          const isClosedDay = !workingDays.includes(dayNum);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onDateChange(date)}
              className={`flex flex-col items-center justify-center min-w-[95px] px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                active
                  ? 'bg-teal-700 text-white border-teal-700 shadow-md shadow-teal-700/20 scale-[1.02]'
                  : isClosedDay
                  ? 'bg-rose-50/70 text-rose-700 border-rose-200 hover:bg-rose-100/70'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-medium opacity-90">
                  {getDayLabel(date, idx)}
                </span>
                {isClosedDay && (
                  <span className="text-[9px] bg-rose-200 text-rose-900 px-1 rounded font-extrabold">مغلق</span>
                )}
              </div>
              <span className="text-sm font-extrabold mt-0.5 font-sans">
                {date.getDate()} {new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'short' }).format(date)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Header Info */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Clock className="w-4 h-4 text-teal-600" />
          <span>اختر توقيت الكشف المناسب:</span>
        </div>
        {!isOffDay && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
              <span>حجز عادي</span>
            </div>
            <div className="flex items-center gap-1 text-rose-600 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
              <span>حجز فوري عاجل</span>
            </div>
          </div>
        )}
      </div>

      {/* Off Day / Holiday Alert Card */}
      {isOffDay ? (
        <div className="p-8 rounded-3xl bg-rose-50/90 border border-rose-200 text-center flex flex-col items-center justify-center gap-3 animate-fade-in my-2">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <CalendarX className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="text-base font-extrabold text-rose-900">
              العيادة مغلقة في هذا اليوم ({new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long' }).format(selectedDate)})
            </h4>
            <p className="text-xs text-rose-700 max-w-sm mx-auto">
              هذا اليوم عطلة أسبوعية أو غير متاح لاستقبال الحجوزات. يُرجى اختيار يوم آخر من الأيام المتاحة أعلاه.
            </p>
          </div>
        </div>
      ) : (
        /* Slots Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[340px] overflow-y-auto p-1">
          {slots.map((slot, index) => {
            const isSelected = selectedSlot?.time.getTime() === slot.time.getTime();

            if (!slot.isAvailable) {
              return (
                <div
                  key={index}
                  className="relative flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 bg-slate-100/60 text-slate-400 text-xs cursor-not-allowed select-none opacity-60 font-sans"
                >
                  <span className="line-through">{slot.formattedTime}</span>
                  <span className="text-[10px] mt-0.5 font-cairo">غير متاح</span>
                </div>
              );
            }

            // Urgent Flash Slot (< 3 Hours away)
            if (slot.isFlashSlot) {
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onSelectSlot(slot)}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all group ${
                    isSelected
                      ? 'bg-rose-600 text-white border-rose-700 ring-4 ring-rose-200 shadow-lg scale-[1.03]'
                      : 'bg-rose-50/90 text-rose-900 border-rose-300 hover:border-rose-500 hover:bg-rose-100/80 animate-flash-urgent'
                  }`}
                >
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5 whitespace-nowrap">
                    <Zap className="w-2.5 h-2.5 fill-white text-white" />
                    <span>حجز فوري عاجل</span>
                  </div>
                  <span className="font-extrabold text-sm mt-1 font-sans">{slot.formattedTime}</span>
                  <span className="text-[10px] font-semibold opacity-90">تأكيد تلقائي فوري</span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-white absolute top-1.5 right-1.5" />
                  )}
                </button>
              );
            }

            // Regular Available Slot (>= 3 Hours away)
            return (
              <button
                key={index}
                type="button"
                onClick={() => onSelectSlot(slot)}
                className={`relative flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? 'bg-teal-700 text-white border-teal-800 ring-4 ring-teal-100 shadow-md scale-[1.02]'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-teal-400 hover:bg-teal-50/50'
                }`}
              >
                <span className="font-bold text-sm font-sans">{slot.formattedTime}</span>
                <span className={`text-[10px] mt-0.5 font-medium ${isSelected ? 'text-teal-100' : 'text-slate-500'}`}>
                  30 دقيقة
                </span>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-teal-200 absolute top-2 right-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
