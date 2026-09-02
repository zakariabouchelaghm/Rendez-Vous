import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ddyafitpiyglnyhaudix.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_eiA0TUDqeoP5oyKapFL6KA_lumJo8qU';

  const supabase = createClient(url, key);

  const testCode = `DBG-${Date.now().toString().slice(-6)}`;

  // 1. Try SELECT
  const selectRes = await supabase.from('appointments').select('id').limit(1);

  // 2. Try INSERT
  const insertRes = await supabase.from('appointments').insert([{
    full_name: 'debug_test',
    phone_number: '00000000',
    appointment_time: new Date(Date.now() + 86400000).toISOString(),
    booking_code: testCode,
    status: 'pending',
    is_flash_booking: false,
  }]).select();

  // 3. Cleanup inserted row
  if (!insertRes.error) {
    await supabase.from('appointments').delete().eq('booking_code', testCode);
  }

  return NextResponse.json({
    supabase_url: url,
    key_prefix: key.slice(0, 20) + '...',
    select: {
      status: selectRes.status,
      error: selectRes.error ? { message: selectRes.error.message, code: selectRes.error.code, hint: selectRes.error.hint } : null,
      row_count: selectRes.data?.length ?? 0,
    },
    insert: {
      status: insertRes.status,
      error: insertRes.error ? { message: insertRes.error.message, code: insertRes.error.code, hint: insertRes.error.hint, details: insertRes.error.details } : null,
      inserted_row: insertRes.data?.[0] ?? null,
    }
  }, { status: 200 });
}
