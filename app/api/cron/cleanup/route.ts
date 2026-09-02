import { NextResponse } from 'next/server';
import { cleanupExpiredAppointments } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await cleanupExpiredAppointments();
    return NextResponse.json({
      success: true,
      message: `تم تنظيف المواعيد المنتهية الصلاحية بنجاح (${result.expiredCount} موعد)`,
      expiredCount: result.expiredCount,
      updatedAppointmentIds: result.updatedIds,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'حدث خطأ أثناء تنفيذ عملية التنظيف التلقائي'
    }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
